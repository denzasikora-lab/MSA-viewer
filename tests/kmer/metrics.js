// Scoring for group recovery.
function comb2(n) { return n * (n - 1) / 2; }
// Adjusted Rand index between two labelings (arrays of any labels). 1 = identical partitions, ~0 = random.
function ari(a, b) {
    const n = a.length; if (n < 2) return 1;
    const ta = new Map(), tb = new Map(), tab = new Map();
    for (let i = 0; i < n; i++) {
        ta.set(a[i], (ta.get(a[i]) || 0) + 1); tb.set(b[i], (tb.get(b[i]) || 0) + 1);
        const k = a[i] + '\u0001' + b[i]; tab.set(k, (tab.get(k) || 0) + 1);
    }
    let sumAB = 0, sumA = 0, sumB = 0;
    tab.forEach(v => { sumAB += comb2(v); }); ta.forEach(v => { sumA += comb2(v); }); tb.forEach(v => { sumB += comb2(v); });
    const expected = sumA * sumB / comb2(n), max = (sumA + sumB) / 2;
    return max === expected ? 1 : (sumAB - expected) / (max - expected);
}
// Same partition (labels may differ)?
function samePartition(a, b) { return ari(a, b) > 1 - 1e-12 && new Set(a).size === new Set(b).size; }
// Labels from the first (n - target) merges of a merge list
function cutLabels(merges, n, target) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const apply = Math.max(0, Math.min(n - target, merges.length));
    for (let m = 0; m < apply; m++) { const ri = find(merges[m].i), rj = find(merges[m].j); if (ri !== rj) parent[rj] = ri; }
    return Array.from({ length: n }, (_, i) => find(i));
}
module.exports = { ari, samePartition, cutLabels };
