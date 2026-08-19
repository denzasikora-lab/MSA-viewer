// Functional tests: each check exercises a real feature through its real
// UI/function call path and asserts specific, correct output - not just
// "didn't crash." See FUNCTIONAL_TESTS_PROGRESS.md for coverage status.
const { start } = require('../lib/static-server');
const { launch, makeFasta, loadFasta, loadSyntheticFasta, setMode } = require('../lib/browser');

const CHECKS = [];
function check(name, fn) { CHECKS.push({ name, fn }); }

check('Reads mode: SAM loads 3 mapped reads with correct track packing', async (page) => {
    // 1. Load a 32bp reference sequence
    const refFasta = '>ref\nACGTACGTACGTACGTACGTACGTACGTACGT\n';
    await loadFasta(page, refFasta);

    // 2. Construct a SAM file with 3 reads at known positions.
    //    SAM POS is 1-based; the parser converts to 0-based.
    //    read1: POS=1  -> 0-based 0,  10M -> spans 0-9
    //    read2: POS=5  -> 0-based 4,  10M -> spans 4-13  (overlaps read1 -> track 1)
    //    read3: POS=15 -> 0-based 14, 10M -> spans 14-23 (no overlap  -> track 0)
    const samText = [
        '@HD\tVN:1.6\tSO:coordinate',
        '@SQ\tSN:ref\tLN:32',
        'read1\t0\tref\t1\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
        'read2\t0\tref\t5\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
        'read3\t0\tref\t15\t60\t10M\t*\t0\t0\tACGTACGTAC\t*',
    ].join('\n');

    // 3. Load SAM through the real handleBamFile entry point
    await page.evaluate(async (samText) => {
        const file = new File([samText], 'test.sam', { type: 'text/plain' });
        const event = { target: { files: [file], value: '' } };
        await handleBamFile(event);
    }, samText);
    await page.waitForTimeout(300);

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const reads = bamState.reads;
        const svg = document.querySelector('#readsPileSvg');
        // Main read bars use fill #c8d8e8 (set in renderReadsAlignment)
        const readBars = svg ? svg.querySelectorAll('rect[fill="#c8d8e8"]').length : 0;
        return {
            readCount: reads ? reads.length : 0,
            refName: bamState.refName,
            nTracks: bamState.nTracks,
            svgExists: !!svg,
            readBars,
            readDetails: reads ? reads.map(r => ({
                name: r.name,
                start: r.start,
                end: r.end,
                track: r.track,
            })) : [],
        };
    });

    if (result.readCount !== 3) {
        return { pass: false, detail: `expected 3 reads in bamState, got ${result.readCount}` };
    }
    if (result.refName !== 'ref') {
        return { pass: false, detail: `expected refName 'ref', got '${result.refName}'` };
    }
    if (!result.svgExists) {
        return { pass: false, detail: 'SVG element #readsPileSvg not found' };
    }
    if (result.readBars !== 3) {
        return { pass: false, detail: `expected 3 read bars in SVG, got ${result.readBars}` };
    }
    const r1 = result.readDetails.find(r => r.name === 'read1');
    const r2 = result.readDetails.find(r => r.name === 'read2');
    const r3 = result.readDetails.find(r => r.name === 'read3');
    if (!r1 || !r2 || !r3) {
        return { pass: false, detail: `missing reads: ${JSON.stringify(result.readDetails)}` };
    }
    if (r1.start !== 0 || r1.end !== 9) {
        return { pass: false, detail: `read1 span: start=${r1.start} end=${r1.end}, expected 0-9` };
    }
    if (r2.start !== 4 || r2.end !== 13) {
        return { pass: false, detail: `read2 span: start=${r2.start} end=${r2.end}, expected 4-13` };
    }
    if (r3.start !== 14 || r3.end !== 23) {
        return { pass: false, detail: `read3 span: start=${r3.start} end=${r3.end}, expected 14-23` };
    }
    if (r1.track !== 0 || r2.track !== 1 || r3.track !== 0) {
        return { pass: false, detail: `tracks: r1=${r1.track} r2=${r2.track} r3=${r3.track}, expected 0,1,0` };
    }
    if (result.nTracks !== 2) {
        return { pass: false, detail: `expected 2 tracks, got ${result.nTracks}` };
    }
    return { pass: true, detail: `3 reads, 2 tracks, 3 bars rendered` };
});

async function main() {
    const { server, baseUrl } = await start();
    const results = [];
    const filter = process.env.CHECK_FILTER ? process.env.CHECK_FILTER.toLowerCase() : null;
    const activeChecks = filter ? CHECKS.filter(c => c.name.toLowerCase().includes(filter)) : CHECKS;
    try {
        for (const { name, fn } of activeChecks) {
            const browser = await launch();
            const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
            page.setDefaultTimeout(30000);
            let outcome;
            const t0 = Date.now();
            try {
                await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
                outcome = await fn(page);
            } catch (e) {
                outcome = { pass: false, detail: `threw: ${e.message}` };
            }
            const ms = Date.now() - t0;
            console.log(`[${outcome.pass ? 'PASS' : 'FAIL'}] (${ms}ms) ${name}${outcome.detail ? ' - ' + outcome.detail : ''}`);
            results.push({ name, ...outcome });
            await browser.close();
        }
    } finally {
        server.close();
    }

    const failCount = results.filter(r => !r.pass).length;
    console.log(`\n${results.length - failCount}/${results.length} passed`);
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
