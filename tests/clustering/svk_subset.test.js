'use strict';
/**
 * SVK 4-type subset: 10 sequences from each of four 6-mer similarity groups
 * in svk_subfam_input_30k (600 chunk consensi). Cluster Now must not return
 * 0 groups or a leftover dump of the whole set. Show bicluster must paint at
 * least one diagnostic row-subset (not only full-height conserved slabs).
 *
 * Run: node tests/clustering/svk_subset.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..', '..');
const fa = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'clustering', 'svk_k4_subset.fa'), 'utf8');

function loadFa(text) {
    const seqs = [];
    let cur = null;
    for (const line of String(text).split(/\r?\n/)) {
        if (line.startsWith('>')) {
            if (cur) seqs.push(cur);
            cur = { id: line.slice(1).trim(), seq: '' };
        } else if (cur) cur.seq += line.trim().toUpperCase();
    }
    if (cur) seqs.push(cur);
    return seqs;
}
function truth(id) {
    const m = /^K(\d+)_/.exec(id);
    return m ? parseInt(m[1], 10) : 0;
}
function purity(types) {
    const vals = Object.values(types);
    const tot = vals.reduce((a, b) => a + b, 0);
    return tot ? Math.max.apply(null, vals) / tot : 0;
}

const clusterSrc = fs.readFileSync(path.join(DIR, 'cluster.js'), 'utf8');
const cctx = { console, performance, setTimeout, MessageChannel, Map, Set, Array, Math, Object };
vm.createContext(cctx);
vm.runInContext(clusterSrc + '\nthis.SINEClusterer = SINEClusterer;', cctx);

const bcSrc = fs.readFileSync(path.join(DIR, 'block-bicluster.js'), 'utf8');
const bctx = {
    console, performance, setTimeout, Map, Set, Array, Math, Object,
    module: { exports: {} }, exports: {}
};
vm.createContext(bctx);
vm.runInContext(bcSrc, bctx);
const BC = bctx.module.exports;

const sub = loadFa(fa);
let failed = 0;
function ok(name, cond, detail) {
    if (cond) console.log('  ok  ' + name);
    else { failed++; console.log('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

(async () => {
    const r = await new cctx.SINEClusterer(sub.map(s => ({ id: s.id, seq: s.seq }))).clusterChunked({
        minSize: 3, minPerfect: 5, maxIterations: 10,
        qualitySmall: 80, qualityMedium: 70, qualityLarge: 60,
        sizeSmallMedium: 11, sizeMediumLarge: 20, minOccurrences: 3
    });
    console.log('Cluster Now', r.summary);
    ok('not empty', r.summary.nClusters >= 3, 'n=' + r.summary.nClusters);
    ok('not a leftover dump', r.clusters.every(c => c.size < sub.length),
        r.clusters.map(c => c.size).join(','));
    const scored = r.clusters.map(c => {
        const types = {};
        c.sequences.forEach(s => { const t = truth(s.id); types[t] = (types[t] || 0) + 1; });
        return { size: c.size, types, purity: purity(types) };
    });
    const clean = scored.filter(c => c.size >= 7 && c.purity >= 0.85);
    ok('at least two clean type recoveries', clean.length >= 2,
        JSON.stringify(scored));

    const mask = BC.computeBiclusterMask(fa, {});
    const diag = (mask.blocks || []).filter(b => b.kind !== 'conserved' && b.rows !== 'all');
    ok('bicluster paints diagnostic row-subsets', diag.length >= 1, 'n=' + diag.length);
    const typed = diag.map(b => {
        const types = {};
        (b.rows || []).forEach(ri => { const t = truth(sub[ri].id); types[t] = (types[t] || 0) + 1; });
        return { n: (b.rows || []).length, cols: [b.col_start, b.col_end], types, purity: purity(types) };
    });
    ok('a diagnostic rectangle is one type', typed.some(t => t.n >= 7 && t.purity >= 0.8),
        JSON.stringify(typed.slice(0, 8)));

    if (failed) {
        console.log(failed + ' failed');
        process.exit(1);
    }
    console.log('all passed');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
