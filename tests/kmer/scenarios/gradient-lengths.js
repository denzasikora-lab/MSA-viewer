// tests/kmer/scenarios/gradient-lengths.js
//
// Scenario: every row is a random WINDOW of one 700-column alignment (leading and
// trailing gaps), so row widths form a length gradient. Six true families; the labels
// always give the TRUE family, even when a fragment is too short to carry signal.
// Module shape: see tests/kmer/SCENARIO_CONTRACT.md (no require, no Math.random).

const COLS = 700;                       // alignment columns (contract range: 60..3000)
const FAMILIES = 6;                     // true groups
const MIN_SIZE = 3;                     // size floor handed to the caller
const WINDOW_MIN = 0.15;                 // nominal window width: 15% .. 100% of COLS
const SHORT_LO = 40, SHORT_HI = 80;      // ultra-short fragments (below the 15% floor, by spec)
const SHORT_PER_FAMILY = 2;             // ultra-short fragments per family
const P_BETWEEN = 0.25;                 // target p-distance between family consensuses
const P_WITHIN = 0.03;                  // target p-distance of a member from its family consensus

// Seeded PRNG (mulberry32): generate() is deterministic in `seed`.
function mulberry32(a) {
    a = a >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Jukes-Cantor inverse: branch length d that realises a p-distance `p`.
function jc(p) { return -0.75 * Math.log(1 - (4 / 3) * p); }

// Transition/transversion tables for point mutations of ungapped positions.
const TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
const TV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };

function mutate(seq, d, R) {
    const p = 0.75 * (1 - Math.exp((-4 / 3) * d)); // per-site substitution probability
    const out = seq.slice();                      // `seq` is an array of characters
    for (let i = 0; i < out.length; i++) {
        const c = out[i];
        if (c === '-') continue;                  // gaps are never substituted
        if (R() < p) out[i] = R() < 0.5 ? TS[c] : TV[c][(R() * 2) | 0];
    }
    return out;
}

module.exports = {
    id: 'gradient-lengths',
    title: 'Six families on a gradient of fragment lengths (full length down to 40 residues)',
    describe: 'Six nucleotide families (about 25% consensus divergence, 3% within a family) share one 700-column ' +
        'alignment, but every row keeps only a random window of it and is padded with leading and trailing gaps. ' +
        'Window widths run from 15% of the alignment to full length, and two fragments per family are only 40-80 ' +
        'residues. This models a chunk-style MSA in which shared k-mers between rows depend on where their windows ' +
        'happen to land, and the shortest rows carry almost no usable signal yet are still labelled with their true family.',
    generate(seed) {
        const key = ((Math.floor(Number(seed) || 1) >>> 0) ^ 0x9E3779B9) || 1;
        const R = mulberry32(key);

        const base = () => (R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));
        const founder = [];
        for (let i = 0; i < COLS; i++) founder.push(base());

        // Family consensuses, one star-shaped tree from one shared root: each root-to-consensus
        // branch is half of the wanted between-family path, so consensuses end up ~25% apart.
        const dBetween = jc(P_BETWEEN) / 2;
        const dWithin = jc(P_WITHIN);
        const cons = [];
        for (let g = 0; g < FAMILIES; g++) cons.push(mutate(founder, dBetween, R));

        const seqs = [], labels = [];
        let nShort = 0, nFull = 0;
        for (let g = 0; g < FAMILIES; g++) {
            const size = 15 + Math.floor(R() * 21); // 15..35 members -> 90..210 rows in total
            for (let m = 0; m < size; m++) {
                const row = mutate(cons[g], dWithin, R); // full-length member, BEFORE truncation
                let len, start;
                if (m === 0) {
                    // keep one untruncated row per family so the gradient reaches full length
                    len = COLS; start = 0; nFull++;
                } else if (m <= SHORT_PER_FAMILY) {
                    // deliberately tiny fragment: 40-80 residues, random position
                    len = SHORT_LO + Math.floor(R() * (SHORT_HI - SHORT_LO + 1));
                    start = Math.floor(R() * (COLS - len + 1));
                    nShort++;
                } else {
                    // the nominal gradient: window width 15% .. 100% of the alignment
                    const f = WINDOW_MIN + (1 - WINDOW_MIN) * R();
                    len = Math.round(COLS * f);
                    start = Math.floor(R() * (COLS - len + 1));
                }
                const seq = '-'.repeat(start) +
                    row.slice(start, start + len).join('') +
                    '-'.repeat(COLS - start - len);
                seqs.push({ header: 'fam' + g + '_m' + m + '_L' + len, seq });
                labels.push(g); // TRUE family, also for fragments too short to be recoverable
            }
        }

        // shuffle the row order (file order must not matter), labels kept in step
        const idx = seqs.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        }

        return {
            seqs: idx.map((i) => seqs[i]),
            labels: idx.map((i) => labels[i]),
            minSize: MIN_SIZE,
            notes: 'All ' + seqs.length + ' rows are ' + COLS + ' columns wide; only A/C/G/T and the gap "-" are used. ' +
                'Family consensuses are built to be about ' + Math.round(P_BETWEEN * 100) + '% apart and members about ' +
                Math.round(P_WITHIN * 100) + '% from their own consensus (Jukes-Cantor scale), so long fragments are easy to ' +
                'group. Row widths follow the requested gradient (window of 15%-100% of the alignment, leading and trailing ' +
                'gaps): ' + nFull + ' rows are full length and ' + nShort + ' rows are only 40-80 residues, which is below the ' +
                '15% floor; those short rows are labelled with their TRUE family on purpose and are the hard part - a ' +
                '40-residue strand holds so few k-mers that grouping it correctly is partly luck, and two short rows of the ' +
                'same family may barely overlap at all. Expect ARI well below 1 for k-mer metrics while aligned-column ' +
                'metrics should do better on the overlapping columns. Every family has at least 15 members, so with minSize ' +
                MIN_SIZE + ' no label is treated as noise.'
        };
    }
};
