// tests/kmer/scenarios/two-scales.js
//
// Scenario 'two-scales': ONE synthetic alignment with TWO equally meaningful
// levels of real structure, 400 columns, seeded, row-shuffled.
//
//   4 superfamilies                 ~30% apart from each other
//     x 3 subfamilies each          ~8%  apart within a superfamily
//       x 13-15 members each        ~1%  apart within a subfamily
//
// GROUND-TRUTH LABELS ARE THE LEAF (SUBFAMILY) LEVEL: 12 groups, ids 0-11 in
// superfamily-major order, so label = superfamily * 3 + subfamily and
// Math.floor(label / 3) gives the SUPERFAMILY, which is an equally valid
// coarser answer (4 groups). Divergences are calibrated as realised MEAN
// PAIRWISE p-distances, not raw branch lengths (see xForPairwise() and
// marginalEdge() below).
//
// Contract: tests/kmer/SCENARIO_CONTRACT.md - CommonJS module, no require, no
// file/network access, no Math.random, deterministic in `seed`, shuffled rows.

'use strict';

// ------------------------------------------------------------------ shape
const ID = 'two-scales';
const N_SUPER = 4;            // superfamilies (the coarse scale)
const N_SUB_PER_SUPER = 3;    // subfamilies per superfamily (the fine scale)
const COLS = 400;             // alignment columns, every sequence
const MIN_SIZE = 3;          // all groups here have 13-15 members, so no noise labels

// Target MEAN PAIRWISE p-distances: the expected fraction of differing aligned
// columns between two sequences drawn from the respective groups.
const D_SUPER = 0.30;        // member of superfamily A vs member of superfamily B
const D_SUB = 0.08;          // members of two subfamilies of the SAME superfamily
const D_MEMBER = 0.01;       // two members of the same subfamily

// Rows: 12 subfamilies with 6-10 members each would cap at 12*10 = 120 rows,
// below the required 150-250 row window, so each subfamily instead holds
// 13-15 members (12*13 = 156 .. 12*15 = 180 rows). See `notes` in the output.
const MEMBER_MIN = 13;
const MEMBER_SPREAD = 3;

const OTHERS = { A: ['C', 'G', 'T'], C: ['A', 'G', 'T'], G: ['A', 'C', 'T'], T: ['A', 'C', 'G'] };

// mulberry32: small seeded PRNG, returns floats in [0, 1); no Math.random.
function mulberry32(a) {
    let s = a >>> 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Founder sequence alphabet: GC content 0.5, uniform over A/C/G/T.
function randomBase(R) {
    return R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T');
}

// Independent-site mutation: with probability b a non-gap letter is replaced by
// a uniformly random OTHER letter. Two independent children of one parent, each
// mutated with flip probability x, differ at 2x - (4/3)x^2 of the sites on
// average (when both sites flip, the two new letters coincide 1/3 of the time).
function mutate(parent, b, R) {
    const out = new Array(parent.length);
    for (let i = 0; i < parent.length; i++) {
        let c = parent[i];
        if (R() < b) c = OTHERS[c][(R() * 3) | 0];
        out[i] = c;
    }
    return out;
}

// Per-child flip probability that realises a mean pairwise distance p
// (inverts 2x - (4/3)x^2 = p; the maximum reachable distance is 0.75 at x = 0.75).
function xForPairwise(p) {
    const s = 1 - (4 / 3) * p;
    return s <= 0 ? 0.75 : 0.75 * (1 - Math.sqrt(s));
}

// Mutation edges in series compose as b1 (+) b2 = b1 + b2 - (4/3) b1 b2, so a
// shallower edge needs a smaller marginal flip. Given the per-side total xTotal
// already contributed by deeper levels (xBelow), solve for the marginal flip.
function marginalEdge(xTotal, xBelow) {
    return (xTotal - xBelow) / (1 - (4 / 3) * xBelow);
}

function generate(seed) {
    const R = mulberry32((((seed >>> 0) ^ 0x6D2B79F5) >>> 0) || 1);

    // Solve the three branch lengths bottom-up so the LEAF-TO-LEAF mean pairwise
    // distances equal the targets D_MEMBER / D_SUB / D_SUPER.
    const xMember = xForPairwise(D_MEMBER);                    // subfamily centre -> member
    const xFromSuper = xForPairwise(D_SUB);                     // superfamily centre -> member
    const branchSub = marginalEdge(xFromSuper, xMember);        // superfamily -> subfamily centre
    const xFromRoot = xForPairwise(D_SUPER);                    // root -> member
    const branchSuper = marginalEdge(xFromRoot, xFromSuper);    // root -> superfamily centre

    // Root founder.
    const root = new Array(COLS);
    for (let i = 0; i < COLS; i++) root[i] = randomBase(R);

    // Superfamily -> subfamily -> member cascade.
    const seqs = [];
    const labels = [];
    for (let s = 0; s < N_SUPER; s++) {
        const superCons = mutate(root, branchSuper, R);
        for (let t = 0; t < N_SUB_PER_SUPER; t++) {
            const subCons = mutate(superCons, branchSub, R);
            const label = s * N_SUB_PER_SUPER + t;               // 0..11, label = superfamily * 3 + subfamily
            const nMembers = MEMBER_MIN + ((R() * MEMBER_SPREAD) | 0); // 13, 14 or 15
            for (let m = 0; m < nMembers; m++) {
                const member = mutate(subCons, xMember, R);
                seqs.push({ header: ID + '_sf' + s + '_sub' + t + '_m' + m, seq: member.join('') });
                labels.push(label);
            }
        }
    }

    // Row-count window required by the scenario spec (156-180 realised).
    if (seqs.length < 150 || seqs.length > 250) {
        throw new Error(ID + ': generated ' + seqs.length + ' rows, expected 150-250');
    }

    // Shuffle the rows (file order must not matter); labels move in step.
    const order = seqs.map(function (_s, i) { return i; });
    for (let i = order.length - 1; i > 0; i--) {
        const j = (R() * (i + 1)) | 0;
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    const outSeqs = order.map(function (i) { return seqs[i]; });
    const outLabels = order.map(function (i) { return labels[i]; });

    return {
        seqs: outSeqs,
        labels: outLabels,
        minSize: MIN_SIZE,
        notes: 'GROUND TRUTH IS THE LEAF (SUBFAMILY) LEVEL: labels are the 12 subfamilies, ids 0-11 in superfamily-major order (label = superfamily * 3 + subfamily), 13-15 members each, so a perfect clustering returns 12 groups. THE SUPERFAMILY LEVEL IS ALSO A VALID ANSWER: grouping sequences by Math.floor(label / 3) gives the 4 superfamilies, and a method returning exactly those 4 clusters has found the coarse scale rather than failed. Divergences are calibrated as realised mean pairwise p-distances (~1% within a subfamily, ~8% between subfamilies of one superfamily, ~30% between superfamilies): the branch flip probabilities are solved bottom-up from those targets (xForPairwise / marginalEdge), and with 400 columns the measured group-mean distances land within roughly 1-2% of them. Known limit: 12 subfamilies limited to 6-10 members each would cap at 120 rows, below the required 150-250 row window, so subfamilies here hold 13-15 members instead; every group is far above minSize = 3, hence no noise labels. No gaps, no singletons, no lower case or IUPAC tricks: the only challenge is the two-scale distance structure. Seeded mulberry32 PRNG, rows shuffled, fully deterministic in seed.'
    };
}

module.exports = {
    id: ID,
    title: 'Nested two-scale family: 4 superfamilies, each of 3 subfamilies',
    describe: 'One ancestral sequence diverged into 4 superfamilies (~30% apart), each of which split again into 3 subfamilies (~8% apart), whose 13-15 members are ~1% apart. Both scales carry real signal, so a coarse method may legitimately return the 4 superfamilies while a sensitive one finds the 12 subfamilies. The difficulty is staying sharp at the 8% gaps while the 30% gaps dominate the total variance; everything is 400 aligned columns of plain A/C/G/T, deterministically generated and row-shuffled.',
    generate: generate
};
