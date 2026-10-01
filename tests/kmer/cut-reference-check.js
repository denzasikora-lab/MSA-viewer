// GLM's slow reference for "groups after m merges" vs the product's qualifying() / partition(), on random trees.
const KT = require('../../kmer-tree.js'), ref = require('./cut_reference.js'), { simulate } = require('./sim.js'), { ari } = require('./metrics.js');
let bad = 0, cases = 0;
for (let c = 0; c < 60; c++) {
  const sim = simulate({ groups: 2 + c % 7, perGroup: 3 + c % 8, between: 0.1 + (c % 5) * 0.1, within: 0.02 + (c % 3) * 0.02, singletons: c % 6 }, 300 + c);
  const n = sim.seqs.length, t = KT.guideTree(sim.seqs, 6, { metric: c % 2 ? 'pdist' : 'jaccard' });
  for (const minSize of [1, 2, 3, 5]) {
    const Q = KT.qualifying(t.merges, n, minSize), R = ref.qualifyingCounts(t.merges, n, minSize);
    cases++;
    if (Q.length !== R.length || Q.some((v, i) => v !== R[i])) { bad++; console.log('Q differs', { c, minSize }); continue; }
    for (const g of [1, 2, 3, 5, 8]) {
      const r = ref.cutReference(t.merges, n, g, minSize);
      const p = KT.partition(t.merges, n, r.m, minSize);
      const lab = new Array(n).fill(-1); p.groups.forEach((gr, gi) => gr.forEach(i => { lab[i] = gi; })); p.unassigned.forEach(i => { lab[i] = 1000 + i; });
      const refLab = r.labels.map((l, i) => (r.unassigned.includes(i) ? 1000 + i : l));
      cases++;
      if (ari(lab, refLab) < 1 - 1e-9 || JSON.stringify(p.unassigned) !== JSON.stringify([...r.unassigned].sort((a, b) => a - b))) { bad++; console.log('partition differs', { c, minSize, g, m: r.m }); }
    }
  }
}
console.log(`${cases} comparisons with GLM's reference, ${bad} different`);
process.exit(bad ? 1 : 0);
