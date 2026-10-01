// Scenario "dominant-family": one huge family plus four small ones.
// Models the classic bacterial-protein situation: a single family (e.g. the dominant
// paralogue group / the most-sampled taxon) fills most of the alignment, while four
// genuinely different but TINY families (3-6 members) hide in its shadow.
//
// Why it is hard: with ~88% of rows in one group, most pairwise distances are within
// the big family, so any estimator that looks only at how distances are distributed
// (or that balances cluster sizes) will "cleanly" split the big family into pieces and
// merge the small families into it. The small families are separated from the big one
// only by 10-20% divergence, i.e. only 2-7x their own 1-3% within-family spread, so
// they are real, well-defined groups but sit at the edge of the big family's variance.
// The correct answer has 5 groups, four of them tiny -- a strong test of whether the
// method can keep small, well-separated clusters while leaving 150+ near-identical
// sequences in one piece.

function rng(seed) { // mulberry32
  let a = (seed >>> 0) + 0x6D2B79F5 | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BTS = { A: 'G', G: 'A', C: 'T', T: 'C' };
const TV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };

// Jukes-Cantor-ish per-site substitution draw; mild ts/tv bias to look protein-coding.
function mutate(seq, rate, R) {
  const p = 0.75 * (1 - Math.exp(-4 / 3 * rate));
  const out = seq.slice();
  for (let i = 0; i < OUT.length; i++) {
    const c = out[i]; if (c === '-') continue;
    if (R() < p) {
      const alts = R() < 0.6 ? [BTS[c]] : TV[c];
      out[i] = alts[Math.floor(R() * alts.length)];
    }
  }
  return out;
}

const LEN = 700;            // alignment columns
const BIG = 152;            // members of the dominant family
const SMALL = [6, 5, 4, 3]; // members of the 4 minor families

module.exports = {
  id: 'dominant-family',
  title: 'One 150-member dominant family swamping four tiny (3-6 member) families',
  describe: 'One family has 152 members that differ from each other by only 1-3%, so it '
    + 'dominates every distance distribution; four further families of 6, 5, 4 and 3 '
    + 'members sit 10-20% away from it and from each other. The difficulty is size bias: '
    + 'a method that balances cluster sizes or reads structure off the whole distance '
    + 'histogram will tend to shred the dominant family and absorb the small ones.',

  generate(seed) {
    const R = rng((seed >>> 0) || 1);
    // founding sequence, one consensus per family: each minor consensus diverged from
    // the dominant consensus by a distance drawn INSIDE the 10-20% band (rate in the
    // JC sense, i.e. expected substitutions per site).
    const root = Array.from({ length: LEN }, () => 'ACGT'[Math.floor(R() * 4)]);
    const cons = [root.slice()];
    for (let g = 1; g <= 4; g++) {
      cons.push(mutate(root, 0.10 + R() * 0.10, R)); // between-family divergence 10-20%
    }

    // members: small mutation rate drawn inside the 1-3% band, so within < between
    // by construction -- every member is closer to its own consensus (and hence to its
    // family, on average) than to any other family's consensus.
    const seqs = [], labels = [];
    for (let g = 0; g < 5; g++) {
      const size = g === 0 ? BIG : SMALL[g - 1];
      for (let m = 0; m < size; m++) {
        const within = 0.01 + R() * 0.02;           // 1-3% within-family rate
        const s = mutate(cons[g], within, R).join('');
        seqs.push({ header: (g === 0 ? 'dom_' : 'fam' + g + '_') + m, seq: s });
        labels.push(g);
      }
    }

    // a few incidental single-residue indels, gap-aligned (keeps all rows equal length)
    for (const q of seqs) {
      if (R() < 0.15) {
        const i = Math.floor(R() * LEN), l = 1 + Math.floor(R() * 2);
        q.seq = q.seq.slice(0, i) + '-'.repeat(l) + q.seq.slice(i + l);
      }
    }

    // shuffle rows so file order carries no signal
    const idx = seqs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return {
      seqs: idx.map(i => seqs[i]),
      labels: idx.map(i => labels[i]),
      minSize: 3,
      notes: '170 sequences, ' + LEN + ' columns, 5 true groups (152/6/5/4/3). '
        + 'Realised p-distance is ~10-20% between family consensuses and ~1-3% within '
        + 'families, so the labels are valid (within < between on average) but the '
        + 'margin is only ~7x. Known hard parts: (a) the dominant family is 89% of rows '
        + 'and internally has a smooth continuum of pairwise distances, so balanced-size '
        + 'stopping rules will over-split it while the tiny families may be merged into '
        + 'it; (b) groups of 3-6 are near the "noise" threshold in minSize terms, but '
        + 'they are genuinely homogeneous, so a method that discards small clusters as '
        + 'noise is wrong here; (c) ARI is dominated by the big group -- getting the four '
        + 'small families right barely moves the score, so check them separately. '
        + 'Overall difficulty: moderate.'
    };
  }
};
