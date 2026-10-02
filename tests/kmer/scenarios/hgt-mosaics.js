'use strict';

/*
 * Scenario: hgt-mosaics
 *
 * Five families that relate to each other the way genomes do after
 * horizontal transfer: every family carries ONE conserved core region
 * (40% of the alignment, identical in all families), while the remaining
 * 60% is a family-specific mosaic of accessory segments imported from a
 * small pool of unrelated donors. Within-family divergence is ~3%.
 *
 * Layout of the 500 alignment columns (same for every family):
 *
 *   columns   0.. 99  accessory segment 0  (100 cols, family-specific donor)
 *   columns 100..299  CONSERVED CORE       (200 cols, 40%, shared by all)
 *   columns 300..399  accessory segment 1  (100 cols, family-specific donor)
 *   columns 400..499  accessory segment 2  (100 cols, family-specific donor)
 */

const ALN_LEN = 500;
const CORE_START = 100;
const CORE_LEN = 200;              // 200 / 500 = 40% of the alignment
const SEG_LEN = 100;
const SEG_STARTS = [0, 300, 400];  // start column of each accessory segment
const N_FAMILIES = 5;
const N_DONORS = 4;                // distinct donor variants per segment
const WITHIN = 0.03;               // mean substitutions/site within a family

// Which donor each family uses for accessory segments 0, 1, 2.
// Chosen so that any two families differ in at least 2 of the 3 segments:
// exactly the pairs (0,4), (1,4) and (3,4) share one whole segment each,
// as often happens between mosaic genomes.
const DONOR_PLAN = [
  [0, 1, 2],
  [1, 2, 3],
  [2, 3, 0],
  [3, 0, 1],
  [0, 2, 1],
];

const TRANSITION = { A: 'G', G: 'A', C: 'T', T: 'C' };
const TRANSVERSION = { A: ['C', 'T'], C: ['A', 'G'], G: ['C', 'T'], T: ['A', 'G'] };

// Seeded PRNG (mulberry32). No Math.random anywhere in this module.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = {
  id: 'hgt-mosaics',
  title: 'HGT mosaics: five families sharing a conserved 40% core but distinct accessory segments',
  describe: 'Models genomes shaped by horizontal gene transfer. All 5 families carry one identical conserved core region of 200 of 500 columns (columns 100-299, 40% of the alignment), so every row looks like every other row over a large part of the alignment. The remaining 60% is a mosaic of three accessory segments drawn from a pool of unrelated donors, giving each family its own combination, and three family pairs even share a whole segment. Within-family divergence is about 3%. The long shared core dilutes the k-mer signal that separates families, and partially shared accessory segments pull some families towards each other.',
  generate(seed) {
    const R = mulberry32((Number(seed) >>> 0) || 1);
    const pick = (list) => list[Math.floor(R() * list.length)];
    const base = () => (R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));

    // Jukes-Cantor probability that a site differs, for divergence d subs/site.
    const jcP = (d) => 0.75 * (1 - Math.exp((-4 / 3) * d));

    // Mutate a consensus row at divergence d (gap columns stay gaps).
    function mutate(row, d) {
      const p = jcP(d);
      const out = row.slice();
      for (let i = 0; i < out.length; i++) {
        const c = out[i];
        if (c === '-') continue;
        if (R() < p) out[i] = R() < 0.55 ? TRANSITION[c] : pick(TRANSVERSION[c]);
      }
      return out;
    }

    // Conserved core: identical in every family (this is the hard part).
    const core = [];
    for (let i = 0; i < CORE_LEN; i++) core.push(base());

    // Accessory donor segments: independent origins, as if imported from
    // unrelated genomes; some carry a short internal gap run that every
    // family using that donor will share (aligned gaps).
    const donors = [];
    for (let s = 0; s < SEG_STARTS.length; s++) {
      const pool = [];
      for (let d = 0; d < N_DONORS; d++) {
        const seg = [];
        for (let i = 0; i < SEG_LEN; i++) seg.push(base());
        if (R() < 0.35) {
          const runLen = 2 + Math.floor(R() * 4);
          const at = 1 + Math.floor(R() * (SEG_LEN - runLen - 1));
          for (let i = at; i < at + runLen; i++) seg[i] = '-';
        }
        pool.push(seg);
      }
      donors.push(pool);
    }

    // Family consensuses: shared core + the family's own mosaic of donors.
    const cons = [];
    for (let f = 0; f < N_FAMILIES; f++) {
      const row = new Array(ALN_LEN);
      for (let i = 0; i < CORE_LEN; i++) row[CORE_START + i] = core[i];
      for (let s = 0; s < SEG_STARTS.length; s++) {
        const start = SEG_STARTS[s];
        const seg = donors[s][DONOR_PLAN[f][s]];
        for (let i = 0; i < SEG_LEN; i++) row[start + i] = seg[i];
      }
      cons.push(row);
    }

    // Family sizes: 12-40 members each, so the total is always 60-200.
    const sizes = [];
    for (let f = 0; f < N_FAMILIES; f++) sizes.push(12 + Math.floor(R() * 29));
    const total = sizes.reduce((a, b) => a + b, 0);

    // Members: each family consensus mutated at ~3% (spread 2.1%-3.9%).
    const rows = [];
    for (let f = 0; f < N_FAMILIES; f++) {
      for (let m = 0; m < sizes[f]; m++) {
        const d = WITHIN * (0.7 + 0.6 * R());
        const tag = m < 10 ? '0' + m : '' + m;
        rows.push({
          header: 'fam' + f + '_mosaic_' + tag,
          seq: mutate(cons[f], d).join(''),
          label: f,
        });
      }
    }

    // Shuffle rows so the file order does not encode the answer.
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      const tmp = rows[i];
      rows[i] = rows[j];
      rows[j] = tmp;
    }

    return {
      seqs: rows.map((r) => ({ header: r.header, seq: r.seq })),
      labels: rows.map((r) => r.label),
      minSize: 3,
      notes: 'Adversarial for k-mer grouping: columns ' + CORE_START + '-' + (CORE_START + CORE_LEN - 1) +
        ' (' + CORE_LEN + ' of ' + ALN_LEN + ', the 40% conserved core) are the SAME in all ' + N_FAMILIES +
        ' families, so all rows look alike over a large part of the alignment; only the 300 accessory ' +
        'columns carry family signal, and family pairs (0,4), (1,4) and (3,4) share one 100-column accessory ' +
        'segment each. Expected pairwise identity is ~97% within a family versus ~40% (no shared segment) to ' +
        '~68% (one shared segment) between families, so members are still closest to their own family. This ' +
        'seed gives ' + sizes.join('/') + ' members per family, ' + total + ' sequences, 500 columns for ' +
        'every row, no length variation and no singletons; every group exceeds minSize 3, so no noise ' +
        'relabelling applies. Gap columns exist only as short runs inside donor segments and are carried ' +
        'identically by all families that use that donor.',
    };
  },
};
