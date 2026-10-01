// Scenario "mixed-orientation" -- tests/kmer/scenarios/mixed-orientation.js
// Six related families in which 30% of the members of EVERY family are stored in the opposite
// strand: they are kept reverse-complemented and simply dropped into the alignment with gap
// padding around them (the way a file looks when nobody re-oriented and re-aligned those rows).
// The ground-truth label is the FAMILY, never the orientation; the strand is only in the header.
// Contract: tests/kmer/SCENARIO_CONTRACT.md (self-contained: own PRNG, no require(), no Math.random).

'use strict';

// ------------------------------------------------------------------ seeded PRNG
function mulberry32(seed) {
    let a = (seed >>> 0) || 0x9E3779B9;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ------------------------------------------------------------------ sequence ops
const COMP = { A: 'T', T: 'A', C: 'G', G: 'C', U: 'A' };
const OTHERS = { A: 'CGT', C: 'AGT', G: 'ACT', T: 'ACG' };

// reverse complement of an ungapped residue string
function revcomp(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) out = COMP[s[i]] + out;
    return out;
}

// Jukes-Cantor: expected substitutions per site -> per-site substitution probability
function jc(d) { return 0.75 * (1 - Math.exp(-4 * d / 3)); }

function mutate(s, d, R) {
    const p = jc(d), out = new Array(s.length);
    for (let i = 0; i < s.length; i++) {
        const o = OTHERS[s[i]];
        out[i] = (R() < p) ? o[Math.floor(R() * o.length)] : s[i];
    }
    return out.join('');
}

// ------------------------------------------------------------------ scenario knobs
const G = 6;                       // families
const SIZES = [14, 12, 17, 10, 13, 11];   // 77 rows total
const RES_LEN = 600;                      // ungapped residues per row
const ALIGN_COLS = 660;                   // alignment width; residues land in a gap-padded window
const RES_OFF_MAX = ALIGN_COLS - RES_LEN;  // window offset range (0..60)
const FOUNDER_GC = 0.5;
const BETWEEN = 0.22;                     // family consensus divergence from the founder
const WITHIN = 0.01;                      // member divergence from its family consensus
const RC_FRAC = 0.30;                     // fraction of each family stored reverse-complemented
const MIN_RC_PER_FAMILY = 3;              // mirror families stay above minSize too

function generate(seed) {
    const s = (seed === undefined || seed === null) ? 1 : seed;
    const R = mulberry32(s);
    const base = () => (R() < FOUNDER_GC ? (R() < 0.5 ? 'C' : 'G') : (R() < 0.5 ? 'A' : 'T'));
    const founder = Array.from({ length: RES_LEN }, base).join('');

    // one consensus per family, all descended from the same founder (star phylogeny)
    const cons = Array.from({ length: G }, () => mutate(founder, BETWEEN, R));

    const seqs = [], labels = [], flips = [];
    for (let g = 0; g < G; g++) {
        const n = SIZES[g];
        const nRc = Math.min(n, Math.max(MIN_RC_PER_FAMILY, Math.round(n * RC_FRAC)));
        // decide up-front WHICH members are the reverse-complemented ones (labels stay by family)
        const perm = Array.from({ length: n }, (_, i) => i);
        for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
        const flip = new Set(perm.slice(0, nRc));
        for (let m = 0; m < n; m++) {
            let res = mutate(cons[g], WITHIN, R);
            const isRc = flip.has(m);
            if (isRc) res = revcomp(res);
            // "aligned" by padding with gaps, exactly as if that were the alignment:
            // residues occupy one contiguous window, never re-aligned to anything
            const off = Math.floor(R() * (RES_OFF_MAX + 1));
            const seq = '-'.repeat(off) + res + '-'.repeat(ALIGN_COLS - off - res.length);
            if (seq.length !== ALIGN_COLS) throw new Error('mixed-orientation: bad row length');
            seqs.push({ header: 'grp' + g + '_m' + String(m).padStart(2, '0') + (isRc ? '_rc' : '_fwd'), seq: seq });
            labels.push(g);
            flips.push(isRc);
        }
    }

    // shuffle the row order (file order must not matter), labels travel with their rows
    const idx = seqs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const shuffled = idx.map(i => seqs[i]);
    const labelsOut = idx.map(i => labels[i]);
    const nRc = flips.filter(Boolean).length;

    return {
        seqs: shuffled,
        labels: labelsOut,
        minSize: 3,
        notes:
            'Adversarial on purpose, and this is the one part of the scenario where the contract rule ' +
            '"same-family members are more similar to each other than to other families" is knowingly ' +
            'broken: under a PLAIN k-mer distance (tests/../kmer-tree.js profile()+distanceMatrix(): ' +
            'gaps ignored, no min(kmer, revcomp(kmer)) canonicalisation) a reverse-complemented row is ' +
            'NOT closer to its own family than a foreign same-strand row is. ' +
            'Expected magnitudes at k=6 with these rates (estimates, from k-mer occupancy of 4^6 space, ' +
            'not measured here): same family, same strand approx 0.2; different families, same strand ' +
            'approx 0.87-0.90; same family, opposite strand approx 0.93. A k-mer can only be shared ' +
            'across strands if both x and revcomp(x) occur in the row, which for 6-mers in ~600 bases ' +
            'happens only by chance occupancy (~13%), so the orientation signal is essentially erased. ' +
            'HOW BADLY THIS FAILS: at k>=5 expect plain k-mer grouping to misassign essentially all ' +
            RC_FRAC * 100 + '% of the rows (the ' + nRc + ' of ' + seqs.length + ' that end in "_rc"), leaving an ARI very roughly in ' +
            'the 0.3-0.5 band when 6 clusters are requested - the forward members form the six families, ' +
            'the RC rows land as far from them as any foreign family and get scattered. ' +
            'TWO FAIR CAVEATS. (1) This distance is orientation-symmetric: d(revcomp(a), revcomp(b)) == ' +
            'd(a,b) exactly, so the RC rows reproduce the same six-family structure in a mirror; a ' +
            'method allowed to find ~12 clusters, or one that canonicalises k-mers or pre-orients rows, ' +
            'recovers these labels almost perfectly. The failure mode being tested is the distance ' +
            'measure and any fixed-cluster-count caller, not the ground truth, which is correct by ' +
            'construction (labels are the family index each sequence was generated from). ' +
            '(2) The blow-up shrinks at small k: a 600-base row nearly saturates all 64 3-mers and ' +
            'revcomp preserves base composition, so k=3 is only mildly confused. ' +
            'Within a strand everything is ordinary: members are ~1% from their consensus, consensuses ' +
            '~22% from the shared founder; every family has >= ' + Math.min.apply(null, SIZES) + ' members, so no noise relabelling applies.',
        info: {
            alignmentColumns: ALIGN_COLS, residues: RES_LEN, families: G, rows: seqs.length,
            reverseComplementedRows: nRc, reverseComplementFraction: +(nRc / seqs.length).toFixed(3)
        }
    };
}

module.exports = {
    id: 'mixed-orientation',
    title: 'Six families, 30% of each family stored reverse-complemented and gap-padded in place',
    describe: 'Six related families (77 rows, 660 columns, one shared founder) in which 30% of every ' +
        'family was entered on the wrong strand: those rows are kept as the reverse complement of a ' +
        'real member and dropped into the alignment with gap padding, never re-oriented or re-aligned, ' +
        'which is what a file looks like when an --adjustdirection step never ran. A plain k-mer ' +
        'distance cannot see that a and revcomp(a) are the same molecule - they share almost no k-mers - ' +
        'so the strand flip is invisible in the labels and fatal for the grouping.',
    seed: 7,
    generate: generate
};
