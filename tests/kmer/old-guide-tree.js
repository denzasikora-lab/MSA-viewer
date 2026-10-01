// The ORIGINAL k-mer guide tree (script.js at v222, before kmer-tree.js), frozen here as the reference
// that kmer-tree.js must reproduce exactly. Do not edit.
function _kmerGuideTree(seqs, k) {
    const n = seqs.length;
    const K = (Number.isFinite(k) && k >= 3 && k <= 12) ? (k | 0) : 6;
    const merges = [];

    // Build k-mer frequency vectors for each sequence
    const kmerVecs = [];
    for (const s of seqs) {
        // U counts as T: RNA used to lose every U here, leaving little or no k-mer profile
        const clean = s.seq.toUpperCase().replace(/U/g, 'T').replace(/[^ACGT]/g, '');
        const counts = new Map();
        for (let i = 0; i <= clean.length - K; i++) {
            const kmer = clean.substring(i, i + K);
            counts.set(kmer, (counts.get(kmer) || 0) + 1);
        }
        kmerVecs.push(counts);
    }

    // Compute pairwise distances using shared k-mer fraction (1 - jaccard-like)
    const dist = Array.from({ length: n }, () => new Float32Array(n));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = kmerVecs[i], b = kmerVecs[j];
            let shared = 0, total = 0;
            const allKmers = new Set([...a.keys(), ...b.keys()]);
            for (const km of allKmers) {
                const ca = a.get(km) || 0, cb = b.get(km) || 0;
                shared += Math.min(ca, cb);
                total += Math.max(ca, cb);
            }
            const d = total > 0 ? 1 - shared / total : 1;
            dist[i][j] = d;
            dist[j][i] = d;
        }
    }

    // UPGMA guide tree construction -> extract leaf order
    // Represent clusters as arrays of leaf indices; merge closest pair
    const clusters = seqs.map((_, i) => [i]);
    const clusterDist = dist.map(row => new Float32Array(row)); // copy
    const active = new Uint8Array(n).fill(1);

    for (let step = 0; step < n - 1; step++) {
        // Find closest pair of active clusters
        let minD = Infinity, ci = -1, cj = -1;
        for (let i = 0; i < n; i++) {
            if (!active[i]) continue;
            for (let j = i + 1; j < n; j++) {
                if (!active[j]) continue;
                if (clusterDist[i][j] < minD) {
                    minD = clusterDist[i][j];
                    ci = i; cj = j;
                }
            }
        }
        if (ci < 0) break;

        // Optimal leaf ordering at junction: try all 4 orientations of the two
        // clusters and pick the one where the junction elements are closest.
        // A=[...aL, aR] B=[...bL, bR] -> try (A+B), (A+B'), (A'+B), (A'+B')
        // where A' = reversed A, B' = reversed B
        const cA = clusters[ci], cB = clusters[cj];
        const aFirst = cA[0], aLast = cA[cA.length - 1];
        const bFirst = cB[0], bLast = cB[cB.length - 1];
        // Junction distances for each orientation:
        const opts = [
            { d: dist[aLast][bFirst],  revA: false, revB: false }, // A + B
            { d: dist[aLast][bLast],   revA: false, revB: true  }, // A + B'
            { d: dist[aFirst][bFirst], revA: true,  revB: false }, // A' + B
            { d: dist[aFirst][bLast],  revA: true,  revB: true  }, // A' + B'
        ];
        opts.sort((a, b) => a.d - b.d);
        const best = opts[0];
        const orderedA = best.revA ? [...cA].reverse() : cA;
        const orderedB = best.revB ? [...cB].reverse() : cB;
        clusters[ci] = orderedA.concat(orderedB);
        active[cj] = 0;
        merges.push({ i: ci, j: cj, d: minD });

        // Update distances (average linkage / UPGMA)
        const sizeI = orderedA.length, sizeJ = orderedB.length;
        for (let k = 0; k < n; k++) {
            if (!active[k] || k === ci) continue;
            const newD = (clusterDist[ci][k] * sizeI + clusterDist[cj][k] * sizeJ) / (sizeI + sizeJ);
            clusterDist[ci][k] = newD;
            clusterDist[k][ci] = newD;
        }
    }

    // Find the last active cluster - its leaf order is the guide tree order
    const finalCluster = clusters.find((_, i) => active[i]) || clusters[0];
    return { order: finalCluster, merges, k: K };
}
module.exports = { oldGuideTree: _kmerGuideTree };
