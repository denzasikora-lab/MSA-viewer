'use strict';
/**
 * Verify Cluster Now (and Show bicluster rectangles) against the small
 * alignments the user walked Claude through, using that session's rules:
 *   - actually run the algorithm
 *   - describe the first group with exact 1-based columns and bases
 *   - a single row is never a group
 *   - work on small files (tens of rows/cols), not the 1663-col OMA file
 *
 * Ground truth from:
 *   scratch/bicluster_eye_test*.KEY.txt
 *   tests/fixtures/blockmask/testsets/README.md
 *   clustering_audit_walk.fa (C-stack vs G-stack)
 *
 * Run: node tests/clustering/guided_small.test.js
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

const UI = {
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

function featStr(feats, max) {
    const list = (feats || []).slice(0, max || 20);
    return list.map(f => (f.pos) + ':' + f.char).join(' ');
}

function colRange1(feats) {
    if (!feats || !feats.length) return '-';
    const ps = feats.map(f => f.pos).sort((a, b) => a - b);
    return ps[0] + '-' + ps[ps.length - 1];
}

function describeCluster(c, i) {
    const ids = c.sequences.map(s => s.id);
    const perf = c.perfectFeatures || [];
    const n = Math.min(8, ids.length);
    return '    Cluster ' + (i + 1) + ': n=' + c.size +
        ' members=[' + ids.slice(0, n).join(', ') + (ids.length > n ? ', …' : '') + ']' +
        '\n      exclusive cols (1-based) ' + colRange1(perf) +
        '  nPerfect=' + perf.length +
        '\n      features: ' + (featStr(perf) || '(none exclusive)');
}

function namesOf(c) { return c.sequences.map(s => s.id); }
function allMatch(ids, re) { return ids.length && ids.every(id => re.test(id)); }

(async () => {
    async function runCluster(fa) {
        const seqs = loadFa(fa);
        const r = await new cctx.SINEClusterer(seqs.map(s => ({ id: s.id, seq: s.seq }))).clusterChunked(UI);
        return { seqs, r };
    }

    // ---- 1. eye v1: 24x48, six groupA share C at cols 17-32 ----
    {
        const fa = read('scratch/bicluster_eye_test.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## eye_v1  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        ok('eye_v1 small', seqs.length === 24 && seqs[0].seq.length === 48);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('eye_v1 no singleton', r.clusters.every(c => c.size >= 3));
        ok('eye_v1 not whole-alignment dump', r.clusters.every(c => c.size < seqs.length));
        const a = r.clusters.find(c => allMatch(namesOf(c), /^groupA_/));
        ok('eye_v1 recovers groupA as its own cluster',
            a && a.size === 6 && namesOf(a).length === 6,
            a ? namesOf(a).join(',') : 'no groupA cluster');
        if (a) {
            const cols = (a.perfectFeatures || []).map(f => f.pos);
            const chars = (a.perfectFeatures || []).map(f => f.char);
            ok('eye_v1 groupA exclusive features are C in cols 17-32',
                cols.length >= 5 && cols.every(p => p >= 17 && p <= 32) && chars.every(ch => ch === 'C'),
                featStr(a.perfectFeatures));
        }
        const mask = BC.computeBiclusterMask(fa, {});
        const finds = (mask.blocks || []).filter(b => b.kind !== 'conserved' && b.rows !== 'all' && b.coherence != null);
        const six = finds.find(b => Array.isArray(b.rows) && b.rows.length === 6 &&
            b.col_start <= 16 && b.col_end >= 31);
        ok('eye_v1 bicluster paints the 6-row C rectangle at cols 17-32',
            !!six,
            finds.map(b => 'rows=' + b.rows.length + ' cols=' + (b.col_start + 1) + '-' + (b.col_end + 1)).join('; '));
        ok('eye_v1 bicluster no null-coherence find',
            !(mask.blocks || []).some(b => b.kind !== 'conserved' && b.rows !== 'all' && b.coherence == null));
    }

    // ---- 2. eye v2: same frame, groupA = C and groupB = G in the same 16 cols ----
    {
        const fa = read('scratch/bicluster_eye_test_v2.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## eye_v2  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('eye_v2 no singleton', r.clusters.every(c => c.size >= 3));
        const a = r.clusters.find(c => allMatch(namesOf(c), /^groupA_/));
        const b = r.clusters.find(c => allMatch(namesOf(c), /^groupB_/));
        ok('eye_v2 recovers groupA', a && a.size === 6, a ? namesOf(a).join(',') : 'missing');
        ok('eye_v2 recovers groupB', b && b.size === 6, b ? namesOf(b).join(',') : 'missing');
        if (a && b) ok('eye_v2 A and B are different clusters', a !== b);
        if (a) ok('eye_v2 A features are C',
            (a.perfectFeatures || []).length >= 5 && (a.perfectFeatures || []).every(f => f.char === 'C'),
            featStr(a.perfectFeatures));
        if (b) ok('eye_v2 B features are G',
            (b.perfectFeatures || []).length >= 5 && (b.perfectFeatures || []).every(f => f.char === 'G'),
            featStr(b.perfectFeatures));
    }

    // ---- 3. eye v3: C-zone cols 17-24, G-zone cols 25-32, different rows ----
    {
        const fa = read('scratch/bicluster_eye_test_v3.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## eye_v3  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('eye_v3 no singleton', r.clusters.every(c => c.size >= 3));
        const a = r.clusters.find(c => allMatch(namesOf(c), /^groupA_/));
        const b = r.clusters.find(c => allMatch(namesOf(c), /^groupB_/));
        ok('eye_v3 recovers groupA', a && a.size === 6);
        ok('eye_v3 recovers groupB', b && b.size === 6);
        if (a) ok('eye_v3 A exclusive C sit in cols 17-24',
            (a.perfectFeatures || []).filter(f => f.char === 'C' && f.pos >= 17 && f.pos <= 24).length >= 5,
            featStr(a.perfectFeatures));
        if (b) ok('eye_v3 B exclusive G sit in cols 25-32',
            (b.perfectFeatures || []).filter(f => f.char === 'G' && f.pos >= 25 && f.pos <= 32).length >= 5,
            featStr(b.perfectFeatures));
    }

    // ---- 4. audit walk: C-stack vs G-stack ----
    {
        const fa = read('scratch/clustering_audit_walk.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## audit_walk  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('audit_walk no singleton', r.clusters.every(c => c.size >= 3));
        const cCl = r.clusters.find(c => namesOf(c).filter(id => /stackC|orphanC/.test(id)).length >= 4);
        const gCl = r.clusters.find(c => namesOf(c).filter(id => /stackG/.test(id)).length >= 3);
        ok('audit_walk C-stack is one cluster', !!cCl, cCl ? namesOf(cCl).join(',') : 'missing');
        ok('audit_walk G-stack is one cluster', !!gCl, gCl ? namesOf(gCl).join(',') : 'missing');
        if (cCl && gCl) ok('audit_walk C and G are different clusters', cCl !== gCl);
        if (cCl) ok('audit_walk C cluster is held by C columns',
            (cCl.perfectFeatures || []).filter(f => f.char === 'C').length >= 5,
            featStr(cCl.perfectFeatures));
        if (gCl) ok('audit_walk G cluster is held by G columns',
            (gCl.perfectFeatures || []).filter(f => f.char === 'G').length >= 5,
            featStr(gCl.perfectFeatures));
    }

    // ---- 5. mosaic_subset: 5-of-20 shared tail (Claude: "i mean this one mosaic_subset") ----
    {
        const fa = read('tests/fixtures/blockmask/testsets/mosaic_subset.aln.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## mosaic_subset  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        lines.push('    Cluster Now nClusters=' + r.summary.nClusters +
            ' (exclusive-column instrument; tail is real but not exclusive at any one col)');
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('mosaic_subset no singleton', r.clusters.every(c => c.size >= 3));
        ok('mosaic_subset not whole-alignment dump', r.clusters.every(c => c.size < seqs.length));
        const mask = BC.computeBiclusterMask(fa, {});
        const finds = (mask.blocks || []).filter(b => b.kind !== 'conserved' && b.rows !== 'all' && b.coherence != null);
        const tail = finds.find(b => Array.isArray(b.rows) && b.rows.length >= 3 && b.rows.length <= 8 &&
            b.col_start >= 200 && b.col_end <= 230);
        ok('mosaic_subset bicluster recovers the 5-row shared tail',
            !!tail && tail.rows.length === 5,
            finds.map(b => 'n=' + b.rows.length + ' cols=' + (b.col_start + 1) + '-' + (b.col_end + 1) +
                ' coh=' + (b.coherence == null ? 'null' : Number(b.coherence).toFixed(3))).join('; ') || 'no finds');
        if (tail) {
            lines.push('    first tail rectangle: rows=[' + tail.rows.join(',') + ']' +
                ' cols ' + (tail.col_start + 1) + '-' + (tail.col_end + 1) +
                ' coh=' + Number(tail.coherence).toFixed(3) +
                ' bases=' + (tail.supporting_bases || '').slice(0, 20));
            const planted = [0, 1, 2, 3, 4];
            ok('mosaic_subset tail members are seq00-seq04',
                planted.every(i => tail.rows.indexOf(i) >= 0) && tail.rows.length === 5,
                'rows=' + tail.rows.join(','));
        }
    }

    // ---- 6. clean_core: uniform core, independent flanks ----
    {
        const fa = read('tests/fixtures/blockmask/testsets/clean_core.aln.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## clean_core  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('clean_core Cluster Now finds no diagnostic types', r.summary.nClusters === 0,
            'n=' + r.summary.nClusters);
        const mask = BC.computeBiclusterMask(fa, {});
        const splits = (mask.blocks || []).filter(b => b.rows !== 'all');
        ok('clean_core bicluster no row-splits', splits.length === 0,
            splits.map(b => b.kind + ' n=' + (b.rows || []).length).join(','));
    }

    // ---- 7. small_singleton_test: 50x53 OMA crop the user insisted on ----
    {
        const fa = read('scratch/small_singleton_test.fa');
        const { seqs, r } = await runCluster(fa);
        lines.push('\n## small_singleton_test  n=' + seqs.length + ' L=' + seqs[0].seq.length);
        ok('small_singleton_test is the small crop (not 1663 cols)',
            seqs.length <= 50 && seqs[0].seq.length <= 60,
            'n=' + seqs.length + ' L=' + seqs[0].seq.length);
        r.clusters.forEach((c, i) => lines.push(describeCluster(c, i)));
        ok('small_singleton_test no singleton', r.clusters.every(c => c.size >= 3));
        ok('small_singleton_test not whole-alignment dump', r.clusters.every(c => c.size < seqs.length));
        if (r.clusters[0]) {
            const c0 = r.clusters[0];
            lines.push('    first group members: ' + namesOf(c0).join(', '));
            ok('small_singleton_test first group has exclusive columns',
                (c0.perfectFeatures || []).length >= 1,
                'nPerfect=' + (c0.perfectFeatures || []).length);
        }
        const mask = BC.computeBiclusterMask(fa, {});
        const nullFinds = (mask.blocks || []).filter(b => b.kind !== 'conserved' && b.rows !== 'all' && b.coherence == null);
        ok('small_singleton_test bicluster no null-coherence find', nullFinds.length === 0,
            nullFinds.length + ' null-coh blocks');
        const ones = (mask.blocks || []).filter(b => Array.isArray(b.rows) && b.rows.length === 1);
        ok('small_singleton_test bicluster no 1-row group', ones.length === 0,
            ones.length + ' singleton rects');
    }

    console.log(lines.join('\n'));
    if (failed) {
        console.log('\n' + failed + ' failed');
        process.exit(1);
    }
    console.log('\nall guided small cases passed');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
