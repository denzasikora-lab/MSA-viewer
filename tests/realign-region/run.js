'use strict';
/**
 * Region-realign tests: unit checks, 10 datasets, every option combination,
 * and multi-span (several selected blocks) splice behaviour.
 *
 * Fake MAFFT is deterministic (insert a gap after residue 1, then right-pad).
 * Run: node tests/realign-region/run.js
 */
const fs = require('fs');
const path = require('path');
const RR = require('../../realign-region.js');

const DIR = __dirname;
let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, detail) {
    if (cond) {
        passed++;
        return;
    }
    failed++;
    failures.push(name + (detail ? ': ' + detail : ''));
}

function loadFa(file) {
    const recs = RR.parseFasta(fs.readFileSync(path.join(DIR, file), 'utf8'));
    return recs.map(r => ({ header: r.name, fullHeader: r.name, seq: r.seq.toUpperCase() }));
}

function range(a, b) {
    const s = [];
    for (let i = a; i <= b; i++) s.push(i);
    return s;
}

function union() {
    const s = [];
    for (let i = 0; i < arguments.length; i++) {
        for (let j = 0; j < arguments[i].length; j++) s.push(arguments[i][j]);
    }
    return s;
}

function fakeAlignInsertGap(fasta) {
    const recs = RR.parseFasta(fasta);
    const gapped = recs.map(r => {
        if (!r.seq.length) return '';
        return r.seq.charAt(0) + '-' + r.seq.slice(1);
    });
    const max = gapped.reduce((m, s) => Math.max(m, s.length), 0);
    return recs.map((r, i) => '>' + r.name + '\n' + gapped[i] + '-'.repeat(max - gapped[i].length)).join('\n');
}

function stubReorder(fasta) {
    const recs = RR.parseFasta(fasta);
    recs.sort((a, b) => (a.seq < b.seq ? -1 : a.seq > b.seq ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return { fasta: RR.toFasta(recs), order: recs.map(r => r.name) };
}

function pieces(seq, runs) {
    const sorted = runs.slice().sort((a, b) => a.start - b.start);
    const flanks = [];
    const regions = [];
    let cur = 0;
    for (const r of sorted) {
        flanks.push(seq.substring(cur, r.start));
        regions.push(seq.substring(r.start, r.end + 1));
        cur = r.end + 1;
    }
    flanks.push(seq.substring(cur));
    return { flanks, regions };
}

function flanksMatch(origSeqs, newSeqs, runs) {
    if (origSeqs.length !== newSeqs.length) return 'length ' + origSeqs.length + ' vs ' + newSeqs.length;
    const byNew = {};
    for (let i = 0; i < newSeqs.length; i++) byNew[RR.headerKey(newSeqs[i])] = newSeqs[i];
    for (let i = 0; i < origSeqs.length; i++) {
        const orig = origSeqs[i];
        const neu = byNew[RR.headerKey(orig)];
        if (!neu) return 'missing ' + orig.header;
        const a = pieces(orig.seq, runs);
        const got = neu.seq;
        const first = a.flanks[0] || '';
        if (got.substring(0, first.length) !== first) {
            return orig.header + ' missing left flank ' + JSON.stringify(first);
        }
        let pos = first.length;
        for (let f = 1; f < a.flanks.length; f++) {
            const fl = a.flanks[f] || '';
            if (f === a.flanks.length - 1) {
                if (fl && got.slice(-fl.length) !== fl) {
                    return orig.header + ' missing right flank ' + JSON.stringify(fl);
                }
                if (fl && got.length - fl.length < pos) {
                    return orig.header + ' right flank overlaps previous at ' + pos;
                }
            } else {
                if (fl === '') continue;
                const at = got.indexOf(fl, pos);
                if (at < pos) return orig.header + ' missing inner flank ' + JSON.stringify(fl);
                pos = at + fl.length;
            }
        }
    }
    return null;
}

function allSameLength(seqs) {
    const n = seqs[0].seq.length;
    return seqs.every(s => s.seq.length === n);
}

const DATASETS = {
    ds01: {
        file: 'ds01_frameshift.fa',
        cols: range(8, 19),
        note: 'frameshifted 12-col middle; flanks 8A / 8T'
    },
    ds02: {
        file: 'ds02_two_blocks.fa',
        cols: union(range(8, 13), range(22, 27)),
        note: 'two disjoint 6-col blocks'
    },
    ds03: {
        file: 'ds03_three_blocks.fa',
        cols: union(range(4, 7), range(12, 15), range(20, 23)),
        note: 'three disjoint 4-col blocks'
    },
    ds04: {
        file: 'ds04_rc_middle.fa',
        cols: range(8, 25),
        note: 's3 region is reverse-complement of the others',
        expectFlip: 's3'
    },
    ds05: {
        file: 'ds05_shuffled_vs_region.fa',
        cols: range(0, 19),
        note: 's1/s3 polyA vs s2/s4 polyC; input order is interleaved'
    },
    ds06: {
        file: 'ds06_allgap_region.fa',
        cols: range(8, 19),
        note: 's3 all-gap in the selected region'
    },
    ds07: {
        file: 'ds07_identity.fa',
        cols: range(8, 19),
        note: 'identical already-aligned rows'
    },
    ds08: {
        file: 'ds08_wide_flanks.fa',
        cols: range(40, 43),
        note: '40-col flanks, 4-col region'
    },
    ds09: {
        file: 'ds09_two_blocks_rc.fa',
        cols: union(range(4, 7), range(19, 36)),
        note: 'two blocks; only the second is RC on s3'
    },
    ds10: {
        file: 'ds10_region_vs_flank_order.fa',
        cols: range(12, 23),
        note: 'region alpha-order differs from input/flank order'
    }
};

function optsBase(over) {
    return Object.assign({
        adjustDir: false,
        reorder: false,
        reorderOnly: false,
        applyAdjustFull: true,
        applyReorder: false,
        mafftAlign: fakeAlignInsertGap,
        reorderByGuideTree: stubReorder,
        reverseComplement: RR.reverseComplement,
        adjustDirection: RR.adjustDirection
    }, over || {});
}

async function runDs(key, over) {
    const meta = DATASETS[key];
    const seqs = loadFa(meta.file);
    const result = await RR.run(seqs, meta.cols, optsBase(over));
    return { meta, seqs, result, runs: RR.columnRuns(meta.cols) };
}

// ---------------------------------------------------------------------------
// Unit: columnRuns / remap / rebuild
// ---------------------------------------------------------------------------
(function unitColumnRuns() {
    const r = RR.columnRuns([5, 6, 7, 20, 21, 30]);
    ok('columnRuns drops isolated singles', r.length === 2, JSON.stringify(r));
    ok('columnRuns first span', r[0].start === 5 && r[0].end === 7, JSON.stringify(r[0]));
    ok('columnRuns second span', r[1].start === 20 && r[1].end === 21, JSON.stringify(r[1]));
    ok('columnRuns empty', RR.columnRuns([]).length === 0);
    ok('columnRuns two-col min', RR.columnRuns([3, 4]).length === 1);
    const rem = RR.remapRun({ start: 2, end: 4 }, 10);
    ok('remapRun mirrors', rem.start === 5 && rem.end === 7, JSON.stringify(rem));
})();

(function unitRebuild() {
    const seqs = [
        { header: 'a', seq: 'AAAAATGCCCCCTTTTT' },
        { header: 'b', seq: 'AAAAATGCCCCCTTTTT' }
    ];
    // replace cols 4-6 (ATG) with QQ, cols 11-13 (CCC? wait)
    // AAAA ATG CCCC C TTTTT
    // 0123 456 78910 11...
    const plans = [{
        byHeader: { a: 'QQQ', b: 'QQQ' },
        alignedLen: 3,
        coords: { a: { start: 4, end: 6 }, b: { start: 4, end: 6 } }
    }];
    const out = RR.rebuild(seqs, plans);
    ok('rebuild keeps left', out[0].seq.indexOf('AAAA') === 0, out[0].seq);
    ok('rebuild splices', out[0].seq === 'AAAAQQQCCCCCTTTTT', out[0].seq);
})();

(function unitLengths() {
    for (const key of Object.keys(DATASETS)) {
        const seqs = loadFa(DATASETS[key].file);
        ok(key + ' loads 4 seqs', seqs.length === 4, 'n=' + seqs.length);
        ok(key + ' equal lengths', allSameLength(seqs), seqs.map(s => s.seq.length).join(','));
        ok(key + ' has a valid run', RR.columnRuns(DATASETS[key].cols).length >= 1);
    }
})();

(function unitDs04FlipDetect() {
    const seqs = loadFa(DATASETS.ds04.file);
    const fa = seqs.map(s => '>' + s.header + '\n' + RR.concatSelected(s.seq, DATASETS.ds04.cols)).join('\n');
    const adj = RR.adjustDirection(fa);
    ok('ds04 detect s3 flipped', adj.flipped.has('s3'), [...adj.flipped].join(','));
    ok('ds04 does not flip s2', !adj.flipped.has('s2'), [...adj.flipped].join(','));
})();

// ---------------------------------------------------------------------------
// Per-dataset behaviour
// ---------------------------------------------------------------------------
async function datasetTests() {
    {
        const { seqs, result, runs } = await runDs('ds01', {});
        ok('ds01 aligned', result.aligned && !result.cancelled);
        ok('ds01 mafft once', result.mafftCalls === 1, 'calls=' + result.mafftCalls);
        ok('ds01 same length', allSameLength(result.seqs));
        ok('ds01 flanks', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        ok('ds01 grew', result.seqs[0].seq.length > seqs[0].seq.length, result.seqs[0].seq.length + ' vs ' + seqs[0].seq.length);
        ok('ds01 order kept', result.seqs.map(s => s.header).join() === 's1,s2,s3,s4');
    }

    {
        const { seqs, result, runs } = await runDs('ds02', {});
        ok('ds02 two runs', runs.length === 2, JSON.stringify(runs));
        ok('ds02 mafft twice', result.mafftCalls === 2, 'calls=' + result.mafftCalls);
        ok('ds02 flanks+mid', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        const midOrig = seqs[0].seq.substring(14, 22);
        const rebuilt = pieces(result.seqs[0].seq, [
            { start: 8, end: 8 + (result.seqs[0].seq.length - seqs[0].seq.length) / 2 + 5 },
        ]);
        // Direct: original mid CCCCCCCC must appear once between the two new regions
        ok('ds02 mid CCCCCCCC intact', result.seqs[0].seq.indexOf('CCCCCCCC') >= 0, result.seqs[0].seq);
        ok('ds02 left AAAAAAAA intact', result.seqs[0].seq.indexOf('AAAAAAAA') === 0);
        ok('ds02 right TTTTTTTT intact', result.seqs[0].seq.slice(-8) === 'TTTTTTTT');
        void midOrig; void rebuilt;
    }

    {
        const { seqs, result, runs } = await runDs('ds03', {});
        ok('ds03 three runs', runs.length === 3, JSON.stringify(runs));
        ok('ds03 mafft thrice', result.mafftCalls === 3, 'calls=' + result.mafftCalls);
        ok('ds03 flanks', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        ok('ds03 mids CCCC and GGGG', result.seqs[0].seq.indexOf('CCCC') >= 0 && result.seqs[0].seq.indexOf('GGGG') >= 0, result.seqs[0].seq);
    }

    {
        const { seqs, result } = await runDs('ds04', { adjustDir: true, applyAdjustFull: false });
        ok('ds04 flipped s3', result.flipped.indexOf('s3') >= 0, JSON.stringify(result.flipped));
        ok('ds04 region-only keeps s3 flanks', result.seqs.find(s => s.header === 's3').seq.slice(0, 8) === 'AAAAAAAA');
        ok('ds04 region-only keeps s3 right', result.seqs.find(s => s.header === 's3').seq.slice(-8) === 'TTTTTTTT');
        const { result: full } = await runDs('ds04', { adjustDir: true, applyAdjustFull: true });
        const s3 = full.seqs.find(s => s.header === 's3');
        // Full-row RC of 8A+region+8T → 8A + RC(region) + 8T because A/T flanks complement each other,
        // but the region columns are remapped. Left flank of a fully RC'd A...T row is A again
        // (RC of TTTTTTTT). Still 8 A's. Distinguish via: region-only vs full both have A flanks
        // on this particular ds; check s3's selected region is no longer the RC oligo as a raw substring
        // of the original coordinates. Instead: full RC path must still splice (aligned true).
        ok('ds04 full-seq RC still aligns', full.aligned);
        ok('ds04 full-seq RC flipped', full.flipped.indexOf('s3') >= 0);
        void seqs; void s3;
    }

    {
        const { result } = await runDs('ds05', { reorder: true, applyReorder: true });
        ok('ds05 order applied', result.orderApplied, JSON.stringify(result.order));
        const headers = result.seqs.map(s => s.header).join(',');
        // polyA (s1,s3) sorts before polyC (s2,s4)
        ok('ds05 clustered by region', headers === 's1,s3,s2,s4', headers);
        const { result: kept } = await runDs('ds05', { reorder: true, applyReorder: false });
        ok('ds05 order not applied', !kept.orderApplied && kept.seqs.map(s => s.header).join(',') === 's1,s2,s3,s4');
    }

    {
        const { seqs, result, runs } = await runDs('ds06', {});
        ok('ds06 aligned', result.aligned);
        ok('ds06 flanks including gappy row', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        const s3 = result.seqs.find(s => s.header === 's3');
        ok('ds06 s3 still starts with 8A', s3.seq.slice(0, 8) === 'AAAAAAAA', s3.seq);
        ok('ds06 s3 still ends with 8T', s3.seq.slice(-8) === 'TTTTTTTT', s3.seq);
    }

    {
        const { seqs, result, runs } = await runDs('ds07', {});
        ok('ds07 flanks', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        ok('ds07 all rows still identical', result.seqs.every(s => s.seq === result.seqs[0].seq));
    }

    {
        const { seqs, result, runs } = await runDs('ds08', {});
        ok('ds08 flanks', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        ok('ds08 left 40A', result.seqs[0].seq.slice(0, 40) === 'A'.repeat(40));
        ok('ds08 right 40T', result.seqs[0].seq.slice(-40) === 'T'.repeat(40));
    }

    {
        const { seqs, result, runs } = await runDs('ds09', {});
        ok('ds09 two runs', runs.length === 2, JSON.stringify(runs));
        ok('ds09 mafft twice', result.mafftCalls === 2, 'calls=' + result.mafftCalls);
        ok('ds09 flanks', !flanksMatch(seqs, result.seqs, runs), flanksMatch(seqs, result.seqs, runs));
        ok('ds09 unselected C-run intact', result.seqs[0].seq.indexOf('C'.repeat(11)) >= 0, result.seqs[0].seq);
    }

    {
        const { result } = await runDs('ds10', { reorder: true, applyReorder: true });
        const headers = result.seqs.map(s => s.header).join(',');
        // region strings A,C,G,T belong to s2,s3,s4,s1
        ok('ds10 region order', headers === 's2,s3,s4,s1', headers + ' order=' + (result.order || []).join(','));
        const { result: onlyNo } = await runDs('ds10', { reorderOnly: true, applyReorder: false });
        ok('ds10 reorder-only + no-apply is no-op order', onlyNo.seqs.map(s => s.header).join(',') === 's1,s2,s3,s4');
        ok('ds10 reorder-only + no-apply skips mafft', onlyNo.mafftCalls === 0 && !onlyNo.aligned);
        const { result: onlyYes } = await runDs('ds10', { reorderOnly: true, applyReorder: true });
        ok('ds10 reorder-only applies', onlyYes.orderApplied && onlyYes.seqs.map(s => s.header).join(',') === 's2,s3,s4,s1');
        ok('ds10 reorder-only no mafft', onlyYes.mafftCalls === 0 && !onlyYes.aligned);
    }
}

// ---------------------------------------------------------------------------
// All option combinations × single-block (ds01) and multi-block (ds02)
// ---------------------------------------------------------------------------
async function comboTests() {
    const flags = [false, true];
    let n = 0;
    for (const adjustDir of flags) {
        for (const reorderOnly of flags) {
            for (const reorder of flags) {
                for (const applyAdjustFull of flags) {
                    for (const applyReorder of flags) {
                        n++;
                        for (const key of ['ds01', 'ds02']) {
                            const name = 'combo#' + n + ' ' + key +
                                ' adj=' + adjustDir + ' ro=' + reorderOnly + ' re=' + reorder +
                                ' full=' + applyAdjustFull + ' apply=' + applyReorder;
                            let mafftCalled = 0;
                            const mafft = (fa) => { mafftCalled++; return fakeAlignInsertGap(fa); };
                            const throwMafft = () => { throw new Error('mafft should not be called in reorder-only'); };
                            const { seqs, result, runs } = await runDs(key, {
                                adjustDir,
                                reorder,
                                reorderOnly,
                                applyAdjustFull,
                                applyReorder,
                                mafftAlign: reorderOnly ? throwMafft : mafft
                            });
                            ok(name + ' not cancelled', !result.cancelled);
                            ok(name + ' equal lengths', allSameLength(result.seqs));
                            if (reorderOnly) {
                                ok(name + ' no mafft', result.mafftCalls === 0 && !result.aligned);
                                if (applyReorder) {
                                    ok(name + ' order applied', result.orderApplied);
                                } else {
                                    ok(name + ' order kept', result.seqs.map(s => s.header).join(',') === seqs.map(s => s.header).join(','));
                                    ok(name + ' not orderApplied', !result.orderApplied);
                                }
                            } else {
                                ok(name + ' aligned', result.aligned);
                                ok(name + ' mafft per run', result.mafftCalls === runs.length,
                                    'calls=' + result.mafftCalls + ' runs=' + runs.length);
                                void mafftCalled;
                                if (!(adjustDir && applyAdjustFull && result.flipped.length)) {
                                    const mismatch = flanksMatch(seqs, result.seqs, runs);
                                    ok(name + ' flanks', !mismatch, mismatch);
                                }
                                if (reorder && applyReorder) {
                                    ok(name + ' order applied', result.orderApplied);
                                } else {
                                    ok(name + ' row order kept', result.seqs.map(s => s.header).join(',') === seqs.map(s => s.header).join(','));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    ok('32 option combinations enumerated', n === 32, 'n=' + n);
}

// Extra multi-block: disjoint vs old min–max (must NOT eat the middle)
async function multiBlockContrast() {
    const seqs = loadFa(DATASETS.ds02.file);
    const runs = RR.columnRuns(DATASETS.ds02.cols);
    ok('contrast two runs not one', runs.length === 2);
    const min = Math.min.apply(null, DATASETS.ds02.cols);
    const max = Math.max.apply(null, DATASETS.ds02.cols);
    const oldStyle = RR.columnRuns(range(min, max));
    ok('old min-max would be one span', oldStyle.length === 1 && oldStyle[0].end - oldStyle[0].start + 1 === max - min + 1);

    const captured = [];
    const cap = (fa) => { captured.push(fa); return fakeAlignInsertGap(fa); };
    const disjoint = await RR.run(seqs, DATASETS.ds02.cols, optsBase({ mafftAlign: cap }));
    ok('disjoint two maffts', disjoint.mafftCalls === 2 && captured.length === 2);
    ok('disjoint MAFFT input excludes mid C-run', captured.every(fa => !fa.replace(/[\s>s0-9]/g, '').includes('CCCCCCCC')), captured.join(' || '));
    ok('disjoint keeps CCCCCCCC in MSA', disjoint.seqs[0].seq.indexOf('CCCCCCCC') >= 0, disjoint.seqs[0].seq);

    captured.length = 0;
    const spanning = await RR.run(seqs, range(min, max), optsBase({ mafftAlign: cap }));
    ok('spanning one mafft', spanning.mafftCalls === 1 && captured.length === 1);
    ok('spanning MAFFT input includes mid C-run', captured[0].indexOf('CCCCCCCC') >= 0, captured[0]);
    void spanning;
}

async function cancelTest() {
    const seqs = loadFa(DATASETS.ds01.file);
    const result = await RR.run(seqs, DATASETS.ds01.cols, optsBase({
        mafftAlign: async () => null
    }));
    ok('cancel returns original', result.cancelled && RR.seqsEqual(result.seqs, seqs));
}

(async function main() {
    try {
        await datasetTests();
        await comboTests();
        await multiBlockContrast();
        await cancelTest();
    } catch (err) {
        failed++;
        failures.push('THROWN: ' + (err && err.stack ? err.stack : err));
    }
    const total = passed + failed;
    console.log('realign-region: ' + passed + ' passed, ' + failed + ' failed (' + total + ' assertions)');
    if (failures.length) {
        console.log('FAILURES:');
        failures.forEach(f => console.log('  - ' + f));
        process.exit(1);
    }
})();
