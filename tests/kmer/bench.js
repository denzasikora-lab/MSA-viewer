// Benchmark grid: distance metric x cut strategy x k x scenario x seed, scored against known groups.
// Usage: node tests/kmer/bench.js [--seeds 3] [--minsize 3] [--ks 3,4,...] [--quick]
const KT = require('../../kmer-tree.js'), C = require('./cuts.js'), { simulate } = require('./sim.js'), { ari } = require('./metrics.js');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +opt('seeds', 3), MIN = +opt('minsize', 3);
const KS = opt('ks', '3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
const METRICS = opt('metrics', 'jaccard,mash,overlap,pdist').split(',');

const SCEN = [
  ['easy',            { groups: 5, perGroup: 12, between: 0.20, within: 0.02 }],
  ['close',           { groups: 5, perGroup: 12, between: 0.08, within: 0.02 }],
  ['diverged',        { groups: 5, perGroup: 12, between: 0.50, within: 0.05 }],
  ['groups20',        { groups: 20, perGroup: 8, between: 0.25, within: 0.02 }],
  ['nested8',         { groups: 8, perGroup: 10, between: 0.35, within: 0.02, structure: 'nested' }],
  ['two',             { groups: 2, perGroup: 30, between: 0.15, within: 0.02 }],
  ['chunks',          { groups: 6, perGroup: 15, between: 0.25, within: 0.04, truncate: 0.7, length: 800 }],
  ['singletons',      { groups: 8, perGroup: 5, between: 0.40, within: 0.03, singletons: 60 }],
  ['dominant',        { groups: 5, sizes: 'dominant', perGroup: 12, between: 0.20, within: 0.02 }],
  ['small30x3',       { groups: 30, perGroup: 3, between: 0.30, within: 0.03 }],
  ['geometric',       { groups: 8, sizes: 'geometric', perGroup: 12, between: 0.25, within: 0.03 }],
  ['indel',           { groups: 6, perGroup: 12, between: 0.10, within: 0.02, indel: 0.01 }],
  ['rna-lower',       { groups: 5, perGroup: 12, between: 0.20, within: 0.02, rna: true, lowercase: 0.3 }],
  ['dups',            { groups: 6, perGroup: 14, between: 0.20, within: 0.02, dupFraction: 0.6 }],
  ['chunks+single',   { groups: 6, perGroup: 6, between: 0.35, within: 0.05, truncate: 0.8, singletons: 80, length: 700 }],
];

// truth as a scoring labeling: members of groups smaller than MIN are noise (their own label)
function truthLabels(labels) {
    const cnt = new Map(); labels.forEach(l => cnt.set(l, (cnt.get(l) || 0) + 1));
    return labels.map((l, i) => cnt.get(l) >= MIN ? 'g' + l : 'n' + i);
}
function nTrue(labels) { const cnt = new Map(); labels.forEach(l => cnt.set(l, (cnt.get(l) || 0) + 1)); let g = 0; cnt.forEach(v => { if (v >= MIN) g++; }); return g; }

const WANT = opt('strats', '').split(',').filter(Boolean);
const ALL_STRATS = {
  'forced/coarsest': (t, n, G) => C.forcedCoarsest(t.merges, n, G, MIN),
  'forced/plateau':  (t, n, G) => C.forcedPlateau(t.merges, n, G, MIN),
  'auto/old':        (t, n) => C.autoOld(t.merges, n, MIN),
  'auto/persist-lin': (t, n) => C.autoPersist(t.merges, n, MIN, 'lin'),
  'auto/persist-log': (t, n) => C.autoPersist(t.merges, n, MIN, 'log'),
  'auto/silhouette': (t, n) => C.autoSilhouette(t.merges, n, MIN, t.dist),
};

const STRATS = Object.fromEntries(Object.entries(ALL_STRATS).filter(([k]) => !WANT.length || WANT.includes(k)));
const results = {};       // key metric|strat -> scen -> [ari per (k,seed)] , plus count errors
for (const [name, p] of SCEN) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const sim = simulate(p, seed), n = sim.seqs.length, truth = truthLabels(sim.labels), G = nTrue(sim.labels);
    for (const metric of METRICS) for (const k of KS) {
      if (metric === 'pdist' && k !== KS[0]) continue;               // k does not matter for the alignment distance
      const tree = KT.guideTree(sim.seqs, k, { metric });
      for (const [sname, fn] of Object.entries(STRATS)) {
        const cut = fn(tree, n, G);
        const sc = ari(truth, C.scoreLabels(cut, n));
        const nGot = new Set(C.scoreLabels(cut, n).filter(l => l[0] === 'g')).size;
        const key = metric + ' | ' + sname;
        ((results[key] ||= {})[name] ||= []).push({ ari: sc, err: Math.abs(nGot - G), k });
      }
    }
  }
}

const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const names = SCEN.map(s => s[0]);
console.log(`minSize=${MIN} seeds=${SEEDS} ks=${KS.join(',')}\n`);
console.log('config'.padEnd(34) + names.map(n => n.slice(0, 7).padStart(8)).join('') + '   MEAN   WORST  stability');
const rows = [];
for (const [key, byScen] of Object.entries(results)) {
  const per = names.map(n => mean((byScen[n] || []).map(r => r.ari)));
  // stability across k: the worst k-average over scenarios
  const byK = {};
  names.forEach(n => (byScen[n] || []).forEach(r => { (byK[n + '|' + r.k] ||= []).push(r.ari); }));
  const kAvg = Object.values(byK).map(mean);
  rows.push({ key, per, m: mean(per), worst: Math.min(...per), minK: Math.min(...kAvg) });
}
rows.sort((a, b) => b.m - a.m);
rows.forEach(r => console.log(r.key.padEnd(34) + r.per.map(v => v.toFixed(2).padStart(8)).join('') + `  ${r.m.toFixed(3)}  ${r.worst.toFixed(2)}   ${r.minK.toFixed(2)}`));
