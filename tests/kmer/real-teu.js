// Real chunk-consensus benchmark with known labels: Tal teu_subfam_input.aln.fa = 6 blocks of 201 rows (200 chunk
// consensuses + 1 block consensus), one block per subfamily (labels known by construction; the names repeat across
// blocks, so the label is the BLOCK, never the name).  node tests/kmer/real-teu.js [path] [--min N] [--keepcons]
const fs = require('fs'), KT = require('../../kmer-tree.js'), { ari } = require('./metrics.js');
const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--')) || 'C:/work/Tal/teu/alignments/teu_subfam_input.aln.fa';
const MIN = +(args[args.indexOf('--min') + 1] || 3) || 3;
const rows = fs.readFileSync(file, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('') }; });
const BL = 201, labels = rows.map((_, i) => Math.floor(i / BL));
let seqs = rows.map((r, i) => ({ header: i + '_' + r.header, seq: r.seq }));
console.log('rows', rows.length, 'blocks', labels[labels.length - 1] + 1, 'columns', new Set(rows.map(r => r.seq.length)).size === 1 ? rows[0].seq.length : 'UNEQUAL');
const n = seqs.length, truth = labels.map(l => 'g' + l);
const lab = c => { const o = new Array(n); c.groups.forEach((g, gi) => g.forEach(i => { o[i] = 'g' + gi; })); c.unassigned.forEach(i => { o[i] = 'u' + i; }); return o; };
for (const link of ['average', 'single']) for (const [nm, metric, k] of [['aligned', 'pdist', 6], ['k4', 'jaccard', 4], ['k6', 'jaccard', 6], ['k8', 'jaccard', 8]]) {
  const t = KT.guideTree(seqs, k, { metric, linkage: link });
  const a = KT.cutTree(t, 'auto', MIN), g = KT.cutTree(t, 6, MIN);
  console.log(link.padEnd(8), nm.padEnd(8), 'auto groups', String(a.groups.length).padStart(3), 'ARI', ari(truth, lab(a)).toFixed(3), '| given 6: ARI', ari(truth, lab(g)).toFixed(3), 'unassigned', g.unassigned.length, ' sizes', g.groups.map(x => x.length).slice(0, 8).join(','));
}
