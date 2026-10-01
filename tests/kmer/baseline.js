// Baseline: how well does the CURRENT method recover simulated groups, per k?
const KT = require('../../kmer-tree.js'), { simulate } = require('./sim.js'), { ari, cutLabels } = require('./metrics.js');
const fs = require('fs');
// the current estimator, copied from cluster.js
const cl = fs.readFileSync(require('path').join(__dirname, '../../cluster.js'), 'utf8');
const m = cl.indexOf('static suggestGroupCount'); let d = 0, st = cl.indexOf('{', m), en;
for (let j = st; j < cl.length; j++) { if (cl[j] === '{') d++; else if (cl[j] === '}') { d--; if (!d) { en = j; break; } } }
const suggest = new Function('return function' + cl.slice(m + 'static suggestGroupCount'.length, en + 1))();
const SCEN = [
  ['easy 5x12',        { groups: 5, perGroup: 12, between: 0.20, within: 0.02 }],
  ['close groups',     { groups: 5, perGroup: 12, between: 0.08, within: 0.02 }],
  ['diverged',         { groups: 5, perGroup: 12, between: 0.40, within: 0.05 }],
  ['many groups (20)', { groups: 20, perGroup: 8, between: 0.20, within: 0.02 }],
  ['nested',           { groups: 8, perGroup: 10, between: 0.30, within: 0.02, structure: 'nested' }],
  ['2 groups',         { groups: 2, perGroup: 30, between: 0.20, within: 0.02 }],
  ['chunks (truncated)',{ groups: 6, perGroup: 15, between: 0.25, within: 0.04, truncate: 0.7, length: 800 }],
];
const SEEDS = +process.env.SEEDS || 4;
console.log('scenario'.padEnd(22), 'k:', [3,4,5,6,7,8,9,10,11,12].map(k => String(k).padStart(11)).join(''));
for (const [name, p] of SCEN) {
  const rows = { forced: [], est: [], ari: [] };
  for (let k = 3; k <= 12; k++) {
    let f = 0, e = 0, a = 0;
    for (let s = 1; s <= SEEDS; s++) {
      const sim = simulate(p, s), n = sim.seqs.length, G = sim.info.nGroups;
      const tree = KT.guideTree(sim.seqs, k);
      f += ari(sim.labels, cutLabels(tree.merges, n, G));
      const est = suggest(tree.merges.map(x => x.d), n);
      e += est; a += ari(sim.labels, cutLabels(tree.merges, n, est));
    }
    rows.forced.push(f / SEEDS); rows.est.push(e / SEEDS); rows.ari.push(a / SEEDS);
  }
  const G = simulate(p, 1).info.nGroups;
  console.log(name.padEnd(22), `(G=${G}) forced-ARI `, rows.forced.map(v => v.toFixed(2).padStart(6)).join(' '));
  console.log(''.padEnd(22), '        auto est   ', rows.est.map(v => v.toFixed(1).padStart(6)).join(' '));
  console.log(''.padEnd(22), '        auto ARI   ', rows.ari.map(v => v.toFixed(2).padStart(6)).join(' '));
}
