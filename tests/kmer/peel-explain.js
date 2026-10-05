// Shows WHY the peel loop splits one of his groups into several pieces. For every group of his that ends up in more than one
// peel group, writes an alignment of that group's chunks in which
//   - rows are prefixed with their peel piece (A, B, ...) and ordered piece by piece,
//   - above each piece a marker row (>DIAG_A...) carries the diagnostic characters that made the loop peel that piece, at their
//     columns ('-' elsewhere): the columns the loop saw as "fixed in this piece, (almost) absent from everything still left",
// plus a report: when each piece was peeled (step, level, pool size), how many of its diagnostic characters the OTHER pieces
// carry, and the distances within and between the pieces.
//   node tests/kmer/peel-explain.js [ccr|oma] [minSize 2] [minDiag 2] [outDir]
const fs = require('fs'), path = require('path'), KT = require('../../kmer-tree.js'), Peel = require('../../peel.js');
const [, , which = 'oma', minSizeArg = '2', minDiagArg = '2', outArg] = process.argv;
const minSize = +minSizeArg, minDiag = +minDiagArg;
const DIR = 'C:/work/SINE_discriminator/site/alignments/';
const OUT = outArg || path.join(DIR, 'peel_explain');
const rd = f => fs.readFileSync(DIR + f, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('').replace(/\s/g, '') }; });
const num = h => (h.match(/input_0*(\d+)/) || [])[1];
let seqs, truth, src;
if (which === 'ccr') {
  src = 'CURATE__ccr__subfam608_g1-g7_accr.aln.fa';
  seqs = rd(src).filter(r => /^input_/.test(r.header));
  const grp = new Map(fs.readFileSync(DIR + 'ccr_groups.tsv', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([g, n]) => [n.trim(), g]));
  truth = seqs.map(s => grp.get(s.header) || null);
} else {
  src = 'CURATE__oma__subfam600_23seeds.aln.fa';
  seqs = rd(src).filter(r => /^input_/.test(r.header));
  const m = new Map(); fs.readFileSync(DIR + 'oma_groups_final.tsv', 'utf8').trim().split('\n').forEach(l => { const [g, ids] = l.split('\t'); ids.trim().split(/\s+/).forEach(x => m.set(String(+x), g)); });
  truth = seqs.map(s => m.get(String(+num(s.header))) || null);
}
const log = [];
const r = Peel.peel(seqs, { criterion: 'diag', minSize, minDiag, refine: 1, outliers: false, log });
const D = KT.pDistanceMatrix(seqs);
const key = ids => [...ids].sort((a, b) => a - b).join(',');
const logByKey = new Map(); log.forEach((e, k) => { e.step = k + 1; logByKey.set(key(e.ids), e); });
const pieceOf = new Array(seqs.length).fill(-1); r.groups.forEach((g, k) => g.forEach(i => { pieceOf[i] = k; }));
const mean = (A, B) => { let t = 0, c = 0; for (const a of A) for (const b of B) if (a !== b) { t += D[a][b]; c++; } return c ? t / c : NaN; };
fs.mkdirSync(OUT, { recursive: true });
const report = [`# Over-split groups: ${which}`, '',
  `Peel settings: Min size ${minSize}, at least ${minDiag} diagnostic columns, refine 1 (the defaults in ViewAlign v237).`,
  `Source alignment: \`${src}\`. A group of his is listed when its chunks end up in more than one peel group.`, '',
  'How to read each file: rows are `<piece>|<chunk name>`, ordered piece by piece. Above each piece, `DIAG_<piece>` shows the characters',
  'that made the loop peel that piece: at those columns the piece was (at least 90%) fixed for that character, and at most 2% of the',
  'sequences still in the pool at that moment had it. Everything else in the DIAG row is a gap.', ''];
const names = [...new Set(truth.filter(Boolean))];
const index = [];
const summary = ['| his group | chunks | pieces | mean distance inside his group | how it was split |', '|---|---|---|---|---|'];
for (const g of names) {
  const mem = truth.map((t, i) => t === g ? i : -1).filter(i => i >= 0);
  const byPiece = new Map(); mem.forEach(i => { const p = pieceOf[i]; if (!byPiece.has(p)) byPiece.set(p, []); byPiece.get(p).push(i); });
  const pieces = [...byPiece.entries()].filter(([p]) => p >= 0).sort((a, b) => b[1].length - a[1].length);
  if (pieces.length < 2) continue;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const info = pieces.map(([p, ids], k) => {
    const whole = r.groups[p], e = logByKey.get(key(whole));
    const others = whole.filter(i => truth[i] !== g);
    return { L: letters[k], p, ids, whole, e, others };
  });
  const un = byPiece.get(-1) || [];
  // which columns to keep: any member or marker has a character there
  const L = seqs[0].seq.length, keep = new Uint8Array(L);
  mem.forEach(i => { const s = seqs[i].seq; for (let j = 0; j < L; j++) if (s[j] !== '-' && s[j] !== '.') keep[j] = 1; });
  info.forEach(x => x.e && x.e.cols.forEach(j => { keep[j] = 1; }));
  const cut = s => { let o = ''; for (let j = 0; j < L; j++) if (keep[j]) o += s[j]; return o; };
  let fa = '';
  for (const x of info) {
    if (x.e) { const row = new Array(L).fill('-'); x.e.cols.forEach((j, q) => { row[j] = x.e.chars[q]; });
      fa += `>DIAG_${x.L}__step${x.e.step}_level${x.e.level}_${x.e.diag}cols_pool${x.e.pool.length}\n${cut(row.join(''))}\n`; }
    else fa += `>DIAG_${x.L}__no_own_columns_(left_over_inside_a_refined_group)\n${cut('-'.repeat(L))}\n`;
    x.ids.forEach(i => { fa += `>${x.L}|${seqs[i].header}\n${cut(seqs[i].seq)}\n`; });
    x.others.forEach(i => { fa += `>${x.L}|NOT_${g}|${truth[i] || 'unlabelled'}|${seqs[i].header}\n${cut(seqs[i].seq)}\n`; });
  }
  un.forEach(i => { fa += `>unassigned|${seqs[i].header}\n${cut(seqs[i].seq)}\n`; });
  // how the split happened
  const gapShare = x => x.e && x.e.chars.length ? x.e.chars.filter(c => c === '-').length / x.e.chars.length : 0;
  const lv = info.map(x => x.e ? x.e.level : 'left');
  let why = lv.every(v => v === 0) ? 'peeled separately from the start: each piece had its own pattern against the whole pool'
    : 'split inside a group the loop had first peeled as one (the refine step found a sub-group with its own columns)';
  if (info.some(x => gapShare(x) >= 0.5)) why += '; a piece is defined mostly by GAP columns (shared truncation / indel)';
  if (info.some(x => x.others.length > x.ids.length)) why += '; part of it was absorbed into a group made mostly of OTHER chunks';
  summary.push(`| ${g} | ${mem.length} | ${pieces.length}${un.length ? ' + ' + un.length + ' unassigned' : ''} | ${mean(mem, mem).toFixed(3)} | ${why} |`);
  const file = `${which}__${g}__oversplit.aln.fa`;
  fs.writeFileSync(path.join(OUT, file), fa);
  index.push(file);
  report.push(`## ${g} (${mem.length} chunks) -> ${pieces.length} pieces${un.length ? ` + ${un.length} unassigned` : ''}`, '', `File: \`peel_explain/${file}\``, '');
  report.push('| piece | his chunks | other chunks in it | peeled at | pool then | diag columns | within | to other pieces |', '|---|---|---|---|---|---|---|---|');
  info.forEach(x => {
    const rest = info.filter(y => y !== x).flatMap(y => y.ids);
    report.push(`| ${x.L} | ${x.ids.length} | ${x.others.length} | ${x.e ? `step ${x.e.step}, level ${x.e.level}` : 'leftover of a refined group'} | ${x.e ? x.e.pool.length : '-'} | ${x.e ? x.e.diag : 0} | ${mean(x.ids, x.ids).toFixed(3)} | ${rest.length ? mean(x.ids, rest).toFixed(3) : '-'} |`);
  });
  // do the other pieces carry this piece's diagnostic characters?
  const carry = [];
  info.forEach(x => { if (!x.e || !x.e.cols.length) return;
    info.forEach(y => { if (y === x) return; let hit = 0, tot = 0;
      y.ids.forEach(i => x.e.cols.forEach((j, q) => { tot++; if (seqs[i].seq[j].toUpperCase().replace('U', 'T') === x.e.chars[q]) hit++; }));
      carry.push(`${y.L} carries ${(100 * hit / tot).toFixed(0)}% of ${x.L}'s ${x.e.cols.length} diagnostic characters`); }); });
  if (carry.length) report.push('', 'Pattern sharing: ' + carry.join('; ') + '.');
  report.push('');
}
report.splice(9, 0, '## Summary', '', ...summary, '');
fs.writeFileSync(path.join(OUT, `${which}_README.md`), report.join('\n'));
console.log(`${which}: ${index.length} over-split groups written to ${OUT}`); index.forEach(f => console.log('  ' + f));
