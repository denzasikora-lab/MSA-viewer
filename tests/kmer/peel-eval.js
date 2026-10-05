// Scores the peel loop against HIS recorded final groups (ccr, oma) and compares it with a one-shot tree cut.
// Agreement with his calls is what is measured, not independent truth.
//   node tests/kmer/peel-eval.js [--gap 0.04] [--min 3] [--z 6]
const fs = require('fs'), KT = require('../../kmer-tree.js'), Peel = require('../../peel.js'), { ari } = require('./metrics.js');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : +process.argv[i + 1]; };
const GAP = arg('gap', 0.04), MIN = arg('min', 3), Z = arg('z', 10);
const DIR = 'C:/work/SINE_discriminator/site/alignments/';
const rd = f => fs.readFileSync(DIR + f, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('') }; });
const num = h => (h.match(/input_0*(\d+)/) || [])[1];
const sets = {
  ccr: () => {
    const all = rd('CURATE__ccr__subfam608_g1-g7_accr.aln.fa').filter(r => /^input_/.test(r.header));
    const grp = new Map(fs.readFileSync(DIR + 'ccr_groups.tsv', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([g, n]) => [n.trim(), g]));
    return { seqs: all, truth: all.map(s => grp.get(s.header) || null) };
  },
  oma: () => {
    const all = rd('CURATE__oma__subfam600_23seeds.aln.fa').filter(r => /^input_/.test(r.header));
    const m = new Map();
    fs.readFileSync(DIR + 'oma_groups_final.tsv', 'utf8').trim().split('\n').forEach(l => { const [g, ids] = l.split('\t'); ids.trim().split(/\s+/).forEach(x => m.set(String(+x), g)); });
    return { seqs: all, truth: all.map(s => m.get(String(+num(s.header))) || null) };
  },
};
for (const [name, load] of Object.entries(sets)) {
  const { seqs, truth } = load(), n = seqs.length, idx = truth.map((t, i) => t ? i : -1).filter(i => i >= 0), G = new Set(idx.map(i => truth[i])).size;
  console.log(`\n${name}: ${n} chunks, ${seqs[0].seq.length} columns, ${idx.length} labelled by him in ${G} groups`);
  const lab = (groups, un) => { const o = new Array(n).fill(null); groups.forEach((g, gi) => g.forEach(i => { o[i] = 'g' + gi; })); un.forEach(i => { o[i] = 'u' + i; }); return idx.map(i => o[i]); };
  const tr = idx.map(i => truth[i]);
  const metric = 'pdist';
  const t = KT.guideTree(seqs, 6, { metric }), a = KT.cutTree(t, 'auto', MIN), g = KT.cutTree(t, G, MIN);
  console.log(`  one-shot cut  auto: ${String(a.groups.length).padStart(3)} groups ARI ${ari(tr, lab(a.groups, a.unassigned)).toFixed(3)} | given ${G}: ARI ${ari(tr, lab(g.groups, g.unassigned)).toFixed(3)}`);
  for (const outliers of [false, true]) {
    const t0 = Date.now(), r = Peel.peel(seqs, { metric, minSize: MIN, minGap: GAP, outlierZ: Z, outliers });
    console.log(`  peel loop     outliers ${outliers ? 'on ' : 'off'}: ${String(r.groups.length).padStart(3)} groups ARI ${ari(tr, lab(r.groups, r.unassigned)).toFixed(3)}  unassigned ${r.unassigned.length}  outliers ${r.outliers.length}  ${Date.now() - t0} ms`);
  }
}
