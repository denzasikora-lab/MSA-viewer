// Scenario for tests/kmer/SCENARIO_CONTRACT.md (see tests/kmer/sim.js for a worked generator).
//
// Low-complexity scenario: microsatellite-rich sequences around one unique core.
//
// Each sequence is:  (CA)n  |  120-column unique core  |  (GGAA)n  |  poly-A tail
// The core is the ONLY thing carrying group information.  The five groups differ nowhere else,
// and repeat lengths are drawn per sequence, independently of the group, so they are pure
// label noise -- but they supply about two thirds of the bases and of the k-mer mass.
// This is the classic case where a count-based k-mer distance is dominated by repeats.

// mulberry32: small deterministic PRNG (no Math.random in this file, no require, no I/O).
function mulberry32(a) {
    a = a >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const SUBS = { A: 'CGT', C: 'AGT', G: 'ACT', T: 'ACG' };

// per-site substitutions; anything that is not ACGT (e.g. a gap) is left alone
function mutate(str, rate, R) {
    return str.split('').map(c => {
        const alts = SUBS[c];
        return (alts && R() < rate) ? alts[Math.floor(R() * 3)] : c;
    }).join('');
}

// a low-complexity block: `copies` of `unit`, lightly mutated, then gap-padded to the block width,
// so every sequence still has exactly the same number of columns.
function repeatBlock(unit, copies, width, R) {
    const s = mutate(unit.repeat(copies), 0.006, R);
    return s + '-'.repeat(width - s.length);
}

// block layout (fixed coordinates for every sequence)
const CA_COLS = 210, CORE_COLS = 120, GGAA_COLS = 160, TAIL_COLS = 60;
const ALN_COLS = CA_COLS + CORE_COLS + GGAA_COLS + TAIL_COLS;   // 550
const GC = [0.35, 0.45, 0.55, 0.62, 0.72];                      // per-group core composition

function coreFor(g, R) {
    const gc = GC[g % GC.length];
    let s = '';
    for (let i = 0; i < CORE_COLS; i++) {
        const r = R();
        s += r < gc ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T');
    }
    return s;
}

module.exports = {
    id: 'low-complexity',
    title: 'microsatellites and poly-A tails drowning a small unique core',
    describe:
        'Five groups whose members differ ONLY in a 120-column core that is unique per group; ' +
        'the rest of every sequence is a (CA)n run, a (GGAA)n run and a poly-A tail whose ' +
        'lengths are drawn independently of the group and take most of their block width. ' +
        'This models microsatellite-rich families and tests whether k-mer distances recover a ' +
        'grouping signal when roughly 40-75% of the bases (two thirds on average) are repeats ' +
        'shared by all groups: the k-mer mass is dominated by a handful of very high-count ' +
        'repeat k-mers while the real signal is ~100 single-copy core k-mers.',
    generate(seed) {
        const R = mulberry32((seed * 2654435761) >>> 0 || 7);
        const cores = [];
        for (let g = 0; g < 5; g++) cores.push(coreFor(g, R));

        const seqs = [], labels = [];
        for (let g = 0; g < 5; g++) {
            const size = 8 + Math.floor(R() * 5);            // 8..12 members; 40..60 rows in total
            for (let m = 0; m < size; m++) {
                const ca = 15 + Math.floor(R() * 86);        // 30..200 nt in a 210-column block
                const ggaa = 8 + Math.floor(R() * 28);       // 32..140 nt in a 160-column block
                const tail = 12 + Math.floor(R() * 49);     // 12..60 nt in a 60-column block
                const seq = repeatBlock('CA', ca, CA_COLS, R) +
                    mutate(cores[g], 0.012, R) +             // within-group drift on the core only
                    repeatBlock('GGAA', ggaa, GGAA_COLS, R) +
                    repeatBlock('A', tail, TAIL_COLS, R);
                if (seq.length !== ALN_COLS) throw new Error('low-complexity: bad alignment length ' + seq.length);
                seqs.push({ header: 'lc_g' + g + 's' + m, seq });
                labels.push(g);
            }
        }

        // the file order must not matter
        const order = seqs.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            const t = order[i]; order[i] = order[j]; order[j] = t;
        }

        return {
            seqs: order.map(i => seqs[i]),
            labels: order.map(i => labels[i]),
            minSize: 3,
            notes:
                'Labels are correct by construction: the 120-column core is a fixed random sequence ' +
                'per group (about 1.2% drift within a group, independent cores between groups) and ' +
                'nothing else carries group information. Difficulty and limits: the (CA)n, (GGAA)n and ' +
                'poly-A tracts are identical in sequence across ALL groups and only their lengths ' +
                'differ, independently of the group, so a weighted-Jaccard-style k-mer distance is ' +
                'dominated by repeat-count differences. Because repeat lengths are drawn from the ' +
                'same distribution for every group, the MEAN within-group distance stays well below ' +
                'the MEAN between-group distance (the core is shared and count-matched inside a ' +
                'group, disjoint between groups), but the distributions overlap heavily: a within-' +
                'group pair with very different repeat lengths reaches distance ~0.64 for k=6, while ' +
                'a between-group pair with near-identical repeat lengths can be as close as ~0.51. ' +
                'Expected recovery is therefore partial: small k lumps whole groups together through a ' +
                'few very high-count repeat k-mers, and large k leaves the core signal as singletons ' +
                'up against counts of tens to hundreds. 550 columns = 210 (CA) + 120 (core) + ' +
                '160 (GGAA) + 60 (tail); 40-60 sequences in 5 groups of 8-12; deterministic in seed.'
        };
    }
};
