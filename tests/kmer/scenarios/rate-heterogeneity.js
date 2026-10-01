// tests/kmer/scenarios/rate-heterogeneity.js
//
// One scenario module following tests/kmer/SCENARIO_CONTRACT.md (tests/kmer/sim.js is a
// simpler worked generator). No require(), no Math.random, no file or network access:
// generate(seed) is deterministic in the seed it is given.
//
// Biology: six groups on a two-clade tree ({0,1,2} vs {3,4,5}) evolve with gamma-like
// site rates -- about 70% of columns invariant, most of the rest slow, a handful of
// hot columns mutating repeatedly -- and a strong transition bias (ts:tv = 8:1). Hot
// columns flip A/G and C/T over and over, so the deep split saturates (multiple hits
// hidden, parallel changes common) while the shallow within-clade splits stay clear.

const LEN = 900;                       // alignment columns (contract range: 60..3000)
const INVARIANT = 0.70;                // fraction of columns that never mutate
const TS_PROB = 8 / 9;                 // a substitution is a transition with this prob (ts:tv = 8:1)
const T_DEEP = 0.40;                   // root to clade ancestor, mean substitutions per site
const T_SHALLOW = 0.09;                // clade ancestor to group consensus
const T_WITHIN = 0.02;                 // group consensus to member
const SIZES = [16, 13, 10, 9, 7, 6];   // 61 sequences in 6 groups (contract: 30..400)
const MIN_SIZE = 3;

// mulberry32: tiny seeded PRNG
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
const TVS = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };

module.exports = {
  id: 'rate-heterogeneity',
  title: 'Gamma-like rates (70% invariant, a few hot columns) with ts:tv = 8:1',
  describe: 'Six groups evolved on a two-clade tree, {0,1,2} vs {3,4,5}: a deep split followed '
    + 'by three shallow radiations inside each clade. Site rates are extreme and gamma-like '
    + '(about 70% of columns never mutate, most of the rest drift slowly, a handful of hot '
    + 'columns change repeatedly) and every substitution is a transition with probability 8/9 '
    + '(ts:tv = 8:1). Hot columns saturate over the deep split -- repeated A/G and C/T flips, '
    + 'reversions and parallel changes -- so deep divergence is compressed and partly invisible, '
    + 'while the shallow within-clade structure stays clear.',
  generate(seed) {
    const R = mulberry32((seed >>> 0) ^ 0x5bf03635);

    // Per-column relative rates: invariant, or heavy-tailed (gamma flavour) so that only a few
    // columns are hot. Rescaled so a branch of length t carries t expected substitutions per site
    // on average; the cap only bites on the hottest columns and keeps the Poisson loop short.
    const rates = new Array(LEN);
    let sum = 0;
    for (let i = 0; i < LEN; i++) {
      let r = 0;
      if (R() >= INVARIANT) { const e = -Math.log(1 - R()); r = Math.sqrt(e * e * e) / 1.2; }
      rates[i] = r;
      sum += r;
    }
    const k = sum > 0 ? LEN / sum : 1;
    for (let i = 0; i < LEN; i++) rates[i] = Math.min(25, rates[i] * k);

    const step = c => (R() < TS_PROB ? TS[c] : TVS[c][R() < 0.5 ? 0 : 1]); // one substitution, ts:tv 8:1
    const pois = lam => {              // Knuth's method; lambda stays below ~15 here
      const lim = Math.exp(-lam);
      let p = 1, n = 0;
      do { n++; p *= R(); } while (p > lim);
      return n - 1;
    };
    const evolve = (seq, t) => {        // per-column Poisson hits: multiple hits per site allowed
      const out = seq.slice();
      for (let i = 0; i < LEN; i++) {
        const r = rates[i];
        if (!r) continue;
        for (let n = pois(r * t), h = 0; h < n; h++) out[i] = step(out[i]);
      }
      return out;
    };
    const jit = () => 0.7 + 0.6 * R();  // per-branch length jitter: the clock is not ultrametric
    const base = () => (R() < 0.5 ? (R() < 0.5 ? 'A' : 'T') : (R() < 0.5 ? 'G' : 'C')); // GC = 0.5
    const founder = Array.from({ length: LEN }, base);

    // deep split: the two clade ancestors are far from the root and from each other
    const ancA = evolve(founder, T_DEEP * jit());
    const ancB = evolve(founder, T_DEEP * jit());
    // shallow radiation: one consensus per group inside its clade
    const cons = [];
    for (let g = 0; g < SIZES.length; g++) cons.push(evolve(g < 3 ? ancA : ancB, T_SHALLOW * jit()));

    // members; labels are correct by construction (each sequence is simulated from its own consensus)
    const seqs = [], labels = [];
    for (let g = 0; g < SIZES.length; g++) {
      for (let m = 0; m < SIZES[g]; m++) {
        seqs.push({ header: 'ratehet_g' + g + '_m' + m, seq: evolve(cons[g], T_WITHIN * jit()).join('') });
        labels.push(g);
      }
    }

    // shuffle rows (file order must not matter), keeping labels in step
    const order = seqs.map((v, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    return {
      seqs: order.map(i => seqs[i]),
      labels: order.map(i => labels[i]),
      minSize: MIN_SIZE,
      notes: 'Hard on purpose, and honestly so. About 70% of the columns are identical in EVERY '
        + 'sequence, so most k-mers are shared background: all k-mer distances stay small and the '
        + 'signal is squeezed into a few hot columns. Those columns saturate across the deep split '
        + 'under the 8:1 transition bias (repeated flips and reversions), so a true cross-clade '
        + 'divergence of about 1.0 substitution/site shows up as only about 20% differing columns, '
        + 'versus about 13% between groups of the same clade (true path about 0.18) and about 3% '
        + 'within a group (true path about 0.04). Expect the deep split to be compressed and easy '
        + 'to miss, the two clades to separate imperfectly, while the shallow within-clade structure '
        + 'should still be recoverable. Known limits: all bases are ACGT (no gaps, no ambiguous '
        + 'codes), GC = 0.5, columns have fixed rates across lineages except for branch-length '
        + 'jitter, and because 8/9 of changes are transitions an occasional cross-clade pair shares '
        + 'derived states by chance; on average, though, each group is far more compact than any '
        + 'pair of groups, and the labels are correct by construction.'
    };
  }
};
