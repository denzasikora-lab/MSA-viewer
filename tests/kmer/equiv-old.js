// The rewritten guide tree (kmer-tree.js) must equal the original in script.js: same merges
// (pair, distance), same leaf order. Random alignments with ties, duplicates, junk characters.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ctx = { old: require('./old-guide-tree.js').oldGuideTree };
const KT = require(path.join(ROOT, 'kmer-tree.js'));
let x = +process.env.SEED || 11; const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
const pick = s => s[Math.floor(rnd() * s.length)];
function randSeq(len, alpha) { let s = ''; for (let i = 0; i < len; i++) s += pick(alpha); return s; }
let cases = 0, bad = 0;
for (let t = 0; t < (+process.env.CASES || 400); t++) {
  const n = 2 + Math.floor(rnd() * 40), len = 20 + Math.floor(rnd() * 300);
  const alpha = [['ACGT'], ['ACGT-'], ['ACGU'], ['ACGTNRY-.acgtu']][Math.floor(rnd() * 4)][0];
  const base = randSeq(len, alpha), seqs = [];
  const nBase = 1 + Math.floor(rnd() * 4), bases = Array.from({ length: nBase }, () => randSeq(len, alpha));
  for (let i = 0; i < n; i++) {
    const b = rnd() < 0.5 ? base : pick(bases);
    const rate = rnd() * 0.3;
    let s = ''; for (const c of b) s += rnd() < rate ? pick(alpha) : c;
    seqs.push({ header: 's' + i, seq: rnd() < 0.15 && i ? seqs[i - 1].seq : s });   // exact duplicates -> distance ties
  }
  const k = 3 + Math.floor(rnd() * 10);
  const a = ctx.old(seqs, k), b = KT.guideTree(seqs, k);
  const same = a.order.join() === b.order.join() && a.merges.length === b.merges.length && a.merges.every((m, i) => m.i === b.merges[i].i && m.j === b.merges[i].j && m.d === b.merges[i].d);
  cases++; if (!same) { bad++; if (bad <= 3) console.log('MISMATCH', { n, len, k, alpha, order: [a.order.join(), b.order.join()] }); }
}
console.log(`${cases} cases, ${bad} different`);
process.exit(bad ? 1 : 0);
