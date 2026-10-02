// k-mer guide tree and its cuts: the pure part of "Group by k-mer" and "Reorder by similarity".
// No DOM: runs in the browser (window.KmerTree) and in Node (module.exports), so it can be tested
// against ground truth without a browser. See tests/kmer/.
//
//   KmerTree.guideTree(seqs, k)             -> { order, merges: [{ i, j, d }], k }
//   KmerTree.cutTree(seqs, groups, k, min)  -> { groups, unassigned, cutHeight, ... }
//   KmerTree.profiles / distanceMatrix      -> the building blocks
//
// seqs: [{ seq }] (alignment gaps and non-ACGT characters are ignored; U counts as T).
(function (root) {
    'use strict';

    const K_MIN = 3, K_MAX = 12;

    function normK(k) { return (Number.isFinite(k) && k >= K_MIN && k <= K_MAX) ? (k | 0) : 6; }

    const CODE = new Int8Array(128).fill(-1);
    CODE[65] = 0; CODE[97] = 0;      // A
    CODE[67] = 1; CODE[99] = 1;      // C
    CODE[71] = 2; CODE[103] = 2;     // G
    CODE[84] = 3; CODE[116] = 3;     // T
    CODE[85] = 3; CODE[117] = 3;     // U counts as T

    // Sorted k-mer codes with their counts, over the sequence with everything but A/C/G/T/U removed
    // (so a k-mer can span a removed gap, exactly as the original string-based code did).
    function profile(seq, k, canonical) {
        k = normK(k);          // an out-of-range k would make the 2-bit shifts wrap
        const mask = (1 << (2 * k)) - 1;      // k <= 12 -> 24 bits
        const codes = [];
        let h = 0, r = 0, len = 0;
        const shift = 2 * (k - 1);
        for (let i = 0; i < seq.length; i++) {
            const c = seq.charCodeAt(i);
            const v = c < 128 ? CODE[c] : -1;
            if (v < 0) continue;
            h = ((h << 2) | v) & mask;
            if (canonical) r = (r >>> 2) | ((3 - v) << shift);   // reverse complement of the same window (A,C,G,T = 0..3)
            if (++len >= k) codes.push(canonical && r < h ? r : h);
        }
        codes.sort((a, b) => a - b);
        const kmers = [], counts = [];
        for (let i = 0; i < codes.length;) {
            let j = i + 1;
            while (j < codes.length && codes[j] === codes[i]) j++;
            kmers.push(codes[i]); counts.push(j - i);
            i = j;
        }
        return { kmers: Int32Array.from(kmers), counts: Int32Array.from(counts), total: codes.length };
    }

    function profiles(seqs, k, canonical) {
        k = normK(k);
        return seqs.map(s => profile(s.seq, k, canonical));
    }

    // Weighted Jaccard distance on k-mer counts: 1 - sum(min) / sum(max). Stored as Float32, as the
    // original code did, so ties and orderings are unchanged.
    function distanceMatrix(profs) {
        const n = profs.length;
        const dist = Array.from({ length: n }, () => new Float32Array(n));
        for (let i = 0; i < n; i++) {
            const a = profs[i];
            for (let j = i + 1; j < n; j++) {
                const b = profs[j];
                let p = 0, q = 0, shared = 0;
                const ak = a.kmers, bk = b.kmers, ac = a.counts, bc = b.counts;
                while (p < ak.length && q < bk.length) {
                    const x = ak[p], y = bk[q];
                    if (x === y) { shared += ac[p] < bc[q] ? ac[p] : bc[q]; p++; q++; }
                    else if (x < y) p++; else q++;
                }
                const total = a.total + b.total - shared;
                const d = total > 0 ? 1 - shared / total : 1;
                dist[i][j] = d; dist[j][i] = d;
            }
        }
        return dist;
    }

    // UPGMA (average linkage) with the original tie-breaking: the closest pair is the first one found
    // scanning i then j in index order with a strict "<". A cached nearest neighbour per row keeps
    // that rule while making the search O(n) per merge instead of O(n^2).
    function upgma(dist, n, single) {
        const clusters = Array.from({ length: n }, (_, i) => [i]);
        const cd = dist.map(row => new Float32Array(row));
        const active = new Uint8Array(n).fill(1);
        const merges = [];
        const nnJ = new Int32Array(n).fill(-1);       // nearest active j > i
        const nnD = new Float64Array(n).fill(Infinity);
        const scanRow = (i) => {
            let best = Infinity, bj = -1;
            const row = cd[i];
            for (let j = i + 1; j < n; j++) {
                if (!active[j]) continue;
                if (row[j] < best) { best = row[j]; bj = j; }
            }
            nnD[i] = best; nnJ[i] = bj;
        };
        for (let i = 0; i < n; i++) scanRow(i);

        for (let step = 0; step < n - 1; step++) {
            let minD = Infinity, ci = -1;
            for (let i = 0; i < n; i++) {
                if (!active[i] || nnJ[i] < 0) continue;
                if (nnD[i] < minD) { minD = nnD[i]; ci = i; }
            }
            if (ci < 0) break;
            const cj = nnJ[ci];

            const cA = clusters[ci], cB = clusters[cj];
            const aFirst = cA[0], aLast = cA[cA.length - 1];
            const bFirst = cB[0], bLast = cB[cB.length - 1];
            const opts = [
                { d: dist[aLast][bFirst], revA: false, revB: false },
                { d: dist[aLast][bLast], revA: false, revB: true },
                { d: dist[aFirst][bFirst], revA: true, revB: false },
                { d: dist[aFirst][bLast], revA: true, revB: true },
            ];
            opts.sort((x, y) => x.d - y.d);
            const best = opts[0];
            const orderedA = best.revA ? [...cA].reverse() : cA;
            const orderedB = best.revB ? [...cB].reverse() : cB;
            clusters[ci] = orderedA.concat(orderedB);
            active[cj] = 0;
            merges.push({ i: ci, j: cj, d: minD });

            const sizeI = orderedA.length, sizeJ = orderedB.length;
            for (let k = 0; k < n; k++) {
                if (!active[k] || k === ci) continue;
                const newD = single ? Math.min(cd[ci][k], cd[cj][k]) : (cd[ci][k] * sizeI + cd[cj][k] * sizeJ) / (sizeI + sizeJ);   // single: nearest member (chains through overlaps)
                cd[ci][k] = newD;
                cd[k][ci] = newD;
            }
            // refresh the cached neighbours that the merge can have changed
            scanRow(ci);
            for (let i = 0; i < n; i++) {
                if (!active[i] || i === ci) continue;
                if (nnJ[i] === ci || nnJ[i] === cj) { scanRow(i); continue; }
                if (i < ci) {
                    const v = cd[i][ci];
                    // a strictly smaller value, or an equal one at a lower index than the cached j, wins
                    if (v < nnD[i] || (v === nnD[i] && ci < nnJ[i])) { nnD[i] = v; nnJ[i] = ci; }
                }
            }
        }
        const final = clusters.find((_, i) => active[i]) || clusters[0];
        return { order: final, merges };
    }

    // ---- alignment-based distance ----------------------------------------------------------
    // 'pdist': p-distance over the columns where both sequences have a base (A/C/G/T/U), scaled so
    // that unrelated sequences (p = 0.75) are 1. It uses the alignment, so it does not depend on k and
    // is not thrown off by sequences that cover different parts of the alignment (chunks, truncated
    // copies). A pair that shares too few columns is given the saturated value 1. Needs equal-length rows.
    function pDistanceMatrix(seqs, minOverlap) {
        const n = seqs.length, L = Math.max(0, ...seqs.map(s => s.seq.length));
        const need = minOverlap || Math.min(L, Math.min(30, Math.max(5, Math.ceil(L * 0.1))));
        const M = seqs.map(s => { const a = new Int8Array(L).fill(-1); for (let i = 0; i < s.seq.length; i++) { const c = s.seq.charCodeAt(i); a[i] = c < 128 ? CODE[c] : -1; } return a; });
        const dist = Array.from({ length: n }, () => new Float32Array(n));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = M[i], b = M[j]; let both = 0, diff = 0;
            for (let c = 0; c < L; c++) { const x = a[c], y = b[c]; if (x < 0 || y < 0) continue; both++; if (x !== y) diff++; }
            const d = both >= need ? Math.min(0.75, diff / both) / 0.75 : 1;
            dist[i][j] = d; dist[j][i] = d;
        }
        return dist;
    }

    // true when every row has the same length (an alignment), which is what 'pdist' needs
    function isAligned(seqs) { return seqs.length > 1 && seqs.every(s => s.seq.length === seqs[0].seq.length); }

    function guideTree(seqs, k, opts) {
        const K = normK(k);
        const n = seqs.length;
        let metric = (opts && opts.metric) || 'jaccard';
        if (metric === 'pdist' && !isAligned(seqs)) metric = 'jaccard';        // needs an alignment
        const dist = metric === 'pdist' ? pDistanceMatrix(seqs) : distanceMatrix(profiles(seqs, K, !!(opts && opts.canonical)));
        const t = upgma(dist, n, !!(opts && opts.linkage === 'single'));
        return { order: t.order, merges: t.merges, k: K, dist, metric, n, linkage: opts && opts.linkage === 'single' ? 'single' : 'average' };
    }

    // ---- cutting the tree -----------------------------------------------------------------------
    // After m merges a "group" is a cluster with at least minSize leaves; Q[m] counts them.
    function qualifying(merges, n, minSize) {
        const parent = Array.from({ length: n }, (_, i) => i), size = new Array(n).fill(1);
        const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
        const Q = new Int32Array(merges.length + 1);
        let q = minSize <= 1 ? n : 0; Q[0] = q;
        for (let m = 0; m < merges.length; m++) {
            const ra = find(merges[m].i), rb = find(merges[m].j);
            if (ra !== rb) {
                const before = (size[ra] >= minSize ? 1 : 0) + (size[rb] >= minSize ? 1 : 0);
                parent[rb] = ra; size[ra] += size[rb];
                q += (size[ra] >= minSize ? 1 : 0) - before;
            }
            Q[m + 1] = q;
        }
        return Q;
    }

    function partition(merges, n, m, minSize) {
        const parent = Array.from({ length: n }, (_, i) => i), size = new Array(n).fill(1);
        const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
        for (let i = 0, M = Math.min(m, merges.length); i < M; i++) { const ra = find(merges[i].i), rb = find(merges[i].j); if (ra !== rb) { parent[rb] = ra; size[ra] += size[rb]; } }
        const byRoot = new Map();
        for (let i = 0; i < n; i++) { const r = find(i); if (!byRoot.has(r)) byRoot.set(r, []); byRoot.get(r).push(i); }
        const all = [...byRoot.values()].sort((a, b) => b.length - a.length || a[0] - b[0]);
        return { groups: all.filter(g => g.length >= minSize), unassigned: all.filter(g => g.length < minSize).flat().sort((a, b) => a - b) };
    }

    // runs of consecutive cuts with the same Q, and how far up the tree each one lasts
    function runsOf(Q) {
        const runs = [];
        for (let a = 0; a < Q.length;) { let b = a; while (b + 1 < Q.length && Q[b + 1] === Q[a]) b++; runs.push({ v: Q[a], a, b }); a = b + 1; }
        return runs;
    }
    function runBounds(merges, run) {
        const lo = run.a === 0 ? 0 : merges[run.a - 1].d;
        if (!merges.length) return { lo: 0, hi: 0, span: 0 };          // one sequence: no merges
        const hi = run.b >= merges.length ? merges[merges.length - 1].d : merges[run.b].d;
        return { lo, hi, span: Math.max(0, hi - lo) };
    }

    // Choose the cut. groups: 'auto' or a number of groups wanted (each with >= minSize sequences).
    // A count is judged by how long it persists as the cut height rises: the most persistent run of
    // cuts with that count wins (for 'auto', over every count >= 2), and the cut is made in the middle of
    // it by height. So a member that joins late is kept and a far outlier is not swallowed, and one
    // large jump at the root cannot decide the answer.
    function cutTree(tree, groups, minSize) {
        const merges = tree.merges, n = tree.n != null ? tree.n : merges.length + 1;
        minSize = Math.max(1, Math.min(minSize | 0 || 1, Math.max(1, n)));
        const auto = groups == null || groups === 'auto';
        const Q = qualifying(merges, n, minSize);
        const runs = runsOf(Q);
        const total = merges.length ? Math.max(1e-12, merges[merges.length - 1].d) : 1;
        const info = r => { const b = runBounds(merges, r); return { groups: r.v, from: b.lo, to: b.hi, span: b.span, share: b.span / total }; };

        let target = auto ? null : Math.max(1, Math.min(groups | 0, n));
        let pick = null, reached = true;
        // every merge at height 0: the sequences are identical, which is one group, not n of one
        const identical = auto && merges.length > 0 && merges[merges.length - 1].d <= 1e-12;
        const pool = identical ? [runs[runs.length - 1]] : auto ? runs.filter(r => r.v >= 2) : runs.filter(r => r.v === target);
        pool.forEach(r => { const s = runBounds(merges, r).span; if (!pick || s > pick.s) pick = { r, s }; });
        if (!pick) {
            // auto without any count >= 2, or a number that never occurs: take the cut with the most groups
            reached = false;
            let best = runs[0]; runs.forEach(r => { if (r.v > best.v) best = r; });
            pick = { r: best, s: runBounds(merges, best).span };
        }
        target = pick.r.v;
        const b = runBounds(merges, pick.r);
        const mid = (b.lo + b.hi) / 2;
        let m = pick.r.a;
        while (m < pick.r.b && merges[m].d <= mid) m++;
        const part = partition(merges, n, m, minSize);

        const alternatives = pool.filter(r => r !== pick.r && r.v !== pick.r.v)
            .map(info).sort((x, y) => y.span - x.span)
            .filter((x, i, arr) => arr.findIndex(y => y.groups === x.groups) === i).slice(0, 3);

        const warnings = [];
        const tops = part.groups.length ? part.groups[0].length : 0;
        if (auto && part.groups.length <= 2 && tops > 0.8 * n && n >= 10) warnings.push('one-giant-group');
        if (!reached && !auto) warnings.push('fewer-groups-than-asked');
        if (tree.metric === 'jaccard' && tree.dist) {
            // share of pairs with (almost) no k-mers in common: k is too long for this divergence
            let sat = 0, cnt = 0;
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { cnt++; if (tree.dist[i][j] >= 0.999) sat++; }
            if (cnt && sat / cnt > 0.5) warnings.push('k-too-long');
        }
        return {
            groups: part.groups, unassigned: part.unassigned, target, reached, auto, minSize,
            cutHeight: mid, merges: m, plateau: info(pick.r), alternatives, warnings,
            k: tree.k, metric: tree.metric
        };
    }

    const api = { K_MIN, K_MAX, normK, profile, profiles, distanceMatrix, pDistanceMatrix, isAligned, upgma, guideTree, qualifying, partition, cutTree };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.KmerTree = api;
})(typeof window !== 'undefined' ? window : this);
