// SubFam-like re-chunking of an ALIGNED set of loci (his proposal, 2026-10-05):
//   1. (done before this script: re-align all original loci, e.g. mafft --localpair --maxiterate 1000 --ep 0.123 --nuc --reorder)
//   2. throw away obvious singleton outliers (no close relative at all: nearest-neighbour distance far above the typical one),
//   3. order the loci by similarity (guide-tree order) and cut them into chunks of `size`; the last chunk, if shorter than `size`,
//      is replaced by the LAST `size` loci of the list (it overlaps the previous chunk, so no chunk is short),
//   4. one consensus per chunk (plurality: a character needs at least 36% of the chunk, else a gap; as `cons -plurality 18` on 50),
//      written as one aligned row per chunk, in the order the chunks were cut.
// Outputs: <out>.chunks.aln.fa (chunk consensi), <out>.loci.tsv (locus, kept/dropped, chunk(s)), <out>.dropped.fa (outlier loci).
//   node tests/kmer/rechunk.js loci.aln.fa outPrefix [--size 50] [--z 8]
const fs = require('fs'), KT = require('../../kmer-tree.js'), Peel = require('../../peel.js');
const args = process.argv.slice(2), file = args[0], out = args[1];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : +args[i + 1]; };
const SIZE = opt('size', 50), Z = opt('z', 8);
if (!file || !out) { console.log('usage: node tests/kmer/rechunk.js loci.aln.fa outPrefix [--size 50] [--z 8]'); process.exit(1); }
const rows = fs.readFileSync(file, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('').replace(/\s/g, '') }; });
if (new Set(rows.map(r => r.seq.length)).size !== 1) { console.error('rows are not one length: align them first'); process.exit(1); }
const D = KT.pDistanceMatrix(rows), all = rows.map((_, i) => i);
const dropped = new Set(Peel.findOutliers(D, all, Z));
const kept = all.filter(i => !dropped.has(i));
// guide-tree order of the kept loci
const sub = kept.map(i => rows[i]), order = KT.guideTree(sub, 6, { metric: 'pdist' }).order.map(i => kept[i]);
const chunks = [];
for (let s = 0; s + SIZE <= order.length; s += SIZE) chunks.push(order.slice(s, s + SIZE));
const rem = order.length % SIZE;
if (rem > 0 && order.length >= SIZE) chunks.push(order.slice(order.length - SIZE));      // last chunk = last SIZE loci (overlaps the one before)
if (order.length < SIZE) chunks.push(order.slice());                                       // fewer loci than one chunk: one short chunk
const L = rows[0].seq.length, plur = Math.max(1, Math.round(0.36 * Math.min(SIZE, order.length)));
const cons = ch => { let s = ''; for (let j = 0; j < L; j++) { const c = {}; ch.forEach(i => { const x = rows[i].seq[j].toUpperCase(); c[x] = (c[x] || 0) + 1; });
  const [best, n] = Object.entries(c).filter(([x]) => x !== '-' && x !== 'N').sort((a, b) => b[1] - a[1])[0] || ['-', 0]; s += n >= plur ? best : '-'; } return s; };
fs.writeFileSync(out + '.chunks.aln.fa', chunks.map((ch, k) => `>chunk_${String(k + 1).padStart(3, '0')}${rem > 0 && k === chunks.length - 1 && order.length >= SIZE ? '_last_overlapping' : ''}\n${cons(ch)}\n`).join(''));
fs.writeFileSync(out + '.dropped.fa', [...dropped].map(i => `>${rows[i].header}\n${rows[i].seq}\n`).join(''));
const where = new Map(); chunks.forEach((ch, k) => ch.forEach(i => { if (!where.has(i)) where.set(i, []); where.get(i).push(k + 1); }));
fs.writeFileSync(out + '.loci.tsv', ['locus\tstatus\tchunks', ...rows.map((r, i) => `${r.header}\t${dropped.has(i) ? 'dropped' : 'kept'}\t${(where.get(i) || []).join(',')}`)].join('\n') + '\n');
console.log(`${rows.length} loci: ${dropped.size} dropped as singleton outliers, ${kept.length} kept -> ${chunks.length} chunks of ${SIZE}${rem > 0 && order.length >= SIZE ? ` (last one = the final ${SIZE} loci, overlapping by ${SIZE - rem})` : ''}; plurality ${plur}`);
