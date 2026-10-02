// Real chunk-consensus benchmark: ccr, 600 SubFam chunk consensuses aligned (SubFam order), scored against HIS hand-peeled
// groups (ccr_groups.tsv: 351 of 600 chunks assigned to g1-g7; the other 249 are unlabelled and not scored).
// This is agreement with his calls, not independent truth.  node tests/kmer/real-ccr.js [--min N]
const fs = require('fs'), KT = require('../../kmer-tree.js'), { ari } = require('./metrics.js');
const DIR = 'C:/work/SINE_discriminator/site/alignments/', MIN = +(process.argv[process.argv.indexOf('--min') + 1] || 3) || 3;
const rd = f => fs.readFileSync(DIR + f, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('') }; });
const all = rd('CURATE__ccr__subfam608_g1-g7_accr.aln.fa').filter(r => /^input_/.test(r.header));
const grp = new Map(fs.readFileSync(DIR + 'ccr_groups.tsv', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([g, n]) => [n.trim(), g]));
const seqs = all.map(r => ({ header: r.header, seq: r.seq })), n = seqs.length;
const idx = seqs.map((s, i) => grp.has(s.header) ? i : -1).filter(i => i >= 0), truth = idx.map(i => grp.get(seqs[i].header));
const G = new Set(truth).size;
console.log('chunks', n, 'columns', seqs[0].seq.length, 'labelled', idx.length, 'groups', G, [...new Set(truth)].sort().map(g => g + ':' + truth.filter(x => x === g).length).join(' '));
const lab = c => { const o = new Array(n); c.groups.forEach((g, gi) => g.forEach(i => { o[i] = 'g' + gi; })); c.unassigned.forEach(i => { o[i] = 'u' + i; }); return idx.map(i => o[i]); };
for (const link of ['average', 'single']) for (const [nm, metric, k] of [['aligned', 'pdist', 6], ['k4', 'jaccard', 4], ['k6', 'jaccard', 6], ['k8', 'jaccard', 8]]) {
  const t = KT.guideTree(seqs, k, { metric, linkage: link });
  const a = KT.cutTree(t, 'auto', MIN), g = KT.cutTree(t, G, MIN);
  console.log(link.padEnd(8), nm.padEnd(8), 'auto:', String(a.groups.length).padStart(3), 'groups, ARI', ari(truth, lab(a)).toFixed(3), '| given', G + ': ARI', ari(truth, lab(g)).toFixed(3), ' sizes', g.groups.map(x => x.length).slice(0, 8).join(','));
}
// are his groups separable at all? mean aligned distance within vs between, and nearest-neighbour agreement
{
  const t = KT.guideTree(seqs, 6, { metric: 'pdist' }), D = t.dist, names = [...new Set(truth)].sort();
  const w = {}, b = {};
  names.forEach(g => { w[g] = [0, 0]; b[g] = [0, 0]; });
  let nnOK = 0;
  idx.forEach((i, a) => { let best = Infinity, bj = -1; idx.forEach((j, c) => { if (i === j) return; const d = D[i][j]; if (d < best) { best = d; bj = c; } if (truth[a] === truth[c]) { w[truth[a]][0] += d; w[truth[a]][1]++; } else { b[truth[a]][0] += d; b[truth[a]][1]++; } }); if (truth[bj] === truth[a]) nnOK++; });
  console.log('\nHIS groups on the aligned distance: mean within / between, nearest labelled neighbour in the same group');
  names.forEach(g => console.log(' ', g, (w[g][0] / Math.max(1, w[g][1])).toFixed(3), '/', (b[g][0] / b[g][1]).toFixed(3)));
  console.log('  nearest labelled neighbour has the same group for', nnOK, 'of', idx.length, '=', (100 * nnOK / idx.length).toFixed(0) + '%');
}
// the same on ONLY his 351 labelled chunks (no unpeeled chunks to bridge between his groups)
{
  const sub = idx.map(i => seqs[i]), m = sub.length;
  console.log('\nonly the 351 labelled chunks:');
  const lab2 = c => { const o = new Array(m); c.groups.forEach((g, gi) => g.forEach(i => { o[i] = 'g' + gi; })); c.unassigned.forEach(i => { o[i] = 'u' + i; }); return o; };
  for (const link of ['average', 'single']) for (const [nm, metric, k] of [['aligned', 'pdist', 6], ['k6', 'jaccard', 6]]) {
    const t = KT.guideTree(sub, k, { metric, linkage: link }), a = KT.cutTree(t, 'auto', MIN), g = KT.cutTree(t, G, MIN);
    console.log(link.padEnd(8), nm.padEnd(8), 'auto:', String(a.groups.length).padStart(3), 'groups, ARI', ari(truth, lab2(a)).toFixed(3), '| given', G + ': ARI', ari(truth, lab2(g)).toFixed(3), ' sizes', g.groups.map(x => x.length).join(','));
  }
}
