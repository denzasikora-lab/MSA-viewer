// Calibration set for the peel rule: cases where the peel loop split one of HIS groups. Each case = piece X against the rest
// of his group (Y). For every column where X carries a character that Y (almost) lacks, the evidence is listed with its
// exceptions named, so he can judge each column (and misalignments) and say whether X is a real group.
// He marks each case; the threshold is then fitted to his marks.
//   node tests/kmer/peel-calib.js [outDir]
const fs = require('fs'), path = require('path'), KT = require('../../kmer-tree.js'), Peel = require('../../peel.js');
const DIR = 'C:/work/SINE_discriminator/site/alignments/';
const OUT = process.argv[2] || path.join(DIR, 'peel_calib');
const rd = f => fs.readFileSync(DIR + f, 'utf8').split('>').slice(1).map(b => { const l = b.split('\n'); return { header: l[0].trim(), seq: l.slice(1).join('').replace(/\s/g, '') }; });
const num = h => (h.match(/input_0*(\d+)/) || [])[1];
const load = which => {
  if (which === 'ccr') {
    const seqs = rd('CURATE__ccr__subfam608_g1-g7_accr.aln.fa').filter(r => /^input_/.test(r.header));
    const grp = new Map(fs.readFileSync(DIR + 'ccr_groups.tsv', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([g, n]) => [n.trim(), g]));
    return { seqs, truth: seqs.map(s => grp.get(s.header) || null) };
  }
  const seqs = rd('CURATE__oma__subfam600_23seeds.aln.fa').filter(r => /^input_/.test(r.header));
  const m = new Map(); fs.readFileSync(DIR + 'oma_groups_final.tsv', 'utf8').trim().split('\n').forEach(l => { const [g, ids] = l.split('\t'); ids.trim().split(/\s+/).forEach(x => m.set(String(+x), g)); });
  return { seqs, truth: seqs.map(s => m.get(String(+num(s.header))) || null) };
};
const CH = c => { c = c.toUpperCase(); return c === 'U' ? 'T' : ('ACGT-'.includes(c) ? c : (c === '.' ? '-' : 'N')); };

const cases = [];
for (const which of ['oma', 'ccr']) {
  const { seqs, truth } = load(which);
  const r = Peel.peel(seqs, { criterion: 'diag', minSize: 2, minDiag: 2, refine: 1, outliers: false });
  const D = KT.pDistanceMatrix(seqs);
  const pieceOf = new Array(seqs.length).fill(-1); r.groups.forEach((g, k) => g.forEach(i => { pieceOf[i] = k; }));
  for (const g of [...new Set(truth.filter(Boolean))]) {
    if (g === 'ancient78') continue;                                    // his "ancient" bin, not a subfamily
    const mem = truth.map((t, i) => t === g ? i : -1).filter(i => i >= 0);
    const by = new Map(); mem.forEach(i => { const p = pieceOf[i]; if (p < 0) return; if (!by.has(p)) by.set(p, []); by.get(p).push(i); });
    if (by.size < 2) continue;
    const pieces = [...by.values()].sort((a, b) => b.length - a.length);
    // every piece except the largest, against the rest of his group (for a two-piece split that is the one split)
    pieces.slice(1).forEach(X => {
      if (X.length < 2) return;
      const xs = new Set(X), Y = mem.filter(i => !xs.has(i));
      cases.push({ which, g, seqs, D, X, Y });
    });
  }
}

const mean = (D, A, B) => { let t = 0, c = 0; for (const a of A) for (const b of B) if (a !== b) { t += D[a][b]; c++; } return c ? t / c : NaN; };
function evidence(c) {
  const { seqs, X, Y } = c, L = seqs[0].seq.length, cols = [];
  for (let j = 0; j < L; j++) {
    const cx = {}, cy = {}; let kx = 0, ky = 0;
    X.forEach(i => { const v = CH(seqs[i].seq[j]); if (v !== 'N') { cx[v] = (cx[v] || 0) + 1; kx++; } });
    Y.forEach(i => { const v = CH(seqs[i].seq[j]); if (v !== 'N') { cy[v] = (cy[v] || 0) + 1; ky++; } });
    if (kx < 0.7 * X.length || ky < 0.7 * Y.length) continue;
    const [ch, n] = Object.entries(cx).sort((a, b) => b[1] - a[1])[0];
    if (ch === '-' && (cy['-'] || 0) / ky > 0.5) continue;               // both sides gapped: nothing here
    const inMiss = kx - n, outHas = cy[ch] || 0, exc = inMiss + outHas;
    if (exc > 2 || n < 2) continue;
    const yGap = (cy['-'] || 0) / ky, indel = ch === '-' || yGap >= 0.5;
    const who = [...X.filter(i => CH(seqs[i].seq[j]) !== ch).map(i => `${seqs[i].header} (in X, has ${CH(seqs[i].seq[j])})`),
                 ...Y.filter(i => CH(seqs[i].seq[j]) === ch).map(i => `${seqs[i].header} (outside X, has ${ch})`)];
    cols.push({ j, ch, exc, indel, who });
  }
  return cols;
}
cases.forEach(c => {
  c.ev = evidence(c);
  const kept = new Uint8Array(c.seqs[0].seq.length);
  [...c.X, ...c.Y].forEach(i => { const s = c.seqs[i].seq; for (let j = 0; j < s.length; j++) if (s[j] !== '-' && s[j] !== '.') kept[j] = 1; });
  c.kept = kept; c.colNo = new Int32Array(kept.length); let k = 0; for (let j = 0; j < kept.length; j++) if (kept[j]) c.colNo[j] = ++k;
  const runs = list => { let n = 0, prev = -2; list.forEach(e => { if (e.j !== prev + 1) n++; prev = e.j; }); return n; };
  c.cleanSubs = c.ev.filter(e => e.exc === 0 && !e.indel).length;
  c.cleanIndels = runs(c.ev.filter(e => e.exc === 0 && e.indel));
  c.oneExc = c.ev.filter(e => e.exc === 1).length; c.twoExc = c.ev.filter(e => e.exc === 2).length;
  c.score = c.cleanSubs + 2 * c.cleanIndels + 0.5 * c.oneExc;
});
// choose about 20 cases spread over the evidence range (borderline ones are the informative ones)
cases.sort((a, b) => a.score - b.score);
const pick = cases.length <= 20 ? cases : Array.from({ length: 20 }, (_, k) => cases[Math.round(k * (cases.length - 1) / 19)]);
fs.mkdirSync(OUT, { recursive: true });
const md = ['# Calibration cases for the peel rule', '',
  'Each case: the peel loop split one of your groups; **X** is the piece it split off, **Y** the rest of your group.',
  'Please mark each case **real** (X is its own group), **together** (X belongs with Y) or **unsure**.', '',
  'In each alignment the X rows come first (`X|name`), then Y (`Y|name`). The two top rows are markers, not sequences:',
  '`EVIDENCE_clean` has a letter only at columns where every X sequence has that character and no Y sequence does;',
  '`EVIDENCE_1or2_exceptions` the same with one or two exceptions (named in the table below each case). Column numbers are the',
  "viewer's ruler numbers for that file.", '',
  '| case | your group | X | Y | clean substitutions | clean indels | with 1 exception | with 2 | distance in X / in Y / X-Y | your call |',
  '|---|---|---|---|---|---|---|---|---|---|'];
const detail = [];
pick.forEach((c, k) => {
  const id = String(k + 1).padStart(2, '0'), file = `case${id}_${c.which}_${c.g}.aln.fa`, L = c.seqs[0].seq.length;
  const cut = s => { let o = ''; for (let j = 0; j < L; j++) if (c.kept[j]) o += s[j]; return o; };
  const mk = f => { const a = new Array(L).fill('-'); c.ev.filter(f).forEach(e => { a[e.j] = e.ch === '-' ? '~' : e.ch; }); return cut(a.join('')); };
  let fa = `>EVIDENCE_clean\n${mk(e => e.exc === 0)}\n>EVIDENCE_1or2_exceptions\n${mk(e => e.exc > 0)}\n`;
  c.X.forEach(i => { fa += `>X|${c.seqs[i].header}\n${cut(c.seqs[i].seq)}\n`; });
  c.Y.forEach(i => { fa += `>Y|${c.seqs[i].header}\n${cut(c.seqs[i].seq)}\n`; });
  fs.writeFileSync(path.join(OUT, file), fa);
  const link = `https://toki-bio.github.io/MSA-viewer/?url=https://raw.githubusercontent.com/Toki-bio/SINE-discriminator/main/alignments/peel_calib/${file}&title=case%20${id}`;
  md.push(`| [${id}](${link}) | ${c.which} ${c.g} | ${c.X.length} | ${c.Y.length} | ${c.cleanSubs} | ${c.cleanIndels} | ${c.oneExc} | ${c.twoExc} | ${mean(c.D, c.X, c.X).toFixed(3)} / ${mean(c.D, c.Y, c.Y).toFixed(3)} / ${mean(c.D, c.X, c.Y).toFixed(3)} | |`);
  detail.push(`### Case ${id}: ${c.which} ${c.g}, X = ${c.X.length}, Y = ${c.Y.length}`, '');
  c.ev.forEach(e => detail.push(`- column ${c.colNo[e.j]}: ${e.ch === '-' ? 'gap (deletion in X)' : e.ch}${e.indel && e.ch !== '-' ? ' (Y mostly gapped: insertion in X)' : ''}` +
    (e.exc ? ` - exceptions: ${e.who.join('; ')}` : ' - clean')));
  if (!c.ev.length) detail.push('- no column at all with 2 or fewer exceptions');
  detail.push('');
});
md.push('', '`~` in an EVIDENCE row marks a gap in X where Y has bases (a deletion in X).', '', '## Columns per case', '', ...detail);
fs.writeFileSync(path.join(OUT, 'README.md'), md.join('\n'));
console.log(`${cases.length} split cases found, ${pick.length} written to ${OUT}`);
pick.forEach((c, k) => console.log(`  case ${k + 1}: ${c.which} ${c.g} X=${c.X.length} Y=${c.Y.length} clean subs ${c.cleanSubs}, clean indels ${c.cleanIndels}, 1-exc ${c.oneExc}, 2-exc ${c.twoExc}`));
