// Scenario: mostly-singletons.
// A de novo consensus-style alignment: ~70% of the rows have no true relative at all
// (each is its own label), the remaining ~30% fall into 6-10 real families of 3-8
// members over 400 columns. All labels are known by construction: we recorded which
// family consensus each row was generated from.

const LEN = 400; // alignment columns (fixed for this scenario)

// Seeded PRNG (mulberry32). No Math.random, no require: the scenario is deterministic in `seed`.
function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Branch rate p (per-site substitution probability) whose two independent descendants are
// expected to differ by `target` of the columns: 2*p*(1-p) + (2/3)*p^2 = target.
// (Both mutate to the same wrong base with prob (1/9)p^2 -> they still match.)
function branchRate(target) {
    const disc = 1 - (4 / 3) * target;
    return Math.max(0, (3 / 4) * (1 - Math.sqrt(Math.max(0, disc))));
}

module.exports = {
    id: 'mostly-singletons',
    title: 'De novo consensus set: ~70% unrelated singletons, ~30% in 6-10 small families',
    describe:
        'Models a consensus pool built de novo, where most rows simply have no relative in the set. ' +
        'About 70% of sequences are unrelated singletons (each gets its own unique label), while the ' +
        'other 30% belong to 6-10 real families of 3-8 members, over a 400-column alignment. ' +
        'Unrelated rows differ in 30-50% of columns, family members in only ~10-16%, so real groups exist ' +
        'but the separation is a roughly 2-3x margin rather than an obvious gap. ' +
        'Hard parts: a huge noise pool that looks family-like at random, families sitting right at the ' +
        'minSize 3 edge, and the need to leave 70% of rows alone instead of forcing them into groups.',
    generate(seed) {
        const R = mulberry32((seed ^ 0x6D2B79F5) >>> 0);
        const B = ['A', 'C', 'G', 'T'];
        const pick = (arr) => arr[Math.floor(R() * arr.length)];
        const int = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1)); // inclusive both ends

        // Per-seed divergence targets: 30-50% between unrelated rows, 10-16% within a family.
        const between = 0.30 + 0.20 * R();
        const within = 0.10 + 0.06 * R();
        const pB = branchRate(between);
        const pW = branchRate(within);
        const GAP = 0.004; // per-site chance of a short single-column deletion (kept aligned)

        // Shared ancestral sequence: composition is homogeneous, so only divergence separates rows.
        const root = Array.from({ length: LEN }, () => (R() < 0.5 ? pick(['G', 'C']) : pick(['A', 'T'])));

        // Substitutions only on non-gap columns; gaps are inherited (mutation never refills a '-'),
        // so a deletion made in a family consensus is present in all its members.
        function mutate(parent, p) {
            const out = parent.slice();
            for (let i = 0; i < LEN; i++) {
                const c = out[i];
                if (c === '-') continue;
                if (R() < p) out[i] = pick(B.filter((b) => b !== c));
                if (R() < GAP) out[i] = '-';
            }
            return out;
        }

        // Family layout: 6-10 families of 3-8 members. Singletons are sized so that they are
        // ~70% of the whole alignment (families ~30%).
        const nFam = int(6, 10);
        const sizes = Array.from({ length: nFam }, () => int(3, 8));
        const famTotal = sizes.reduce((a, b) => a + b, 0);
        const nLone = Math.round(famTotal * (0.7 / 0.3));

        const seqs = [];
        const labels = [];
        for (let g = 0; g < nFam; g++) {
            // Family consensus: `between` away from the ancestor, plus one short family-specific
            // deletion (a realistic indel signature that members share).
            const cons = mutate(root, pB);
            const start = int(0, LEN - 9), end = Math.min(LEN, start + int(2, 8));
            for (let i = start; i < end; i++) cons[i] = '-';
            for (let m = 0; m < sizes[g]; m++) {
                seqs.push({ header: 'fam' + g + '_m' + m, _a: mutate(cons, pW) });
                labels.push(g); // true group index: families 0..nFam-1
            }
        }
        for (let i = 0; i < nLone; i++) {
            // Each singleton is an independent lineage off the ancestor (slight rate jitter),
            // i.e. ~30-50% from every other row: it has no true partner, so it gets its own label.
            seqs.push({ header: 'singleton' + i, _a: mutate(root, pB + 0.01 * R()) });
            labels.push(nFam + i); // unique label per singleton (minSize 3 -> all noise)
        }

        // Row order must not matter: shuffle rows and labels together.
        const order = seqs.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            const t = order[i]; order[i] = order[j]; order[j] = t;
        }
        return {
            seqs: order.map((i) => ({ header: seqs[i].header, seq: seqs[i]._a.join('') })),
            labels: order.map((i) => labels[i]),
            minSize: 3,
            notes:
                'Expected: hard, and it punishes methods that must place every row. Exactly ' + nFam +
                ' real families (sizes ' + sizes.join(',') + ', ' + famTotal + ' sequences, ~30%) versus ' +
                nLone + ' unrelated singletons (~70%); every singleton label is unique because no group of ' +
                'minSize 3 exists for it. Family members are ~' + Math.round(within * 100) + '% apart' +
                ' internally, unrelated rows ~' + Math.round(between * 100) + '% apart, so the true' +
                ' within/between ratio is only ~2-3x; nothing approaches the ~75% of random sequences,' +
                ' but the margin is small enough that a greedy nearest-neighbour merge will pull a' +
                ' random singleton into a family (or tear a 3-member family) fairly often. Known limits:' +
                ' some singletons land, by chance, closer to one family than others and cannot be' +
                ' distinguished by any method - they are recoverable only as "noise", so per-group' +
                ' precision/recall is best scored on family rows only. Members also share a short' +
                ' family-specific deletion (2-8 columns), which is a realistic but helpful cue; no' +
                ' duplicates, no lower case/U/N - only ACGT and gaps. Realised divergences vary around' +
                ' the targets with the seed. Deterministic in seed; total rows ' + (famTotal + nLone) + '.'
        };
    }
};
