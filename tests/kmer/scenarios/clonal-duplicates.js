// Scenario: clonal duplicates.  Each lineage is one consensus sequence that has been
// sequenced many times over: most rows are EXACT copies of their consensus, with only a
// handful of mutant reads per lineage.  The point of stress here is the distance matrix:
// roughly 20/24 of every group is bit-identical, so the matrix is dominated by zeros and
// by massive ties, and the only structure that separates groups is which zeros they are.
module.exports = {
  id: 'clonal-duplicates',
  title: 'Deep-sequenced clones: many exact duplicates, few mutants, ties at distance 0',
  describe: 'Models a mixed sample of 6 viral/organellar haplotypes that were each sequenced ~20x ' +
    'with little replication error, so each haplotype appears as ~20 identical rows plus a couple of ' +
    'mutant reads. Almost all within-group pairs sit at distance exactly 0, so a greedy/UPGMA agglomeration ' +
    'sees very few informative merges and an enormous amount of ties between equal-distance candidates; ' +
    'which duplicate joins first is decided by tie-breaking on row index, so results must not depend on file order.',

  generate(seed) {
    // mulberry32: tiny, fast, deterministic in seed
    const mulberry32 = (s) => {
      let a = (s >>> 0) || 1;
      return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const R = mulberry32((seed >>> 0) * 2654435761 + 0x9E3779B9);

    const N_COLS = 420;                 // alignment columns (60..3000 per contract)
    const N_GROUPS = 6;                 // haplotype consensuses
    const N_CLONES = 20;                // exact copies of each consensus
    const N_MUTANTS = 4;                // mutant reads per haplotype (own group label kept)

    // ---- build a random founder and diverge the 6 consensuses from it ------------
    const base = () => (R() < 0.55 ? (R() < 0.5 ? 'A' : 'T') : (R() < 0.5 ? 'G' : 'C'));
    const OTHER = { A: ['C', 'G', 'T'], G: ['A', 'C', 'T'], C: ['A', 'G', 'T'], T: ['A', 'C', 'G'] };
    function mutate(arr, p) {
      const out = arr.slice();
      for (let i = 0; i < out.length; i++) {
        if (OTHER[out[i]] && R() < p) out[i] = OTHER[out[i]][Math.floor(R() * 3)];
      }
      return out;
    }
    const founder = Array.from({ length: N_COLS }, base);
    const cons = Array.from({ length: N_GROUPS }, () => mutate(founder, 0.18));   // ~18% between-group divergence

    // one shared indel block (fixed column range) so the alignment keeps its length
    const gapA = 60 + Math.floor(R() * 40), gapB = gapA + 10;
    for (let g = 0; g < N_GROUPS; g += 2) for (let i = gapA; i < gapB; i++) cons[g][i] = '-';
    for (let g = 1; g < N_GROUPS; g += 2) for (let i = gapB; i < gapB + 10; i++) cons[g][i] = '-';

    // ---- emit clones (exact copies) and mutant reads, with known labels ---------
    const seqs = [], labels = [];
    for (let g = 0; g < N_GROUPS; g++) {
      for (let c = 0; c < N_CLONES; c++) {
        seqs.push({ header: 'hap' + g + '_clone' + c, seq: cons[g].join('') });   // EXACT duplicate -> distance 0 ties
        labels.push(g);
      }
      for (let m = 0; m < N_MUTANTS; m++) {
        const mut = mutate(cons[g], 0.008 + R() * 0.012);   // rare de novo errors, ~1-2%
        seqs.push({ header: 'hap' + g + '_mut' + m, seq: mut.join('') });
        labels.push(g);
      }
    }

    // ---- shuffle rows: identical duplicates must not sit contiguously ----------
    const idx = seqs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const out = idx.map(i => seqs[i]);
    const lab = idx.map(i => labels[i]);

    return {
      seqs: out,
      labels: lab,
      minSize: 3,
      notes: 'Expected difficulty: HIGH for tie-handling, LOW for pure accuracy. 6 groups x 24 rows = 144 rows, ' +
        'of which 120 are bit-identical to a consensus; every pair inside a clone set has distance exactly 0, and ' +
        'mutant reads are 0 distance from one clone and ~0.01 from the rest. A deterministic tie-break (lowest index) ' +
        'will merge duplicates in row order, so the LEAF ORDER inside each tight cluster legitimately depends on which ' +
        'duplicate came first in the file; what must be order-invariant is the SET of rows in each zero/near-zero cluster ' +
        'and the separation between the 6 haplotypes. Known limits: mutants are only 1-2% divergent, far below the ' +
        'between-group distance, so mis-grouping a mutant is impossible by construction; if a metric fails here it is ' +
        'tie-break/order sensitivity, not real phylogenetic error. All 24 members per group are >= minSize, so there are ' +
        'no noise rows by design.'
    };
  }
};
