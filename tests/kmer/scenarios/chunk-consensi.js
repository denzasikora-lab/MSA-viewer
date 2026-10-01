// Scenario: chunk-consensi -- overlapping chunk consensi of five ~2 kb element families.
//
// Biology modelled: a long repeat element (~2 kb) is cut into overlapping chunks (the way
// chunked annotators build chunk consensi): every chunk is the consensus of a 300-900 bp
// window of its family element, placed into the alignment with leading and trailing gaps.
// Five true families contribute 20-40 chunks each, tiling the whole element.
'use strict';

// mulberry32: small seeded PRNG, deterministic in seed (no Math.random in this file).
function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const OTHER = { A: 'CGT', C: 'AGT', G: 'ACT', T: 'ACG' };
// Jukes-Cantor: expected substitutions/site -> per-base change probability.
const jc = d => 0.75 * (1 - Math.exp((-4 / 3) * d));

module.exports = {
    id: 'chunk-consensi',
    title: 'Overlapping chunk consensi of five ~2 kb element families',
    describe:
        'A ~2 kb element family cut into overlapping chunk consensi: every sequence is a 300-900 bp window of ' +
        'its family consensus, padded with leading and trailing gaps so the alignment stays rectangular. ' +
        'Five true families contribute 20-40 chunks each, tiling the whole element, so members of one family ' +
        'cover DIFFERENT windows and pairs from opposite ends of the element share no ungapped column at all. ' +
        'Hard for any distance that ignores coverage: cross-family chunks over the same window share identical ' +
        'gap runs and can look closer than same-family chunks from opposite ends of the element.',

    generate(seed) {
        const R = mulberry32((Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x5bf03635) >>> 0);
        const L = 2000;                        // alignment columns = full element length (~2 kb)
        const GAP = '-';
        const pick = a => a[(R() * a.length) | 0];
        const sub = (c, p) => (R() < p ? OTHER[c][(R() * 3) | 0] : c);

        // Root element and five family consensuses on independent branches (~57% pairwise divergence).
        const root = Array.from({ length: L }, () => pick(['A', 'C', 'G', 'T']));
        const pFam = jc(0.55);
        const family = [];
        for (let f = 0; f < 5; f++) {
            const c = new Array(L);
            for (let i = 0; i < L; i++) c[i] = sub(root[i], pFam);
            family.push(c);
        }

        const seqs = [], labels = [];
        const pChunk = jc(0.02);               // chunk consensus vs its family consensus (~2%)
        const pDrop = 0.012;                   // internal gap dropouts inside the covered window
        for (let f = 0; f < 5; f++) {
            const cons = family[f];
            const n = 20 + ((R() * 21) | 0);    // 20-40 chunks per family
            for (let i = 0; i < n; i++) {
                const w = 300 + ((R() * 601) | 0);                    // window width 300-900 bp
                const ladder = Math.round((i * (L - 300)) / (n - 1)); // chunks walk the element left->right
                const s = Math.max(0, Math.min(L - 300, ladder + ((R() * 65) | 0) - 30));
                const end = Math.min(L, s + w);
                const row = new Array(L).fill(GAP);                   // leading + trailing gaps
                for (let j = s; j < end; j++) row[j] = R() < pDrop ? GAP : sub(cons[j], pChunk);
                seqs.push({
                    header: 'fam' + (f + 1) + '_c' + String(i + 1).padStart(2, '0') + '_' + (s + 1) + '-' + end,
                    seq: row.join('')
                });
                labels.push(f);                // label = true family, correct by construction
            }
        }

        const order = seqs.map((_, i) => i);   // shuffle rows: file order must not matter
        for (let i = order.length - 1; i > 0; i--) {
            const j = (R() * (i + 1)) | 0;
            const t = order[i]; order[i] = order[j]; order[j] = t;
        }

        return {
            seqs: order.map(i => seqs[i]),
            labels: order.map(i => labels[i]),
            minSize: 3,
            notes:
                'Adversarial for coverage-blind distances (stated per contract rule 31): no pairwise-only method can ' +
                'recover whole families, because same-family chunks from opposite ends of the element share zero ' +
                'ungapped columns, while cross-family chunks at identical coordinates share long identical gap ' +
                'runs, so gap-heavy or k-mer-over-gap distances will generally score best as WINDOW clusters (mixed ' +
                'families at the same coordinates), not as families. The ground truth is still locally strong and ' +
                'correct by construction: inside any overlapping window same-family chunks differ by ~2% while ' +
                'different families differ by ~57%, and consecutive windows of a family overlap by roughly 200-570 ' +
                'bp, so the five families are reachable by chaining neighbour overlaps, not by direct left-end vs ' +
                'right-end comparison. Expect clustering quality somewhere between window-partition and family-partition ' +
                'depending on how the distance treats gaps; a coverage-aware or transitive method should ~recover the ' +
                'five families. Numbers: 5 families x 20-40 chunks = 100-200 rows, 2000 columns, every window >= 300 ' +
                'bp wide, ~1.2% internal gap dropouts, only ACGT plus gap characters, runtime trivial. Rows shuffled.'
        };
    }
};
