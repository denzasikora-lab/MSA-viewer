// tests/kmer/cut_reference.js
//
// Deliberately SLOW AND OBVIOUS reference for choosing a cut of a UPGMA merge list,
// to check an optimised implementation (e.g. KmerTree.cutTree in kmer-tree.js) against.
//
// Specification
// -------------
//   merges  [{ i, j, d }] in merge order. UPGMA over n leaves; merge t joins the
//           clusters that currently contain leaf i and leaf j (t is 0-based).
//   n       number of leaves, 0 .. n-1.
//   groups  wanted number of groups, integer >= 1.
//   minSize a 'group' is a cluster with at least minSize leaves, integer >= 1.
//   Q(m)    number of groups after applying the first m merges (m in 0..merges.length).
//
//   qualifyingCounts(merges, n, minSize) -> [Q(0), Q(1), ..., Q(merges.length)]
//
//   cutReference(merges, n, groups, minSize) -> { m, labels, unassigned, reached }
//       m          the LARGEST number of applied merges with Q(m) == groups; if no m
//                  gives exactly `groups`, the m with the largest Q(m) (the smallest
//                  such m when several tie) and reached = false; else reached = true.
//       labels[i]  cluster id of leaf i after m merges (an integer; equal ids mean
//                  the two leaves are in the same cluster).
//       unassigned  sorted list of leaf indices in clusters with < minSize leaves.
//
// The whole point of this file is OBVIOUS correctness, not speed: for EVERY m it
// throws away all previous work and recomputes the clustering from scratch with a
// plain union-find, then counts sizes with a fresh linear scan (O(M^2) full
// recomputations). No incremental tricks, no caching, no early exits. If the
// optimised code disagrees with this, it is wrong -- assuming this file is not.
//
// UMD like the rest of the k-mer code: Node (module.exports) or browser (global).
// Run it directly for a built-in self-check on hand-computed examples:
//     node tests/kmer/cut_reference.js

(function (root) {
    'use strict';

    // Clustering of the n leaves after applying exactly the first `m` merges.
    // Rebuilt from scratch from an empty union-find every time it is called.
    // Cluster ids are 0, 1, ... in order of first appearance in leaf order, so two
    // leaves have the same id iff they are in the same cluster.
    function clustersAfter(merges, n, m) {
        const apply = Math.min(m, merges.length);
        const parent = new Array(n);
        for (let i = 0; i < n; i++) parent[i] = i;
        const find = function (x) {
            while (parent[x] !== x) x = parent[x]; // no path compression: keep it dumb
            return x;
        };
        for (let t = 0; t < apply; t++) {
            const step = merges[t];
            const ri = find(step.i), rj = find(step.j);
            if (ri !== rj) parent[rj] = ri; // a redundant merge changes nothing
        }
        const labels = new Array(n);
        const id = new Map();
        let next = 0;
        for (let i = 0; i < n; i++) {
            const r = find(i);
            if (!id.has(r)) id.set(r, next++);
            labels[i] = id.get(r);
        }
        return labels;
    }

    // Size of each cluster, keyed by the cluster id used in `labels`.
    function clusterSizes(labels) {
        const sizes = new Map();
        for (let i = 0; i < labels.length; i++) {
            const c = labels[i];
            sizes.set(c, (sizes.get(c) || 0) + 1);
        }
        return sizes;
    }

    // [Q(0) .. Q(merges.length)], every entry computed independently, from scratch.
    function qualifyingCounts(merges, n, minSize) {
        const min = Math.max(1, Math.floor(Number(minSize) || 1));
        const counts = [];
        for (let m = 0; m <= merges.length; m++) {
            const labels = clustersAfter(merges, n, m);
            const sizes = clusterSizes(labels);
            let q = 0;
            sizes.forEach(function (s) { if (s >= min) q++; });
            counts.push(q);
        }
        return counts;
    }

    // The cut. Part (a) scans for the last exact hit; part (b) is the fallback for a
    // group count that is never reached. Both simply read off the recomputed counts.
    function cutReference(merges, n, groups, minSize) {
        const want = Math.max(1, Math.floor(Number(groups) || 1));
        const min = Math.max(1, Math.floor(Number(minSize) || 1));
        const counts = qualifyingCounts(merges, n, min);

        // (a) the LARGEST m with Q(m) == groups (ascending scan, last hit wins)
        let m = 0, reached = false;
        for (let t = 0; t < counts.length; t++) if (counts[t] === want) { m = t; reached = true; }
        // (b) never exactly `groups`: the largest Q(m) wins; strict '>' keeps the
        //     FIRST (smallest) m when several tie.
        if (!reached) {
            let bestQ = -1;
            for (let t = 0; t < counts.length; t++) if (counts[t] > bestQ) { bestQ = counts[t]; m = t; }
        }

        const labels = clustersAfter(merges, n, m);
        const sizes = clusterSizes(labels);
        const unassigned = [];
        for (let i = 0; i < n; i++) if (sizes.get(labels[i]) < min) unassigned.push(i);
        unassigned.sort(function (a, b) { return a - b; });
        return { m: m, labels: labels, unassigned: unassigned, reached: reached };
    }

    const api = { cutReference: cutReference, qualifyingCounts: qualifyingCounts };

    // ---------------------------------------------------------------------------
    // Self-check on small, hand-computed examples (run this file directly).
    if (typeof module !== 'undefined' && typeof require !== 'undefined' && require.main === module) {
        const MERGES4 = [{ i: 0, j: 1, d: 0.1 }, { i: 2, j: 3, d: 0.2 }, { i: 0, j: 2, d: 0.9 }];
        const MERGES5 = [{ i: 0, j: 1, d: 0.1 }, { i: 2, j: 3, d: 0.2 }, { i: 0, j: 2, d: 0.5 }];
        let failed = 0;
        const same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
        const is = function (name, ok) { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

        // 4 leaves, 2 pairs: with minSize 2, Q(m) = 0,1,2,1
        is('Q(m; n=4, min=2) = [0,1,2,1]', same(qualifyingCounts(MERGES4, 4, 2), [0, 1, 2, 1]));
        // exact hit for 2 groups: the LAST m with Q = 2 is m = 2, everyone in a group
        let r = cutReference(MERGES4, 4, 2, 2);
        is('cut(2 groups, min 2) -> m=2, reached, labels [0,0,1,1]',
            r.reached === true && r.m === 2 && same(r.labels, [0, 0, 1, 1]) && same(r.unassigned, []));
        // 3 groups can never be reached: best is the largest Q = 2, smallest m = 2
        r = cutReference(MERGES4, 4, 3, 2);
        is('cut(3 groups, min 2) -> fallback m=2, reached=false',
            r.reached === false && r.m === 2 && same(r.labels, [0, 0, 1, 1]));
        // minSize 1 counts every cluster: Q(m) = 4,3,2,1
        is('Q(m; n=4, min=1) = [4,3,2,1]', same(qualifyingCounts(MERGES4, 4, 1), [4, 3, 2, 1]));
        r = cutReference(MERGES4, 4, 3, 1);
        is('cut(3 groups, min 1) -> m=1, labels [0,0,1,2]',
            r.reached === true && r.m === 1 && same(r.labels, [0, 0, 1, 2]) && same(r.unassigned, []));
        // a 5th lone leaf is in the clustering but never in a group of size 2
        is('Q(m; n=5, min=2) = [0,1,2,1]',
            same(data = undefined) && same(qualifyingCounts(MERGES5, 5, 2), [0, 1, 2, 1]));
        r = cutReference(MERGES5, 5, 2, 2);
        is('cut(n=5, 2 groups, min 2) -> m=2, leaf 4 unassigned',
            r.reached === true && r.m === 2 && same(r.unassigned, [4]) && same(r.labels, [0, 0, 1, 1, 2]));
        // n = 1, empty merge list: the single cluster of 1 IS a group when minSize = 1
        is('Q(m; n=1, min=1) = [1]', same(qualifyingCounts([], 1, 1), [1]));
        r = cutReference([], 1, 1, 1);
        is('cut(n=1, 1 group) -> m=0, reached, no unassigned',
            r.reached === true && r.m === 0 && same(r.labels, [0]) && same(r.unassigned, []));
        // redundant merges (same pair again) must not corrupt anything
        const redundant = [{ i: 0, j: 1, d: 0.1 }, { i: 0, j: 1, d: 0.1 }, { i: 0, j: 1, d: 0.1 }];
        is('Q(m; n=2, min=2, repeated merge) = [0,1,1,1]', same(qualifyingCounts(redundant, 2, 2), [0, 1, 1, 1]));

        if (failed) { console.error(failed + ' self-check(s) FAILED'); process.exitCode = 1; }
        else console.log('all self-checks passed');
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.CutReference = api;
})(typeof window !== 'undefined' ? window : this);
