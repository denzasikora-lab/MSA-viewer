// Cut strategies for a UPGMA merge list, for benchmarking. A cut is { labels, unassigned:Set, target, cutHeight }.
// merges: [{i, j, d}] in merge order (d non-decreasing up to ties and float noise). n leaves.

function unionFind(n) {
    const parent = Array.from({ length: n }, (_, i) => i), size = new Array(n).fill(1);
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const union = (a, b) => { a = find(a); b = find(b); if (a === b) return; parent[b] = a; size[a] += size[b]; };
    return { find, union, size };
}

// Q[m] = number of clusters with >= minSize leaves after m merges (m = 0..merges.length)
function qualifying(merges, n, minSize) {
    const uf = unionFind(n), Q = new Int32Array(merges.length + 1);
    let q = minSize <= 1 ? n : 0; Q[0] = q;
    for (let m = 0; m < merges.length; m++) {
        const ra = uf.find(merges[m].i), rb = uf.find(merges[m].j);
        if (ra !== rb) {
            const before = (uf.size[ra] >= minSize ? 1 : 0) + (uf.size[rb] >= minSize ? 1 : 0);
            uf.union(ra, rb);
            q += (uf.size[uf.find(ra)] >= minSize ? 1 : 0) - before;
        }
        Q[m + 1] = q;
    }
    return Q;
}

function applyMerges(merges, n, m, minSize) {
    const uf = unionFind(n);
    for (let i = 0; i < m; i++) uf.union(merges[i].i, merges[i].j);
    const labels = Array.from({ length: n }, (_, i) => uf.find(i));
    const unassigned = new Set();
    for (let i = 0; i < n; i++) if (uf.size[uf.find(i)] < minSize) unassigned.add(i);
    return { labels, unassigned };
}

// The partition as a labeling for scoring: unassigned leaves each get their own label
function scoreLabels(cut, n) { return cut.labels.map((l, i) => cut.unassigned.has(i) ? 'u' + i : 'g' + l); }

// ---- forced number of groups ------------------------------------------------------------------
// 'coarsest': the cut with the most merges that still has exactly `groups` qualifying clusters (the old rule)
function forcedCoarsest(merges, n, groups, minSize) {
    const Q = qualifying(merges, n, minSize);
    let m = -1, bestQ = -1, bestM = 0;
    for (let i = 0; i < Q.length; i++) { if (Q[i] === groups) m = i; if (Q[i] > bestQ) { bestQ = Q[i]; bestM = i; } }
    const use = m >= 0 ? m : bestM;
    return Object.assign(applyMerges(merges, n, use, minSize), { target: groups, m: use, reached: m >= 0, cutHeight: use ? merges[use - 1].d : 0 });
}

// persistence of a run of cuts [a..b] with Q == v: height span from the merge that created it to the
// merge that ends it (the next merge height), in linear or log scale
function spanOf(merges, a, b, scale) {
    const h0 = a === 0 ? 0 : merges[a - 1].d;
    const h1 = b >= merges.length ? merges[merges.length - 1].d * 1.0001 + 1e-9 : merges[b].d;      // merge b (0-based) ends the run
    if (scale === 'log') { const e = 1e-3; return Math.log((h1 + e) / (h0 + e)); }
    return Math.max(0, h1 - h0);
}

function runsOf(Q) {
    const runs = [];
    for (let a = 0; a < Q.length;) { let b = a; while (b + 1 < Q.length && Q[b + 1] === Q[a]) b++; runs.push({ v: Q[a], a, b }); a = b + 1; }
    return runs;
}

// 'plateau': among the runs of cuts with exactly `groups` qualifying clusters, take the most persistent
// and cut in the middle of it (by height), so members that join late are kept and far outliers are not absorbed
function forcedPlateau(merges, n, groups, minSize, scale = 'lin') {
    const Q = qualifying(merges, n, minSize);
    const runs = runsOf(Q).filter(r => r.v === groups);
    if (!runs.length) return forcedCoarsest(merges, n, groups, minSize);
    let best = null, bs = -1;
    runs.forEach(r => { const s = spanOf(merges, r.a, r.b, scale); if (s > bs) { bs = s; best = r; } });
    return cutInRun(merges, n, best, minSize, groups, scale);
}

function cutInRun(merges, n, run, minSize, target, scale) {
    const h0 = run.a === 0 ? 0 : merges[run.a - 1].d;
    const h1 = run.b >= merges.length ? merges[merges.length - 1].d : merges[run.b].d;
    const mid = scale === 'log' ? Math.sqrt((h0 + 1e-3) * (h1 + 1e-3)) - 1e-3 : (h0 + h1) / 2;
    let m = run.a;
    while (m < run.b && merges[m].d <= mid) m++;
    return Object.assign(applyMerges(merges, n, m, minSize), { target, m, reached: true, cutHeight: mid });
}

// ---- automatic number of groups ---------------------------------------------------------------
// the existing estimator (largest absolute gap, cap of 15): returns a TARGET over all clusters
function estOld(merges, n) {
    const dists = merges.map(x => x.d), maxK = Math.min(15, Math.max(2, n - 1));
    if (!n || n < 3 || !dists.length) return Math.min(4, Math.max(2, n || 2));
    const cand = [];
    for (let m = 0; m < dists.length; m++) { const kAfter = n - (m + 1); if (kAfter < 2 || kAfter > maxK) continue; const d0 = dists[m], d1 = m + 1 < dists.length ? dists[m + 1] : d0; cand.push({ k: kAfter, gap: d1 - d0 }); }
    if (!cand.length) return Math.min(4, maxK);
    let maxGap = 0; cand.forEach(c => { if (c.gap > maxGap) maxGap = c.gap; });
    if (maxGap <= 0) return Math.min(4, maxK);
    const prominent = cand.filter(c => c.gap >= maxGap * 0.5).sort((a, b) => b.k - a.k);
    return prominent[0].k;
}
function autoOld(merges, n, minSize) {
    const t = estOld(merges, n);
    const c = applyMerges(merges, n, Math.max(0, Math.min(n - t, merges.length)), minSize);   // the app's behaviour: n - target merges, then small ones set aside
    return Object.assign(c, { target: t, m: n - t, reached: true, cutHeight: 0 });
}

// 'persist': the qualifying-group count (>= minGroups) that stays the same over the widest height range
function autoPersist(merges, n, minSize, scale = 'lin', minGroups = 2) {
    const Q = qualifying(merges, n, minSize);
    let best = null, bs = -1;
    runsOf(Q).forEach(r => { if (r.v < minGroups) return; const s = spanOf(merges, r.a, r.b, scale); if (s > bs) { bs = s; best = r; } });
    if (!best) return Object.assign(applyMerges(merges, n, merges.length, minSize), { target: 1, m: merges.length, reached: false, cutHeight: 0 });
    return cutInRun(merges, n, best, minSize, best.v, scale);
}

// 'sil': the number of groups with the best mean silhouette (needs the distance matrix)
function silhouette(dist, labels, n) {
    const groups = new Map(); labels.forEach((l, i) => { if (!groups.has(l)) groups.set(l, []); groups.get(l).push(i); });
    if (groups.size < 2) return -1;
    let total = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
        const own = groups.get(labels[i]); if (own.length < 2) continue;
        let a = 0; own.forEach(j => { if (j !== i) a += dist[i][j]; }); a /= (own.length - 1);
        let b = Infinity;
        groups.forEach((mem, l) => { if (l === labels[i]) return; let s = 0; mem.forEach(j => { s += dist[i][j]; }); b = Math.min(b, s / mem.length); });
        total += (b - a) / Math.max(a, b, 1e-12); cnt++;
    }
    return cnt ? total / cnt : -1;
}
function autoSilhouette(merges, n, minSize, dist, maxG = 60) {
    let best = null, bs = -2;
    const Q = qualifying(merges, n, minSize);
    const seen = new Set();
    for (let g = 2; g <= Math.min(maxG, n - 1); g++) {
        const c = forcedPlateau(merges, n, g, minSize);
        if (!c.reached) continue;
        const key = c.m; if (seen.has(key)) continue; seen.add(key);
        // silhouette over the assigned leaves only
        const idx = []; for (let i = 0; i < n; i++) if (!c.unassigned.has(i)) idx.push(i);
        if (idx.length < 3) continue;
        const lab = idx.map(i => c.labels[i]);
        const sub = idx.map(i => idx.map(j => dist[i][j]));
        const s = silhouette(sub, lab, idx.length);
        if (s > bs) { bs = s; best = c; }
    }
    return best || autoPersist(merges, n, minSize);
}

module.exports = { qualifying, applyMerges, scoreLabels, forcedCoarsest, forcedPlateau, autoOld, autoPersist, autoSilhouette, estOld, runsOf, spanOf };
