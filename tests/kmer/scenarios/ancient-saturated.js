'use strict';

// tests/kmer/scenarios/ancient-saturated.js
//
// Ancient, saturated families. Four families diverged in the deep past, so long ago
// that every between-family signal has eroded to background: two sequences taken
// from different families are nearly random with respect to one another (~63-66%
// differing sites, against a 75% baseline for two independent random DNA strings of
// uniform composition). Inside a family the shallow signal is intact, members differ
// at only ~11-14% of sites, so the true groups are perfectly well defined - but the
// grouping is only visible WITHIN a family: nothing in the alignment links the
// families to each other, and no method can recover how they relate.

const ID = 'ancient-saturated';
const N_FAMILIES = 4;
const COLUMNS = 500;
const SIZE_MIN = 15; // inclusive
const SIZE_MAX = 25; // inclusive

// Pairwise difference between two sequences independently mutated from a common
// ancestor, each with per-site change probability p (uniform over the 3 alternatives):
//     P(differ) = 1 - (1-p)^2 - p^2/3 = 2p - (4/3)p^2
// p = 0.46 -> ~63.8% between two family consensuses; member-level noise then lands
// the observed between-family distance around 65%. Saturated, but still under the
// 0.75 random baseline (uniform-composition DNA cannot exceed 75%).
const P_BETWEEN = 0.46;
// p in [0.055, 0.075] -> pairwise differences inside a family of ~10.6%-14.3%.
const P_WITHIN_MIN = 0.055;
const P_WITHIN_SPAN = 0.02;

const FAMILY_TAG = ['A', 'B', 'C', 'D'];
const OTHERS = { A: ['C', 'G', 'T'], C: ['A', 'G', 'T'], G: ['A', 'C', 'T'], T: ['A', 'C', 'G'] };

// mulberry32: small, fast, seedable PRNG. No Math.random anywhere.
function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Substitute each position independently with probability p (returns a new array).
function mutate(src, p, rand) {
  const out = src.slice();
  for (let i = 0; i < out.length; i++) {
    if (rand() < p) {
      const alts = OTHERS[out[i]];
      out[i] = alts[(rand() * 3) | 0];
    }
  }
  return out;
}

// Fisher-Yates on an index array, driven by the seeded PRNG (file order must not matter).
function shuffledIndices(n, rand) {
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = idx[i];
    idx[i] = idx[j];
        idx[j] = t;
  }
  return idx;
}

module.exports = {
  id: ID,
  title: 'Ancient saturated families: between-family signal has decayed to pure noise',
  describe:
    'Four families that diverged long ago, so any pair drawn from different families is ' +
    'almost random relative to the other (~63-66% differing sites vs the 75% baseline of ' +
    'two unrelated uniform-random DNA strings), while two members of the same family still ' +
    'differ at only 10-15% of sites. The four families are therefore real but unconnected: ' +
    'grouping can only ever succeed within a family, never across families. This models deep, ' +
    'saturation-limited alignments (ancient paralogs, deep metagenomic bins) where k-mer or ' +
    'distance methods find shallow clusters but any between-family geometry is information-free.',

  generate(seed) {
    const rand = mulberry32(seed >>> 0 || 1);

    // Common ancestral column set (uniform composition, no gaps: nothing but A/C/G/T).
    const base = () => {
      const r = rand();
      return r < 0.25 ? 'A' : r < 0.5 ? 'C' : r < 0.75 ? 'G' : 'T';
    };
    const founder = [];
    for (let i = 0; i < COLUMNS; i++) founder.push(base());

    // Star phylogeny: each family consensus leaves the same founder independently, with
    // enough divergence to push any pair of them past mutual saturation.
    const sizes = [];
    const cons = [];
    for (let g = 0; g < N_FAMILIES; g++) {
      sizes.push(SIZE_MIN + ((rand() * (SIZE_MAX - SIZE_MIN + 1)) | 0));
      cons.push(mutate(founder, P_BETWEEN, rand));
    }

    // Members: shallow tips hanging off each saturated consensus, per-sequence divergence
    // drawn so pairwise distances inside a family fall in the 10-15% window.
    const seqs = [];
    const labels = [];
    for (let g = 0; g < N_FAMILIES; g++) {
      for (let m = 0; m < sizes[g]; m++) {
        const p = P_WITHIN_MIN + rand() * P_WITHIN_SPAN;
        const arr = mutate(cons[g], p, rand);
        seqs.push({
          header: 'ancient_fam' + FAMILY_TAG[g] + '_s' + String(m + 1).padStart(2, '0'),
          seq: arr.join('')
        });
        labels.push(g);
      }
    }

    const order = shuffledIndices(seqs.length, rand);
    return {
      seqs: order.map(i => seqs[i]),
      labels: order.map(i => labels[i]),
      minSize: 3,
      notes:
        '4 true families (labels 0-3, also tagged in the headers as famA..famD), 15-25 members each, ' +
        '500 columns of pure A/C/G/T, no gaps. Expected pairwise differences: ~11-14% within a family, ' +
        '~64-66% between families (random baseline would be 75%). All four groups are far above ' +
        'minSize, so no noise/singleton handling is exercised. Hard parts: shared k-mers between ' +
        'families are at chance level, so any k-mer distance joining two families is arbitrary and ' +
        'the number of families is only recoverable from the internal within-family contrast; ' +
        'estimating anything DEEPER than the families (a root, a family tree) is impossible by ' +
        'construction. Known limit: within-family distances are small enough that grouping should ' +
        'be easy once a method sees a comparable pair, so this scenario mainly stresses the ' +
        'saturated/deep part of the distance landscape, not boundary cases.'
    };
  }
};
