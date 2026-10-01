// Recovery of known groups by the PRODUCT code (kmer-tree.js), over simulated scenarios, for several k.
// Thresholds are the measured values minus a margin; a drop means the grouping got worse.
const KT = require('../../kmer-tree.js'), { simulate } = require('./sim.js'), { ari } = require('./metrics.js');
const MIN = 3;
const SCEN = [
  ['easy', { groups: 5, perGroup: 12, between: 0.20, within: 0.02 }],
  ['close', { groups: 5, perGroup: 12, between: 0.08, within: 0.02 }],
  ['diverged', { groups: 5, perGroup: 12, between: 0.50, within: 0.05 }],
  ['groups20', { groups: 20, perGroup: 8, between: 0.25, within: 0.02 }],
  ['two', { groups: 2, perGroup: 30, between: 0.15, within: 0.02 }],
  ['chunks', { groups: 6, perGroup: 15, between: 0.25, within: 0.04, truncate: 0.7, length: 800 }],
  ['singletons', { groups: 8, perGroup: 5, between: 0.40, within: 0.03, singletons: 60 }],
  ['dominant', { groups: 5, sizes: 'dominant', perGroup: 12, between: 0.20, within: 0.02 }],
  ['small30x3', { groups: 30, perGroup: 3, between: 0.30, within: 0.03 }],
  ['indel', { groups: 6, perGroup: 12, between: 0.10, within: 0.02, indel: 0.01 }],
  ['rna-lower', { groups: 5, perGroup: 12, between: 0.20, within: 0.02, rna: true, lowercase: 0.3 }],
  ['dups', { groups: 6, perGroup: 14, between: 0.20, within: 0.02, dupFraction: 0.6 }],
  ['chunks+single', { groups: 6, perGroup: 6, between: 0.35, within: 0.05, truncate: 0.8, singletons: 80, length: 700 }],
];
function truth(labels) { const c = new Map(); labels.forEach(l => c.set(l, (c.get(l) || 0) + 1)); return { lab: labels.map((l, i) => c.get(l) >= MIN ? 'g' + l : 'n' + i), G: [...c.values()].filter(v => v >= MIN).length }; }
function labelsOf(cut, n) { const out = new Array(n); cut.groups.forEach((g, gi) => g.forEach(i => { out[i] = 'g' + gi; })); cut.unassigned.forEach(i => { out[i] = 'u' + i; }); return out; }
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const cfgs = [
  // name, metric, ks, forced?, minimum mean ARI
  ['aligned columns, number of groups given', 'pdist', [6], true, 0.995],
  ['aligned columns, Auto', 'pdist', [6], false, 0.95],
  ['k-mer, number of groups given', 'jaccard', [4, 6, 8], true, 0.95],
  ['k-mer, Auto', 'jaccard', [4, 6, 8], false, 0.93],
];
let failed = 0;
for (const [name, metric, ks, forced, need] of cfgs) {
  const scores = [], bad = [];
  for (const [sn, p] of SCEN) for (let seed = 1; seed <= 2; seed++) {
    const sim = simulate(p, seed), n = sim.seqs.length, t = truth(sim.labels);
    for (const k of ks) {
      const tree = KT.guideTree(sim.seqs, k, { metric });
      const cut = KT.cutTree(tree, forced ? t.G : 'auto', MIN);
      const a = ari(t.lab, labelsOf(cut, n)); scores.push(a);
      if (a < 0.5) bad.push(`${sn}/seed${seed}/k${k}:${a.toFixed(2)}`);
    }
  }
  const m = mean(scores), ok = m >= need;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: mean ARI ${m.toFixed(3)} (need >= ${need})${bad.length ? '  worst: ' + bad.slice(0, 4).join(' ') : ''}`);
}
// file order must not matter: a shuffled copy gives the same partition
{
  const sim = simulate({ groups: 6, perGroup: 10, between: 0.2, within: 0.03, singletons: 15 }, 5), n = sim.seqs.length;
  const part = (seqs, k) => { const c = KT.cutTree(KT.guideTree(seqs, k, { metric: 'pdist' }), 'auto', MIN); return c.groups.map(g => g.map(i => seqs[i].header).sort().join('|')).sort().join('#'); };
  const idx = sim.seqs.map((_, i) => i); let x = 7; for (let i = n - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const same = part(sim.seqs, 6) === part(idx.map(i => sim.seqs[i]), 6);
  if (!same) failed++;
  console.log(`${same ? 'PASS' : 'FAIL'}  row order does not change the groups`);
}
process.exit(failed ? 1 : 0);
