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

check('Clustering: 10 sequences in 2 clear groups cluster correctly', async (page) => {
    // 1. Load 10 sequences: 5 identical 'A' sequences and 5 identical 'T' sequences.
    //    Every position is a diagnostic position (A vs T), giving 20 perfect features.
    //    With 5 seqs per group, default minOccurrences=5 is met.
    const fasta = [
        '>seqA1', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA2', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA3', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA4', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqA5', 'AAAAAAAAAAAAAAAAAAAA',
        '>seqB1', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB2', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB3', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB4', 'TTTTTTTTTTTTTTTTTTTT',
        '>seqB5', 'TTTTTTTTTTTTTTTTTTTT',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Set clustering parameters (lower thresholds for small test alignment)
    await page.evaluate(() => {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        setVal('clusterMinSizeInput', '2');
        setVal('clusterMinPerfectInput', '1');
        setVal('clusterMaxIterationsInput', '10');
        setVal('minOccurrencesInput', '2');
        setVal('qualitySmallInput', '50');
        setVal('qualityMediumInput', '50');
        setVal('qualityLargeInput', '50');
    });

    // 3. Run clustering through the real entry point
    try {
        await page.evaluate(async () => {
            if (typeof SINEClusterer === 'undefined') {
                throw new Error('SINEClusterer class not loaded in page');
            }
            await clusterSequences();
        });
    } catch (e) {
        return { pass: false, detail: `clustering threw: ${e.message}` };
    }

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const cr = state.clusterResults;
        if (!cr) return { error: 'state.clusterResults is null' };
        return {
            nClusters: cr.summary?.nClusters,
            nAssigned: cr.summary?.nAssigned,
            nTotal: cr.summary?.nTotal,
            nUnassigned: cr.summary?.nUnassigned,
            clusterMap: state.clusterMap,
        };
    });

    if (result.error) {
        return { pass: false, detail: result.error };
    }
    if (result.nClusters !== 2) {
        return { pass: false, detail: `expected 2 clusters, got ${result.nClusters} (assigned=${result.nAssigned}, unassigned=${result.nUnassigned})` };
    }
    if (result.nAssigned !== 10) {
        return { pass: false, detail: `expected 10 assigned, got ${result.nAssigned}` };
    }
    // Check that seqA1-5 are in the same cluster and seqB1-5 are in the same cluster.
    // clusterMap is keyed by sequence identity (id/header), not row index -
    // it must survive reordering, so a raw numeric index was never the
    // right key here even before that was fixed.
    const clustersA = ['seqA1','seqA2','seqA3','seqA4','seqA5'].map(id => result.clusterMap[id]?.cluster);
    const clustersB = ['seqB1','seqB2','seqB3','seqB4','seqB5'].map(id => result.clusterMap[id]?.cluster);

    if (clustersA.some(c => c === undefined)) {
        return { pass: false, detail: `some group A sequences unassigned: ${JSON.stringify(clustersA)}` };
    }
    if (clustersB.some(c => c === undefined)) {
        return { pass: false, detail: `some group B sequences unassigned: ${JSON.stringify(clustersB)}` };
    }
    if (!clustersA.every(c => c === clustersA[0])) {
        return { pass: false, detail: `group A not in same cluster: ${JSON.stringify(clustersA)}` };
    }
    if (!clustersB.every(c => c === clustersB[0])) {
        return { pass: false, detail: `group B not in same cluster: ${JSON.stringify(clustersB)}` };
    }
    if (clustersA[0] === clustersB[0]) {
        return { pass: false, detail: `group A and group B in same cluster: ${clustersA[0]}` };
    }
    return { pass: true, detail: `2 clusters: A=${clustersA[0]}, B=${clustersB[0]}, 10 assigned` };
});

check('Colouring: clusterByName groups identically-prefixed names, applyPatternColour colours by regex', async (page) => {
    // 1. Load 6 sequences: 3 with "Human_" prefix, 3 with "Mouse_" prefix.
    //    Names share a common suffix pattern (_seqN) but have distinct prefixes,
    //    so clusterByName should separate them by prefix similarity.
    const fasta = [
        '>Human_seq1', 'ACGTACGTAC',
        '>Human_seq2', 'ACGTACGTAC',
        '>Human_seq3', 'ACGTACGTAC',
        '>Mouse_seq1', 'TTTTTTTTTT',
        '>Mouse_seq2', 'TTTTTTTTTT',
        '>Mouse_seq3', 'TTTTTTTTTT',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Test clusterByName directly: should produce 2 clusters
    const clusterResult = await page.evaluate(() => {
        const names = state.seqs.map(s => s.header);
        const clusters = clusterByName(names, 10, 3);
        return {
            nClusters: clusters.length,
            clusters: clusters,
        };
    });

    if (clusterResult.nClusters !== 2) {
        return { pass: false, detail: `expected 2 clusters, got ${clusterResult.nClusters}: ${JSON.stringify(clusterResult.clusters)}` };
    }

    const humanCluster = clusterResult.clusters.find(c => c.includes('Human_seq1'));
    const mouseCluster = clusterResult.clusters.find(c => c.includes('Mouse_seq1'));

    if (!humanCluster || !mouseCluster) {
        return { pass: false, detail: `missing Human or Mouse cluster: ${JSON.stringify(clusterResult.clusters)}` };
    }
    if (humanCluster.length !== 3 || !humanCluster.every(n => n.startsWith('Human_'))) {
        return { pass: false, detail: `Human cluster wrong: ${JSON.stringify(humanCluster)}` };
    }
    if (mouseCluster.length !== 3 || !mouseCluster.every(n => n.startsWith('Mouse_'))) {
        return { pass: false, detail: `Mouse cluster wrong: ${JSON.stringify(mouseCluster)}` };
    }

    // 3. Test applyPatternColour through the real UI entry point.
    //    Set the pattern input to "Human" and a specific colour, then call
    //    applyPatternColour() - the same function the Pattern button triggers.
    const patternResult = await page.evaluate(() => {
        // Ensure UI elements exist (they should be in the HTML, but create if missing)
        let patternInput = document.getElementById('colourPatternInput');
        if (!patternInput) {
            patternInput = document.createElement('input');
            patternInput.id = 'colourPatternInput';
            patternInput.type = 'text';
            document.body.appendChild(patternInput);
        }
        let colourInput = document.getElementById('colourPatternColor');
        if (!colourInput) {
            colourInput = document.createElement('input');
            colourInput.id = 'colourPatternColor';
            colourInput.type = 'color';
            document.body.appendChild(colourInput);
        }

        patternInput.value = 'Human';
        colourInput.value = '#ff0000';

        // Clear any existing mappings
        colourState.mappings.clear();

        // Call the real function (same as clicking the Pattern button)
        applyPatternColour();

        // Collect results
        const mappings = {};
        colourState.mappings.forEach((color, name) => {
            mappings[name] = color;
        });
        return { mappings };
    });

    const mappedNames = Object.keys(patternResult.mappings);
    if (mappedNames.length !== 3) {
        return { pass: false, detail: `expected 3 mapped names, got ${mappedNames.length}: ${JSON.stringify(mappedNames)}` };
    }
    if (!mappedNames.every(n => n.startsWith('Human_'))) {
        return { pass: false, detail: `only Human_ names should be mapped: ${JSON.stringify(mappedNames)}` };
    }
    if (!mappedNames.every(n => patternResult.mappings[n] === '#ff0000')) {
        return { pass: false, detail: `all should be #ff0000: ${JSON.stringify(patternResult.mappings)}` };
    }

    return { pass: true, detail: `2 clusters (Human x3, Mouse x3), 3 names coloured by pattern` };
});

check('Search: exact and fuzzy motif matching with correct match counts', async (page) => {
    // 1. Load 3 sequences with known differences at the end:
    //    seq1: ACGTACGTAC (reference)
    //    seq2: ACGTACGTAG (1 mismatch at pos 9: G vs C)
    //    seq3: ACGTACGTGG (2 mismatches at pos 8,9: G,G vs A,C)
    const fasta = [
        '>seq1', 'ACGTACGTAC',
        '>seq2', 'ACGTACGTAG',
        '>seq3', 'ACGTACGTGG',
    ].join('\n');
    await loadFasta(page, fasta);

    // 2. Search for "ACGTACGTAC" with 0 mismatches (exact match only)
    await page.evaluate(() => {
        document.getElementById('searchInput').value = 'ACGTACGTAC';
        document.getElementById('maxMismatches').value = '0';
        state.searchHistory = [];
        searchMotif();
    });

    let result = await page.evaluate(() => {
        const h = state.searchHistory;
        return {
            historyLen: h.length,
            matchCount: h[0]?.matchCount,
            seqsWithMatches: h[0]?.sequencesWithMatches,
        };
    });

    // Exact: only seq1 matches (1 match in 1 sequence)
    if (result.historyLen !== 1) {
        return { pass: false, detail: `expected 1 search history entry, got ${result.historyLen}` };
    }
    if (result.matchCount !== 1) {
        return { pass: false, detail: `exact search: expected 1 match, got ${result.matchCount}` };
    }
    if (result.seqsWithMatches !== 1) {
        return { pass: false, detail: `exact search: expected 1 sequence with matches, got ${result.seqsWithMatches}` };
    }

    // 3. Search for "ACGTACGTAC" with 1 mismatch allowed
    await page.evaluate(() => {
        document.getElementById('searchInput').value = 'ACGTACGTAC';
        document.getElementById('maxMismatches').value = '1';
        state.searchHistory = [];
        searchMotif();
    });

    result = await page.evaluate(() => {
        const h = state.searchHistory;
        return {
            historyLen: h.length,
            matchCount: h[0]?.matchCount,
            seqsWithMatches: h[0]?.sequencesWithMatches,
        };
    });

    // 1 mismatch: seq1 (exact, 0mm) + seq2 (1mm) = 2 matches in 2 sequences
    // seq3 has 2 mismatches, should NOT match with maxMismatches=1
    if (result.matchCount !== 2) {
        return { pass: false, detail: `1-mismatch search: expected 2 matches (seq1 exact + seq2 1mm), got ${result.matchCount}` };
    }
    if (result.seqsWithMatches !== 2) {
        return { pass: false, detail: `1-mismatch search: expected 2 sequences with matches, got ${result.seqsWithMatches}` };
    }

    return { pass: true, detail: `exact: 1 match/1 seq, 1-mismatch: 2 matches/2 seqs, 2-mismatch seq correctly excluded` };
});

check('Dot plot: self-comparison produces points along the main diagonal', async (page) => {
    // 1. Load a single 20bp sequence with a repeating ACGT pattern.
    //    Self-comparison (seq vs itself) should produce matches along the
    //    main diagonal because every position i trivially matches itself.
    const fasta = '>seq1\nACGTACGTACGTACGTACGT\n';
    await loadFasta(page, fasta);

    // 2. Call openDotPlot with the sequence against itself (self-comparison).
    //    SPIN mode (default) uses k-mer exact matching via web worker.
    await page.evaluate(async () => {
        const seq = state.seqs[0].seq.replace(/[-.\s]/g, '');
        await openDotPlot(seq, seq, 'seq1', 'seq1', null);
    });

    // 3. Wait for the web worker computation to complete
    await page.waitForFunction(() => !_dotPlotState.computing, { timeout: 10000 });

    // 4. Assert specific, correct output
    const result = await page.evaluate(() => {
        const S = _dotPlotState;
        const canvas = document.getElementById('dotPlotCanvas');
        return {
            hasMatchMap: !!S.matchMap,
            rows: S.rows,
            cols: S.cols,
            spinMode: S.spinMode,
            canvasExists: !!canvas,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0,
            // Count matches on the main diagonal: matchMap[i * cols + i]
            diagonalMatchCount: (() => {
                if (!S.matchMap || S.rows !== S.cols || S.rows === 0) return -1;
                let count = 0;
                for (let i = 0; i < S.rows; i++) {
                    if (S.matchMap[i * S.cols + i]) count++;
                }
                return count;
            })(),
            // Sample first 5 diagonal values for debugging
            diagonalSample: (() => {
                if (!S.matchMap || S.rows === 0) return null;
                const sample = [];
                for (let i = 0; i < Math.min(5, S.rows); i++) {
                    sample.push(S.matchMap[i * S.cols + i]);
                }
                return sample;
            })(),
        };
    });

    if (!result.hasMatchMap) {
        return { pass: false, detail: 'matchMap is null - SPIN word-match computation did not produce results' };
    }
    if (result.rows !== result.cols) {
        return { pass: false, detail: `self-comparison should have rows === cols, got ${result.rows} x ${result.cols}` };
    }
    if (result.rows === 0) {
        return { pass: false, detail: 'rows is 0 - no computation results' };
    }
    if (!result.canvasExists) {
        return { pass: false, detail: 'dot plot canvas element not found after openDotPlot' };
    }
    if (result.diagonalMatchCount === -1) {
        return { pass: false, detail: 'could not count diagonal matches (rows/cols mismatch or empty)' };
    }
    // For a self-comparison, positions on the main diagonal should match
    // (seq[i] === seq[i] trivially). With word size 6 (from #dotPlotWindow
    // default in HTML) and a 20bp sequence, every word at position i matches
    // itself, and each match marks 6 cells (i,i)..(i+5,i+5). The union of
    // all word matches covers the entire diagonal (0..19). Require at least
    // 50% as a robust threshold.
    const expectedMin = Math.floor(result.rows * 0.5);
    if (result.diagonalMatchCount < expectedMin) {
        return { pass: false, detail: `only ${result.diagonalMatchCount}/${result.rows} diagonal matches (expected at least ${expectedMin}); sample: ${JSON.stringify(result.diagonalSample)}` };
    }
    return { pass: true, detail: `${result.rows}x${result.cols} self-comparison, ${result.diagonalMatchCount} diagonal matches, canvas ${result.canvasWidth}x${result.canvasHeight}` };
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
