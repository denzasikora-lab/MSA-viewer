'use strict';
/**
 * General-applicability sweep: Cluster Now + Show bicluster on planted,
 * synthetic, and real alignments. Invariants that must hold on ANY file:
 *   - finishes (no throw)
 *   - never reports one cluster that is the entire alignment (leftover dump)
 *   - bicluster returns a mask object
 * Dataset-specific oracles where ground truth is known.
 *
 * Run: node tests/clustering/multi_dataset.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

function loadFa(text) {
    const seqs = [];
    let cur = null;
    for (const line of String(text).split(/\r?\n/)) {
        if (line.startsWith('>')) {
            if (cur) seqs.push(cur);
            cur = { id: line.slice(1).trim().split(/\s+/)[0], seq: '' };
        } else if (cur) cur.seq += line.trim().toUpperCase();
    }
    if (cur) seqs.push(cur);
    return seqs;
}
function read(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const clusterSrc = fs.readFileSync(path.join(ROOT, 'cluster.js'), 'utf8');
const cctx = { console, performance, setTimeout, MessageChannel, Map, Set, Array, Math, Object };
vm.createContext(cctx);
vm.runInContext(clusterSrc + '\nthis.SINEClusterer = SINEClusterer;', cctx);

const bctx = {
    console, performance, setTimeout, Map, Set, Array, Math, Object,
    module: { exports: {} }, exports: {}
};
vm.createContext(bctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'block-bicluster.js'), 'utf8'), bctx);
const BC = bctx.module.exports;

const PLANTED_AB = [
    '>seqA1', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA2', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA3', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA4', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA5', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqB1', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB2', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB3', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB4', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB5', 'ACGTACGTTTTTTTTTACGTACGT'
].join('\n');

const PLANTED_ABC = [
    '>seqA1', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA2', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA3', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA4', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqA5', 'ACGTACGTAAAAAAAAACGTACGT',
    '>seqB1', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB2', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB3', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB4', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqB5', 'ACGTACGTTTTTTTTTACGTACGT',
    '>seqC1', 'ACGTACGTGGGGGGGGACGTACGT',
    '>seqC2', 'ACGTACGTGGGGGGGGACGTACGT',
    '>seqC3', 'ACGTACGTGGGGGGGGACGTACGT',
    '>seqC4', 'ACGTACGTGGGGGGGGACGTACGT',
    '>seqC5', 'ACGTACGTGGGGGGGGACGTACGT'
].join('\n');

const DATASETS = [
    { name: 'planted_AB', fa: PLANTED_AB, kind: 'two_types', a: /^seqA/, b: /^seqB/ },
    { name: 'planted_ABC', fa: PLANTED_ABC, kind: 'three_types' },
    { name: 'audit_walk', rel: 'scratch/clustering_audit_walk.fa', kind: 'named_types', types: { C: /stackC|orphanC/, G: /stackG/ } },
    { name: 'oma_SINE16b_realigned', rel: 'tests/fixtures/blockmask/testsets/oma_SINE16b_realigned.aln.fa', kind: 'real' },
    { name: 'mosaic_subset', rel: 'tests/fixtures/blockmask/testsets/mosaic_subset.aln.fa', kind: 'mosaic' },
    { name: 'clean_core', rel: 'tests/fixtures/blockmask/testsets/clean_core.aln.fa', kind: 'uniform' },
    { name: 'eye_v1', rel: 'scratch/bicluster_eye_test.fa', kind: 'eye' },
    { name: 'oma_SINE16b', rel: 'tests/fixtures/blockmask/oma_SINE16b.aln.fa', kind: 'real' },
    { name: 'kitchen_sink', rel: 'tests/fixtures/blockmask/testsets/kitchen_sink.aln.fa', kind: 'real' },
    { name: 'synth_unbalanced', rel: 'tests/fixtures/blockmask/synth_unbalanced.aln.fa', kind: 'mosaic' },
    { name: 'decay_slope', rel: 'tests/fixtures/blockmask/testsets/decay_slope.aln.fa', kind: 'real' },
    { name: 'simple_repeat', rel: 'tests/fixtures/blockmask/testsets/simple_repeat.aln.fa', kind: 'real' },
    { name: 'svk_k4_subset', rel: 'tests/fixtures/clustering/svk_k4_subset.fa', kind: 'svk4' },
    { name: 'snake_gekko', rel: 'snake_gekko_SINEs_cons.fas', kind: 'unaligned' },
    { name: 'real_homologous_ends', rel: 'tests/fixtures/blockmask/testsets/real_homologous_ends.aln.fa', kind: 'real' }
];

const DEFAULTS = {
    minSize: 3, minPerfect: 5, maxIterations: 10,
    qualitySmall: 80, qualityMedium: 70, qualityLarge: 60,
    sizeSmallMedium: 11, sizeMediumLarge: 20, minOccurrences: 3
};

let failed = 0;
const lines = [];
function ok(name, cond, detail) {
    if (cond) lines.push('  ok  ' + name);
    else { failed++; lines.push('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

async function clusterFa(fa) {
    const seqs = loadFa(fa);
    if (seqs.length < 3) return { seqs, result: null, skip: 'n<3' };
    const c = new cctx.SINEClusterer(seqs.map(s => ({ id: s.id, seq: s.seq })));
    const t0 = Date.now();
    const result = await c.clusterChunked(DEFAULTS);
    return { seqs, result, ms: Date.now() - t0 };
}

(async () => {
    for (const ds of DATASETS) {
        const fa = ds.fa || read(ds.rel);
        const seqs = loadFa(fa);
        lines.push('\n## ' + ds.name + '  n=' + seqs.length + ' L=' + (seqs[0] ? seqs[0].seq.length : 0));

        let cr;
        try {
            cr = await clusterFa(fa);
            ok(ds.name + ' Cluster Now finishes', !!cr.result, cr.skip);
        } catch (e) {
            ok(ds.name + ' Cluster Now finishes', false, e.message);
            continue;
        }
        if (!cr.result) continue;
        const r = cr.result;
        lines.push('    clusters=' + r.summary.nClusters +
            ' assigned=' + r.summary.nAssigned +
            ' unassigned=' + r.summary.nUnassigned +
            ' ' + cr.ms + 'ms' +
            ' sizes=[' + r.clusters.map(c => c.size).join(',') + ']');
        ok(ds.name + ' no whole-alignment dump',
            r.clusters.every(c => c.size < seqs.length),
            'a cluster has size ' + seqs.length);
        ok(ds.name + ' Cluster Now <60s', cr.ms < 60000, cr.ms + 'ms');

        if (ds.kind === 'two_types') {
            const map = {};
            r.clusters.forEach((c, i) => c.sequences.forEach(s => { map[s.id] = i; }));
            const a = seqs.filter(s => ds.a.test(s.id)).map(s => map[s.id]);
            const b = seqs.filter(s => ds.b.test(s.id)).map(s => map[s.id]);
            ok(ds.name + ' recovers two types',
                a.every(x => x !== undefined) && b.every(x => x !== undefined) &&
                a.every(x => x === a[0]) && b.every(x => x === b[0]) && a[0] !== b[0],
                'A=' + a.join() + ' B=' + b.join());
        }
        if (ds.kind === 'three_types') {
            const map = {};
            r.clusters.forEach((c, i) => c.sequences.forEach(s => { map[s.id] = i; }));
            const groups = ['A', 'B', 'C'].map(letter =>
                seqs.filter(s => s.id.indexOf('seq' + letter) === 0).map(s => map[s.id]));
            const assigned = groups.every(g => g.length && g.every(x => x !== undefined && x === g[0]));
            const distinct = new Set(groups.map(g => g[0])).size === 3;
            ok(ds.name + ' recovers three types', assigned && distinct,
                groups.map((g, i) => 'ABC'[i] + '=' + g.join()).join(' '));
        }
        if (ds.kind === 'named_types') {
            const map = {};
            r.clusters.forEach((c, i) => c.sequences.forEach(s => { map[s.id] = i; }));
            const cIds = seqs.filter(s => ds.types.C.test(s.id)).map(s => map[s.id]).filter(x => x !== undefined);
            const gIds = seqs.filter(s => ds.types.G.test(s.id)).map(s => map[s.id]).filter(x => x !== undefined);
            ok(ds.name + ' C-type mostly one cluster',
                cIds.length >= 3 && cIds.filter(x => x === cIds[0]).length >= Math.ceil(cIds.length * 0.6),
                'C=' + cIds.join());
            ok(ds.name + ' G-type mostly one cluster',
                gIds.length >= 3 && gIds.filter(x => x === gIds[0]).length >= Math.ceil(gIds.length * 0.6),
                'G=' + gIds.join());
            if (cIds.length && gIds.length) {
                ok(ds.name + ' C and G not the same cluster', cIds[0] !== gIds[0],
                    'both=' + cIds[0]);
            }
        }
        if (ds.kind === 'uniform') {
            ok(ds.name + ' no diagnostic clusters on a uniform alignment',
                r.summary.nClusters === 0,
                'nClusters=' + r.summary.nClusters);
        }
        if (ds.kind === 'svk4') {
            const types = {};
            r.clusters.forEach(c => {
                const counts = {};
                c.sequences.forEach(s => {
                    const t = (s.id.match(/^K(\d+)_/) || [])[1];
                    if (t) counts[t] = (counts[t] || 0) + 1;
                });
                types[c.size] = counts;
            });
            const clean = r.clusters.filter(c => {
                const counts = {};
                c.sequences.forEach(s => {
                    const t = (s.id.match(/^K(\d+)_/) || [])[1];
                    if (t) counts[t] = (counts[t] || 0) + 1;
                });
                const vals = Object.values(counts);
                const tot = vals.reduce((a, b) => a + b, 0);
                return tot >= 7 && Math.max.apply(null, vals) / tot >= 0.85;
            });
            ok(ds.name + ' at least two clean type recoveries', clean.length >= 2,
                JSON.stringify(types));
        }

        let mask;
        try {
            const t1 = Date.now();
            mask = BC.computeBiclusterMask(fa, {});
            ok(ds.name + ' bicluster finishes', mask && Array.isArray(mask.blocks), '');
            ok(ds.name + ' bicluster <60s', Date.now() - t1 < 60000);
        } catch (e) {
            ok(ds.name + ' bicluster finishes', false, e.message);
            continue;
        }
        const splits = (mask.blocks || []).filter(b => b.rows !== 'all' && b.kind !== 'conserved');
        const allRowDumps = (mask.blocks || []).filter(b =>
            b.kind !== 'conserved' && Array.isArray(b.rows) && b.rows.length === seqs.length);
        ok(ds.name + ' bicluster no diagnostic dump of every row',
            allRowDumps.length === 0,
            allRowDumps.length + ' full-height diagnostic blocks');

        if (ds.kind === 'mosaic' || ds.kind === 'eye') {
            ok(ds.name + ' bicluster finds a row-subset',
                splits.some(b => Array.isArray(b.rows) && b.rows.length >= 3 && b.rows.length < seqs.length),
                'sizes=' + splits.map(b => (b.rows || []).length).join(','));
        }
        if (ds.kind === 'uniform') {
            const rowSplits = (mask.blocks || []).filter(b => b.rows !== 'all');
            ok(ds.name + ' bicluster no spurious row-splits',
                rowSplits.length === 0,
                'n=' + rowSplits.length);
        }
        if (ds.kind === 'eye') {
            const six = splits.find(b => Array.isArray(b.rows) && b.rows.length >= 5 && b.rows.length <= 7);
            ok(ds.name + ' bicluster recovers ~6-row planted group', !!six,
                'sizes=' + splits.map(b => (b.rows || []).length).join(','));
        }
    }

    console.log(lines.join('\n'));
    if (failed) {
        console.log('\n' + failed + ' failed');
        process.exit(1);
    }
    console.log('\nall datasets passed');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
