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

    const labeled = [[], [], [], [], []];
    sub.forEach((s, i) => { const t = truth(s.id); if (t) labeled[t].push(i); });
    const kGroups = [labeled[1], labeled[2], labeled[3], labeled[4]];
    const charer = new cctx.SINEClusterer(sub.map(s => ({ id: s.id, seq: s.seq })));
    const chars = charer.characterizeGroups(kGroups);
    const k3 = chars[2];
    const k3pos = new Set();
    (k3.perfectFeatures || []).forEach(f => k3pos.add(f.pos));
    (k3.cloudyFeatures || []).forEach(f => k3pos.add(f.pos));
    const k3motif = (k3.motifRuns || []).map(r => r.start + '-' + r.end + ':' + r.motif).join(' | ');
    console.log('K3 characters', k3pos.size, 'runs', k3motif);
    ok('K3 paints CTCCCAGG distinctive CTC (ungapped ~58, aln 128-130)',
        k3pos.has(128) && k3pos.has(129) && k3pos.has(130),
        'missing ' + [128, 129, 130].filter(p => !k3pos.has(p)).join(',') + ' runs ' + k3motif);
    ok('K3 CTCCCAGG starts with exclusive C vs consensus G (aln 128)',
        (k3.perfectFeatures || []).some(f => f.pos === 128 && f.char === 'C'),
        JSON.stringify((k3.perfectFeatures || []).filter(f => f.pos >= 128 && f.pos <= 135)));
    ok('conserved ccagg tail of CTCCCAGG is not claimed (aln 131-132, 134-135)',
        !k3pos.has(131) && !k3pos.has(132) && !k3pos.has(134) && !k3pos.has(135),
        'claimed ' + [131, 132, 134, 135].filter(p => k3pos.has(p)).join(','));
    const consPos = [];
    const L = sub[0].seq.length;
    for (let p = 0; p < L; p++) {
        const counts = {};
        let n = 0;
        sub.forEach(s => {
            const ch = s.seq[p];
            if (!ch || ch === '-' || ch === '.') return;
            counts[ch] = (counts[ch] || 0) + 1;
            n++;
        });
        let max = 0;
        Object.keys(counts).forEach(k => { if (counts[k] > max) max = counts[k]; });
        if (n && max / sub.length > 0.8) consPos.push(p + 1);
    }
    const claimedCore = consPos.filter(p => {
        if (!k3pos.has(p)) return false;
        const counts = {};
        sub.forEach(s => {
            const ch = s.seq[p - 1];
            if (!ch || ch === '-' || ch === '.') return;
            counts[ch] = (counts[ch] || 0) + 1;
        });
        let maxch = null, max = 0;
        Object.keys(counts).forEach(k => { if (counts[k] > max) { max = counts[k]; maxch = k; } });
        const feat = [...(k3.perfectFeatures || []), ...(k3.cloudyFeatures || [])].find(f => f.pos === p);
        return feat && feat.char === maxch;
    });
    ok('K3 does not claim globally conserved consensus bases', claimedCore.length === 0,
        'claimed ' + claimedCore.join(','));

    const typeHeaders = kGroups.map(g => g.map(i => sub[i].id));
    const tagged = diag.map(b => {
        const headers = (b.rows || []).map(ri => sub[ri].id);
        return cctx.SINEClusterer.tagRectangleAgainstTypes(headers, typeHeaders);
    });
    ok('a diagnostic rectangle tags as inside or supports a labeled type',
        tagged.some(t => t.kind === 'inside' || t.kind === 'supports'),
        JSON.stringify(tagged.slice(0, 8)));

    const auto4 = cctx.SINEClusterer.suggestGroupCount(
        [0.01, 0.01, 0.02, 0.02, 0.03, 0.04, 0.20, 0.21, 0.22], 10);
    ok('suggestGroupCount cuts at the similarity jump (k=4)', auto4 === 4, 'k=' + auto4);
    const autoFine = cctx.SINEClusterer.suggestGroupCount(
        [0.01, 0.02, 0.03, 0.18, 0.19, 0.20, 0.38, 0.39, 0.40], 10);
    ok('suggestGroupCount prefers the finer of two prominent jumps', autoFine >= 4, 'k=' + autoFine);

    if (failed) {
        console.log(failed + ' failed');
        process.exit(1);
    }
    console.log('all passed');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
