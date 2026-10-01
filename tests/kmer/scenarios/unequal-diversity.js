// Scenario: unequal-diversity (tests/kmer/scenarios/unequal-diversity.js)
//
// One synthetic alignment with KNOWN group labels: five families that are all roughly
// 20-30% apart from each other, but whose INTERNAL diversity differs by more than an
// order of magnitude (members diverge 0.5%, 2.5%, 5%, 8% and 12% from their own family
// consensus).  Substitution only, all rows full length, row order shuffled.
// Labels are correct by construction: every row is sampled from a known family consensus,
// or is a declared lone row with its own label.

'use strict';

// ---- seeded PRNG (mulberry32); no Math.random, no require -----------------------

function mulberry32(a) {
    a = a >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const OTHER = { A: 'CGT', C: 'AGT', G: 'ACT', T: 'ACG' };

// Each site of `s` (array of bases) is replaced by a random DIFFERENT base with
// probability p, so the expected realised p-distance from the parent is exactly p.
function mutate(s, p, R) {
    const out = s.slice();
    for (let i = 0; i < out.length; i++) {
        if (R() < p) out[i] = OTHER[out[i]][(R() * 3) | 0];
    }
    return out;
}

function pDist(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d / a.length;
}

// ---- scenario parameters --------------------------------------------------------

const LEN = 700;                                   // alignment columns (60..3000)
const WITHIN = [0.005, 0.025, 0.05, 0.08, 0.12];   // family 0 tight ... family 4 loose
const SIZES = [10, 12, 9, 8, 7];                   // 46 family members + 3 lone rows = 49
const LONE = 3;

module.exports = {
    id: 'unequal-diversity',

    title: 'Five families with internal diversity from 0.5% to 12%, all ~20-30% apart',

    describe: 'Models five virus-like families that are 20-30% apart from each other but '
        + 'have very different within-family diversity: one near-clonal tight family whose '
        + 'members differ from its consensus by only 0.5%, one sprawling loose family at 12%, '
        + 'and three families in between (2.5%, 5%, 8%). Because the spread of internal '
        + 'distances overlaps the spread of between-family distances, no single global cut '
        + 'height can recover all five groups at once, which is exactly what this scenario '
        + 'stresses.',

    generate(seed = 1) {
        const R = mulberry32(seed >>> 0 || 1);
        const G = WITHIN.length;
        const base = () => (R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));
        const root = Array.from({ length: LEN }, base);

        // Family consensuses: each family leaves the root on its own branch in the
        // 11.5%-15% window, which places every pair of consensuses ~21-28% apart. That is
        // the between-group leg; the within-group legs are added below, per member.
        const cons = [];
        for (let g = 0; g < G; g++) cons.push(mutate(root, 0.115 + 0.035 * R(), R));

        // Members radiate star-like from their own consensus. The per-member multiplier
        // (0.5x..1.5x of the family rate) is what makes the loose family genuinely sprawl.
        const rows = [], labels = [];
        for (let g = 0; g < G; g++) {
            for (let m = 0; m < SIZES[g]; m++) {
                rows.push(mutate(cons[g], WITHIN[g] * (0.5 + R()), R));
                labels.push(g);
            }
        }

        // Three lone rows at roughly the same radius as the family consensuses: they have
        // no closest family. Declared noise, one unique label each (< minSize).
        for (let i = 0; i < LONE; i++) {
            rows.push(mutate(root, 0.14 + 0.04 * R(), R));
            labels.push(G + i);
        }

        // Shuffle the row order (file order must not matter), keeping labels in step.
        const order = rows.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = (R() * (i + 1)) | 0;
            const t = order[i]; order[i] = order[j]; order[j] = t;
        }
        const seqs = order.map((i, r) => ({ header: 'uneq_row' + (r + 1), seq: rows[i].join('') }));
        const outLabels = order.map(i => labels[i]);

        // ---- realised summary, so that the claims below are checkable, not hand-waved.
        const D = rows.map(a => rows.map(b => pDist(a, b)));
        const memberOf = Array.from({ length: G }, () => []);
        rows.forEach((_, i) => { if (labels[i] < G) memberOf[labels[i]].push(i); });

        const within = memberOf.map(idxs => {
            let s = 0, n = 0;
            for (let i = 0; i < idxs.length; i++) {
                for (let j = i + 1; j < idxs.length; j++) { s += D[idxs[i]][idxs[j]]; n++; }
            }
            return n ? s / n : 0;
        });

        let bMin = 1, bMax = 0;
        for (let g = 0; g < G; g++) {
            for (let h = g + 1; h < G; h++) {
                let s = 0;
                for (const i of memberOf[g]) for (const j of memberOf[h]) s += D[i][j];
                const m = s / (memberOf[g].length * memberOf[h].length);
                if (m < bMin) bMin = m;
                if (m > bMax) bMax = m;
            }
        }

        const notes = 'Realised p-distances for this seed: mean within-family, tight to loose, = '
            + within.map(x => x.toFixed(3)).join(', ')
            + '; mean between-family pairs = ' + bMin.toFixed(3) + '-' + bMax.toFixed(3)
            + '. What is hard: the distance DISTRIBUTIONS overlap. Inside the loose family '
            + '(10 members around 12% from their consensus) some pairs are as far apart as '
            + 'the closest between-family pairs, so with a single global cut every answer is '
            + 'a compromise: a low cut keeps the tight family pure but shatters the loose one '
            + 'into sub-cliques, a high cut keeps the loose family whole but merges families. '
            + 'On AVERAGE each family is still tighter than any other family, so the labels '
            + 'mean something; this is a cut-height stress test, not an adversarial-labelling '
            + 'one. Known limits: (1) the three lone rows (labels 5-7) sit at family radius '
            + 'with no closest family, so do not punish a clustering that leaves them as '
            + 'singletons or absorbs groups of them into one cluster; (2) substitution only, '
            + 'no indels, upper-case ACGT, every row full length, so this scenario says '
            + 'nothing about gap handling or case; (3) the tight family is recoverable by '
            + 'almost any cut, so do not score this scenario on family 0 alone. '
            + 'Deterministic in seed; 49 rows, 700 columns.';

        return { seqs, labels: outLabels, minSize: 3, notes };
    }
};
