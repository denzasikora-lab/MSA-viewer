// Scenario module per tests/kmer/SCENARIO_CONTRACT.md: ONE synthetic ALIGNMENT whose
// group labels are correct BY CONSTRUCTION.  No require, no I/O, no Math.random;
// everything below is driven by a mulberry32 PRNG, so generate(seed) is deterministic.
//
// Taxonomy modelled:  one ancestor  ->  3 families  ->  2..4 subfamilies per family
// -> 12..20 copies per subfamily.  The labels returned are the LEAF level, i.e. the
// subfamilies: copies of one subfamily share a label, while two subfamilies of the
// same family get DIFFERENT labels even though they are each other's closest
// out-group.  Realised mean p-distances come out layered, roughly
//     within subfamily  ~0.02   <   sibling subfamilies  ~0.09-0.15   <   families  ~0.25-0.30
// so the leaf labels are a genuine finest partition: no cross-group pair is closer
// than an in-group pair (2*dLeaf <= 0.022 versus 2*dSub >= 0.09 by construction).
//
// What is hard here (and what this scenario is meant to expose):
//  * Depth of the cut.  Recovering the 3 FAMILY level is a defensible biological
//    answer, yet it scores badly against these leaf labels; full credit needs k-mer
//    distances and a group count that resolve the fine level.
//  * Non-ultrametric tree.  Family and subfamily branch lengths are drawn from
//    ranges, so sibling subfamilies are unevenly spaced and some families are much
//    tighter than others.
//  * ts/tv bias of 60% means even distant families still share many k-mers, so
//    k-mer distances saturate earlier than a uniform-rate model predicts.
//  * GC is flat (~0.47) in every group, so composition-based shortcuts earn
//    nothing; only shared derived columns separate the groups.
//  * Indels are only inherited block deletions (family- or subfamily-wide gap
//    blocks) plus rare private single-column gaps - realistic aligned-gap noise,
//    not shredded fragments.

const ALTS = { A: 'GCT', G: 'ACT', C: 'TAG', T: 'CAG' }; // [0] transition, [1..2] transversions

function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Substitutions at expected Jukes-Cantor distance d (tsBias = P(substitution is a
// transition)); colGapP opens private gap columns.  Length never changes, so every
// descendant stays aligned to the ancestor.
function mutate(R, seq, d, tsBias, colGapP) {
  const p = 0.75 * (1 - Math.exp(-(4 / 3) * d));
  const out = seq.slice();
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c === '-') continue;                    // an ancestral gap is never re-filled
    if (colGapP && R() < colGapP) { out[i] = '-'; continue; }
    if (R() < p) out[i] = R() < tsBias ? ALTS[c][0] : ALTS[c][1 + Math.floor(R() * 2)];
  }
  return out;
}

// Inherited deletions: nBlocks random blocks turned into gap columns.
function blockGaps(R, seq, nBlocks, minLen, maxLen) {
  const out = seq.slice();
  for (let b = 0; b < nBlocks; b++) {
    const len = minLen + Math.floor(R() * (maxLen - minLen + 1));
    const at = Math.floor(R() * Math.max(1, out.length - len));
    for (let i = at; i < Math.min(out.length, at + len); i++) if (out[i] !== '-') out[i] = '-';
  }
  return out;
}

module.exports = {
  id: 'family-hierarchy',
  title: '3 families x 2-4 subfamilies x 12-20 copies, labelled at the subfamily (leaf) level',
  describe: 'Three repeat-like families radiate from one ancestral consensus; each family splits into 2-4 subfamilies and each subfamily into 12-20 imperfect copies, so the truth is a nested tree and the labels name the leaves. The hard part is the depth of the cut rather than the separation: a k-mer method that resolves only the 3 families is biologically defensible yet scores badly against these leaf labels. The tree is also non-ultrametric (branch lengths drawn from ranges, so sibling subfamilies are unevenly spaced), transitions are favoured over transversions, GC is flat everywhere, and deletions survive only as shared family-wide gap blocks plus rare private gap columns. Labels come straight from the generator, so they are exact, and nothing here is adversarial: expect partial credit for a family-level answer and full credit only when sibling subfamilies are separated.',
  generate(seed) {
    const R = mulberry32(seed);
    const L = 640, GC = 0.47, TS = 0.6;      // columns, GC content, transition share
    const ancestor = Array.from({ length: L }, () => R() < GC ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));

    const subfams = [];                      // one entry per TRUE group, built in family order
    for (let f = 0; f < 3; f++) {
      const dFam = 0.15 + 0.06 * R();         // family branch: range -> non-ultrametric
      const famC = blockGaps(R, mutate(R, ancestor, dFam, TS, 0), 2 + Math.floor(R() * 3), 6, 24);
      const nSub = 2 + Math.floor(R() * 3);   // 2..4 subfamilies per family
      for (let s = 0; s < nSub; s++) {
        const dSub = 0.045 + 0.035 * R();     // uneven split inside the family
        subfams.push({
          fam: f, sf: s,
          cons: blockGaps(R, mutate(R, famC, dSub, TS, 0), 1 + Math.floor(R() * 2), 2, 9),
          dLeaf: 0.006 + 0.005 * R(),         // copy drift, always far below dSub
          copies: 12 + Math.floor(R() * 9)    // 12..20 copies of this subfamily
        });
      }
    }

    const seqs = [], labels = [];
    subfams.forEach((g, gi) => {
      for (let c = 0; c < g.copies; c++) {
        seqs.push({ header: 'F' + g.fam + '_S' + g.sf + '_c' + c, seq: mutate(R, g.cons, g.dLeaf, TS, 0.004).join('') });
        labels.push(gi);                      // gi = subfamily index = the true group
      }
    });

    const idx = seqs.map((_, i) => i);        // shuffle rows: file order must carry no signal
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }

    return {
      seqs: idx.map(i => seqs[i]),
      labels: idx.map(i => labels[i]),
      minSize: 3,
      notes: 'Shock figures: 3 families, 2-4 subfamilies each (so 6-12 true groups and roughly 100-250 sequences total), 640 aligned columns. Score against the number of DISTINCT labels, which varies with the seed; a family-level reconstruction lumps 2-4 true groups per family and lands at a low but usually non-zero ARI. Expected difficulty: moderate - k must be large enough to separate sibling subfamilies yet small enough that 12-20 copies give enough k-mers, and auto group-count estimates may drift toward the family level. Known limits: copy numbers and the spacing of siblings vary with the seed, and the generator only guarantees 2*dLeaf < 2*dSub, so a run can have a tight subfamily pair or just 6 groups; real distances also scatter around the JC means, so a few individual copies can sit nearer a sibling subfamily than to their own consensus.'
    };
  }
};
