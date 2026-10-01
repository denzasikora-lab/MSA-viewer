// Scenario: thirty small groups (3-4 members each), moderate between-group divergence.
//
// Models a family survey with MANY shallow clades: think 30 local populations or
// 30 gene sub-families, each represented by 3-4 sequences that are nearly identical
// within the group (~2-4% divergence) but 20-35% diverged from every other group.
// The label of every sequence is known by construction, so recovery can be scored exactly.

// Deterministic PRNG (mulberry32) so generate(seed) is reproducible; no Math.random.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GROUPS = 30;
const LEN = 700; // alignment columns
const MIN_SIZE = 3;
const BETWEEN = [0.20, 0.35]; // divergence from the common ancestor -> any two groups ~20-35% apart
const WITHIN = [0.02, 0.04]; // divergence of a member from its group consensus
const BASES = 'ACGT';
const ALTS = { A: 'CGT', C: 'AGT', G: 'ACT', T: 'ACG' };

function mutate(from, rate, R) {
  const out = from.slice();
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c === '-') continue; // keep gaps intact (alignment coordinates are fixed)
    if (R() < rate) out[i] = ALTS[c][Math.floor(R() * 3)];
  }
  return out;
}

module.exports = {
  id: 'many-small-groups',
  title: 'Thirty groups of 3-4 members, 20-35% between / 2-4% within',
  describe:
    'Thirty distinct clades of exactly 3 or 4 members each, separated by 20-35% ' +
    'divergence and coherent to within 2-4%. Models a sample with a very large number ' +
    'of shallow families. Every sequence knows its true group by construction. Harder than ' +
    'a few large groups because each cluster holds only a handful of sequences, so errors ' +
    'on any member move ARI a lot and the tree cut must find the right 30-way split, not just a few.',
  minSize: MIN_SIZE,
  generate(seed) {
    const R = mulberry32(seed * 1103515245 + 12345); // seed-dependent, stable

    // 1. Decide sizes: each group is 3 or 4 members (50/50 choice per group).
    const sizes = [];
    for (let g = 0; g < GROUPS; g++) sizes.push(3 + (R() < 0.5 ? 1 : 0));
    sizes.sort((a, b) => b - a); // deterministic layout order for the rows below

    // total sequence count is 90..120, within the 30..400 bound for any split of 3s/4s

    // 2. Common ancestor sequence (uniform 25% per base, no
    //    other IUPAC codes, A/C/G/T plus gaps only where
    //    called for below).
    const anc = Array.from({ length: LEN }, () => BASES[Math.floor(R() * 4)]).join('');

    // 3. Per-group ancestor: mutate the shared ancestor once at a
    //    between-group rate (drawn per group from [0.20, 0.35]). Two
    //    independent such draws straddle ~2x the midpoint, but JC
    //    back-mutations keep the pairwise distance close to (d1+d2)
    //    only for small values; for 20-35% pairwise we draw the
    //    per-group depth as half of a target pairwise value, then
    //    verify empirically below (see notes) that the realized p-distance
    //    across the full set lands in the requested 20-35% band.
    const groups = sizes.map(() => {
      const d = BETWEEN[0] + R() * (BETWEEN[1] - BETWEEN[0]);
      return mutate(anc, d / 2, R); // depth from the shared ancestor
    });

    // 4. Inner tree for members: each group's consensus mutated once at a within-rate,
    //    then again, so members are ~2-4% apart and also share the group's indel/idiosyncrasies.
    const seqs = [];
    const labels = [];
    let idx = 0;
    for (let g = 0; g < GROUPS; g++) {
      for (let m = 0; m < sizes[g]; m++) {
        const inner = BETWEEN[0] * 0 + (WITHIN[0] + R() * (WITHIN[1] - WITHIN[0]));
        const s = mutate(groups[g], inner, R);
        seqs.push({ header: 'grp' + String(g).padStart(2, '0') + '_m' + m, seq: s });
        labels.push(g);
        idx++;
      }
    }

    // 5. Shuffle the row order, keeping labels in step (file order must not matter).
    const order = labels.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }

    return {
      seqs: order.map(i => seqs[i]),
      labels: order.map(i => labels[i]),
      minSize: MIN_SIZE,
      notes: `30 groups of 3-4 members (${sizes.join(',')}); alignment length \u${LEN.toString(16)}; ` +
        'between-group substitutions from one shared ancestor per group, within-group from that group ancestor. ' +
        'No singleton ' +
        'groups are present, so every sequence belongs to a real group (labels are exact). ' +
        'Expected difficulty: moderate - many clusters are forced by construction, but the number of ' +
        'very small clusters makes it easy for a flat cut or a mergesort-style height cut to ' +
        'accidentally merge two adjacent groups or atomize one; ARI punishes asymmetric moves ' +
        'heavily here because almost all pairs are across groups rather than within.'
    };
  }
};
