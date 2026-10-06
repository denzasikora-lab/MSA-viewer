const fs = require('fs'), KT = require('../../kmer-tree.js'), C = require('./cuts.js'), { ari } = require('./metrics.js');
const file = process.argv[2] || (console.error('usage: node tests/kmer/efe-check.js <alignment.fa> [min]'), process.exit(2)), MIN = +(process.argv[3] || 3);
const fa = fs.readFileSync(file, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('') }; });
const n = fa.length; console.log('sequences', n, 'minSize', MIN);
const parts = {};
for (const [name, metric, k] of [['pdist', 'pdist', 6], ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => ['k' + k, 'jaccard', k])]) {
  const t = KT.guideTree(fa, k, { metric });
  const a = C.autoPersist(t.merges, n, MIN, 'lin');
  const g = new Set(a.labels.filter((l, i) => !a.unassigned.has(i))).size;
  const sizes = {}; a.labels.forEach((l, i) => { if (!a.unassigned.has(i)) sizes[l] = (sizes[l] || 0) + 1; });
  parts[name] = C.scoreLabels(a, n);
  console.log(name.padEnd(6), 'auto groups', String(g).padStart(3), 'unassigned', String(a.unassigned.size).padStart(3), 'cut height', a.cutHeight.toFixed(3), 'largest', Math.max(0, ...Object.values(sizes)));
}
const names = Object.keys(parts);
console.log('\nagreement (ARI) of each k-mer result with the alignment-based one, and k vs k+1:');
console.log(names.filter(x => x !== 'pdist').map(x => `${x}:${ari(parts.pdist, parts[x]).toFixed(2)}`).join('  '));
const ks = names.filter(x => x !== 'pdist'); console.log(ks.slice(0, -1).map((x, i) => `${x}-${ks[i + 1]}:${ari(parts[x], parts[ks[i + 1]]).toFixed(2)}`).join('  '));
