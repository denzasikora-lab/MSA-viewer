// tests/kmer/scenarios/continuum-no-groups.js
//
// A deliberate NO-STRUCTURE scenario: an isolation-by-distance continuum, not discrete groups.
//
// Chain of descent: sequence 0 is a random founder; every later sequence is a mutated copy of an
// EARLIER sequence, almost always a very recent ancestor (at most a few links back), so each link
// adds only 1-2% divergence (expected substitutions per site; realised counts vary).  Rarely (~8%)
// a sequence is copied from a much older ancestor - a long-distance jump that roughens the pure
// gradient without creating any real group.  Chain neighbours are near-identical, the two ends are
// far apart, and everything between them is a smooth cline.
//
// Labels: the chain is cut into 5 CONTIGUOUS, ARBITRARY position bins.  labels[i] is the bin of the
// chain position sequence i came from, so the labels are exact by construction (every parent is
// known), but they are NOT biological groups: bin edges are drawn where no edge exists, and two
// sequences sitting on opposite sides of an edge are as similar as two sequences inside one bin.

const N       = 130;   // sequences (contract: 30..400)
const LEN     = 800;   // alignment columns (contract: 60..3000); every row has the same length
const BINS    = 5;     // arbitrary contiguous bins along the chain
const STEP_LO = 0.01;  // substitutions per site per ancestry link, lower end
const STEP_HI = 0.02;  // ... upper end  -> "1-2% steps"
const JUMP    = 0.08;  // chance that a copy comes from a distant (not recent) ancestor
const RECENCY = 6;     // how many links back a "recent" ancestor may be
const INDEL   = 0.15;  // chance (relative to the step rate) of a short gap run starting at a site

const TR  = { A: 'G', G: 'A', C: 'T', T: 'C' };          // transitions (biased 60/40)
const OTH = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] }; // transversions

// mulberry32: small seeded PRNG (no Math.random anywhere).
function prng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generate(seed) {
    const R = prng((Math.floor(seed) ^ 0x5bf03635) >>> 0);
    const pick = a => a[Math.floor(R() * a.length)];
    const base = () => (R() < 0.5 ? (R() < 0.5 ? 'A' : 'T') : (R() < 0.5 ? 'G' : 'C'));

    // Mutate in place on a Jukes-Cantor scale, skipping gap columns (keeps rows aligned).
    function mutate(arr, d) {
        const p = 0.75 * (1 - Math.exp(-4 * d / 3));
        for (let i = 0; i < arr.length; i++) {
            const c = arr[i];
            if (c === '-') continue;                                  // inherited gaps never refill
            if (R() < p) arr[i] = R() < 0.6 ? TR[c] : pick(OTH[c]);
            else if (R() < p * INDEL) {                                // rare short deletion
                const end = Math.min(arr.length, i + 1 + Math.floor(R() * 3));
                for (let j = i; j < end; j++) if (arr[j] !== '-') arr[j] = '-';
                i = end - 1;
            }
        }
        return arr;
    }

    // Build the continuum.  chain[i] = { array, parent } ; all columns stay aligned because every
    // sequence is derived from the same founder by substitution plus column-preserving deletions.
    const chain = [];
    chain.push({ parent: -1, arr: Array.from({ length: LEN }, base) });
    for (let i = 1; i < N; i++) {
        let p;
        if (R() < JUMP) p = Math.floor(R() * i);                        // long-distance ancestry
        else p = i - 1 - Math.floor(R() * Math.min(i, RECENCY + 1));     // recent ancestry (can be 0)
        const arr = mutate(chain[p].arr.slice(), STEP_LO + R() * (STEP_HI - STEP_LO));
        chain.push({ parent: p, arr });
    }

    // Arbitrary labels: contiguous slices of the chain.  Correct by construction, meaningless
    // biologically - that is the whole point of this scenario.
    const binOf = i => Math.min(BINS - 1, Math.floor(i * BINS / N));

    // Shuffle the row order so the file order carries no information about the chain.
    const idx = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }

    const seqs = idx.map((c, i) => ({ header: 'seq_' + String(i).padStart(3, '0'), seq: chain[c].arr.join('') }));
    const labels = idx.map(binOf);

    return {
        seqs,
        labels,
        minSize: 5,
        // Diagnostic only (not part of the alignment): true chain position and parent of each row,
        // in output order, plus the bin size.  Methods under test should not read this.
        info: { chain: idx.slice(), parent: idx.map(i => chain[i].parent), binSize: Array.from({ length: BINS }, (_, b) => labels.filter(l => l === b).length) },
        notes: [
            'NO real group structure: this is an explicitly adversarial / no-structure test, so the contract',
            'rule ">= 2 true groups, within-group closer than between-group" is waived here.',
            'The 5 labels are ARBITRARY contiguous bins of a mutation chain (isolation-by-distance over',
            'algebraic time); they are exact by construction but biologically meaningless - a bin edge is',
            'drawn between sequences that are as similar to each other as any two sequences inside a bin.',
            'What a good method should report: ONE group (k=1), or a few clusters that are unstable and',
            'change as k changes.  ARI against these 5 labels should be near 0, and an automatic k-suggester',
            'should not confidently claim 5 (or any larger number of) stable groups.',
            'What is hard / known traps: (a) because the bins are slices of a gradient, within-bin pairs are',
            'ON AVERAGE closer than between-bin pairs, so a naive "labels must be consistent with distances"',
            'test can look satisfied here while the groups are still fictitious; ARI is the meaningful score.',
            '(b) Single-linkage-style chaining walks straight along the lineage and yields one snake plus a',
            'few long-branch stragglers; that topology is the truth, not a failure.  (c) ~8% of copies come',
            'from a distant ancestor, so a few near-duplicate pairs appear far apart along the chain.  (d) The',
            'two ends approach Jukes-Cantor saturation (~75% differences) so distance-based methods see a',
            'long weakly-structured axis.  (e) Steps are 1-2% expected substitutions per site per link, so a',
            'bin boundary can join sequences that are identical except for a couple of substitutions.',
        ].join(' '),
    };
}

module.exports = { id: 'continuum-no-groups', title: 'Isolation-by-distance continuum with no real groups (5 arbitrary chain bins)', describe: [
    'Models a spatial/temporal continuum: every sequence is a mutated copy (1-2% per link) of a',
    'randomly chosen earlier sequence, mostly a very recent ancestor, so sequences form a cline from',
    'near-identical neighbours at one end to saturated divergence at the other, with no discrete',
    'subpopulations.  Labels are the 5 arbitrary contiguous position bins of that chain - correct by',
    'construction but biologically meaningless.',
].join(' '), generate };
