// Scenario 'chimeras': 8 real sequence families + 20 half-and-half recombinants.
// A recombinant's left half descends from one family, its right half from another, so no
// single group label is true for it -> every recombinant gets its OWN unique noise label.
// Contract: tests/kmer/SCENARIO_CONTRACT.md (CommonJS, no require, deterministic in `seed`).

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const TS = { A: 'G', G: 'A', C: 'T', T: 'C' };                       // transitions
const TV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] }; // transversions

module.exports = {
    id: 'chimeras',
    title: 'eight families + 20 left/right recombinants',
    describe: 'Eight families diverge from one common ancestor (about 0.22 substitutions per site between family consensuses, 0.02 within a family), like eight viral or bacterial lineages sharing one alignment. On top of them, 20 recombinant sequences splice the left half of one family onto the right half of a different family - the signature of a mosaic genome, a natural recombinant, or a chimeric/cross-contaminated assembly. What makes it hard is that a recombinant shares only half of its k-mers with each of its two parents, so k-mer distances give it no correct home: it is pulled toward whichever parent it happens to resemble slightly more, or it acts as a bridge between families.',
    generate(seed) {
        const G = 8, PER = 10, NREC = 20, LEN = 700;             // 8*10 + 20 = 100 rows, 700 columns
        const BETWEEN = 0.22, WITHIN = 0.02, RECDIV = 0.015;    // divergence: consensus / member / chimera halves
        const R = mulberry32(seed >>> 0);
        const pick = arr => arr[(R() * arr.length) | 0];
        const mutate = (arr, d) => {                             // per-site rate, Jukes-Cantor corrected
            const p = 0.75 * (1 - Math.exp(-4 / 3 * d)), out = new Array(arr.length);
            for (let i = 0; i < arr.length; i++) {
                const c = arr[i];
                out[i] = R() < p ? (R() < 0.55 ? TS[c] : pick(TV[c])) : c;
            }
            return out;
        };
        // one random founding sequence, G equally distant family consensuses (star topology)
        const founder = new Array(LEN);
        for (let i = 0; i < LEN; i++) founder[i] = R() < 0.5 ? (R() < 0.5 ? 'A' : 'T') : (R() < 0.5 ? 'C' : 'G');
        const cons = [];
        for (let g = 0; g < G; g++) cons.push(mutate(founder, BETWEEN));

        const seqs = [], labels = [];
        for (let g = 0; g < G; g++) {
            for (let m = 0; m < PER; m++) {                      // label is true by construction: built from cons[g]
                seqs.push({ header: 'fam' + g + '_m' + m, arr: mutate(cons[g], WITHIN) });
                labels.push(g);
            }
        }
        const half = LEN >> 1;
        for (let i = 0; i < NREC; i++) {
            const a = (R() * G) | 0;
            let b = (R() * G) | 0;
            while (b === a) b = (R() * G) | 0;                   // two DIFFERENT parents, else it is not a mosaic
            const arr = mutate(cons[a], RECDIV).slice(0, half)   // columns 1..half from family a
                .concat(mutate(cons[b], RECDIV).slice(half));    // columns half+1..LEN from family b
            seqs.push({ header: 'rec' + i + '_fam' + a + 'x' + b, arr });
            labels.push(G + i);                                  // unique label per chimera: it is noise by design
        }
        const idx = seqs.map((_, i) => i);                       // shuffle rows: file order must not matter
        for (let i = idx.length - 1; i > 0; i--) {
            const j = (R() * (i + 1)) | 0, t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        }
        return {
            seqs: idx.map(i => ({ header: seqs[i].header, seq: seqs[i].arr.join('') })),
            labels: idx.map(i => labels[i]),
            minSize: 3,
            notes: 'The eight families are cleanly separated (mean p-distance is about 0.19 between families versus 0.02 within), so their labels mean something. The 20 recombinants are the explicitly adversarial part and are NOT expected to be recovered as a unit: each inherits columns 1-350 from one family and 351-700 from another, so only half of its k-mer content points at each parent, and they deliberately break the closer-to-own-group rule - that is the point. A k-mer guide tree typically grafts a recombinant onto one of its two parents (distorting that family) or uses it as a bridge, so a cut into G+NREC groups will not group the recombinants together and a cut into G groups can merge two families. Because a chimera has no true group, each carries its own unique label; the sensible success criterion is that families stay intact and the recombinants land near one of their parents. Expected difficulty: moderate to hard - a family-level ARI drop on this scenario is a real robustness signal, not a bug in the labels.'
        };
    }
};
