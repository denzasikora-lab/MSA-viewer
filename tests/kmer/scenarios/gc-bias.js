// Scenario "gc-bias": five lineages that differ almost only by BASE COMPOSITION
// (whole-genome GC drift from 30% to 65%), each mutating under one and the same
// substitution model. Every member is 5-8% substitutions away from its own group
// founder, so labels[i] is known by construction (ancestry), independent of any
// similarity measure -- see tests/kmer/SCENARIO_CONTRACT.md.

// mulberry32: small seeded PRNG (deterministic in `seed`, no Math.random).
function rng(seed) {
    let a = (Math.floor(Math.abs(seed)) || 1) >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t = t ^ Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const GC0 = 0.30;      // group 0 founder GC
const GCSTEP = 0.0875; // -> groups at 30, 38.75, 47.5, 56.25, 65 %
const SIZES = [13, 9, 11, 8, 10]; // 51 rows, uneven on purpose
const LEN = 520;       // alignment columns (all rows uppercase ACGT, no gaps in this scenario)
const WITHIN_LO = 0.05, WITHIN_HI = 0.08; // member-vs-founder substitutions per site
const TS = 0.55;       // transition weight, IDENTICAL in every group: mutational pattern is not the signal
const TRANS = { A: 'G', G: 'A', C: 'T', T: 'C' };       // A<->G, C<->T
const TRAV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] }; // the rest are transversions

// Random sequence drawn from a given base composition (GC = gc, else AT).
function founder(R, gc) {
    const s = new Array(LEN);
    for (let i = 0; i < LEN; i++) {
        const r = R(); // one draw decides GC vs AT, the second which base within the pair,
        s[i] = r < gc ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'); // so realised GC ~ target
    }
    return s;
}

// Substitutions at independent sites; same model (same TS weight) in every group.
function substitute(R, arr, rate) {
    for (let i = 0; i < LEN; i++) {
        if (R() < rate) {
            arr[i] = R() < TS ? TRANS[arr[i]] : TRAV[arr[i]][R() < 0.5 ? 0 : 1];
        }
    }
    return arr;
}

// gc of group g (kept as a function so the composition ladder is written once).
function gcTarget(g) { return GC0 + g * GCSTEP; }

function generate(seed) {
    const R = rng(seed);
    const seqs = [], labels = [];
    for (let g = 0; g < SIZES.length; g++) {
        const f = founder(R, gcTarget(g)); // one unrelated founder per group
        for (let m = 0; m < SIZES[g]; m++) {
            const rate = WITHIN_LO + (WITHIN_HI - WITHIN_LO) * R(); // 5-8%, row-specific
            const s = substitute(R, f.slice(), rate);
            seqs.push({ header: 'lin' + g + '_m' + m, seq: s.join('') });
            labels.push(g); // ground truth: which founder this row came from
        }
    }
    // Shuffle the row order (file order must not matter), keeping labels in step.
    const idx = seqs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(R() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return {
        seqs: idx.map(i => seqs[i]),
        labels: idx.map(i => labels[i]),
        minSize: 5, // smallest group has 8 members, so no row is demoted to noise
        notes: 'Correct by construction: labels record ancestry (each row is ~5-8% substitutions ' +
            'from its own founder, one shared ts/tv model everywhere), so within-group p-distance is ' +
            '~9-16% while founders are unrelated (~70-80%); members are far more similar to each ' +
            'other than to other groups. What is hard: the ONLY between-group signal is composition. ' +
            'At small k the shared-k-mer profile of a row is largely its composition, and adjacent ' +
            'bands are only 8.75 GC-points apart while at L=520 a row\'s realised GC wanders ~sigma 2.2 ' +
            'points, so band edges overlap; the GC 47.5% / 56.25% neighbours in particular share ' +
            'most 3-4-mers by chance, and pairwise distances look like one monotone gradient, so ' +
            'greedy guides tend to chain along the GC axis (ladder merges) rather than split five ' +
            'families cleanly. A run can also look right for a mixture of reasons here: clustering ' +
            'by composition coincides with the true groups, so a high score at k=3-4 says little more ' +
            'than "the gradient was recovered in order". At k>=7-8, ~35 substitutions per row destroy ' +
            'only ~k*35 k-mers of ~520, so exact anchors make recovery near-perfect; failures there ' +
            'would be interesting. Not tested: gaps/indels, mixed case, N/U, singletons; unequal group ' +
            'sizes (13/9/11/8/10) pressure the auto group-count estimate.'
    };
}

module.exports = {
    id: 'gc-bias',
    title: 'five GC bands (30-65%), one mutation model, 5-8% within-group divergence',
    describe: 'Five lineages whose founders differ almost purely by base composition ' +
        '(GC 30, 38.75, 47.5, 56.25, 65%), while every group mutates under the same ' +
        'substitution model (same ts/tv weight), so composition rather than a shared ' +
        'mutational pattern is the only between-group signal. Each member carries 5-8% ' +
        'substitutions from its own founder. Hard for k-mer sharing because small-k spectra ' +
        'are dominated by composition: neighbouring bands are close enough (8.75 GC points, ' +
        'realised-GC noise ~2.2 points at L=520) for adjacent groups to share most small ' +
        'k-mers by chance, so the measure sees a monotone GC gradient rather than five ' +
        'discrete families.',
    generate: generate
};
