// Seeded simulator of aligned sequence families with KNOWN group labels, for testing k-mer grouping.
//
// simulate(params, seed) -> { seqs: [{ header, seq }], labels: [groupIndex...], info }
//
// params (all optional):
//   groups        number of groups G (default 5)
//   sizes         'equal' | 'geometric' | 'dominant' | array of sizes   (default 'equal')
//   perGroup      mean sequences per group for 'equal' (default 12)
//   length        alignment columns of the founding sequence (default 600)
//   between       divergence between group consensuses, substitutions per site (default 0.15)
//   within        divergence of a member from its group consensus (default 0.02)
//   structure     'star' (every group equally far from the root) | 'nested' (random binary tree of groups)
//   indel         probability per site of starting an indel event (default 0)   [aligned: gaps]
//   truncate      0..1 fraction of sequences with random leading/trailing gaps (chunk-like, default 0)
//   gc            GC content of the founding sequence (default 0.5)
//   singletons    extra lone, unrelated sequences (own labels) (default 0)
//   rna           use U instead of T
//   lowercase     lower-case a random fraction of positions
//   dupFraction   fraction of members that are exact copies of an earlier member
//   transition    ts/tv bias: probability that a substitution is a transition (default 0.5 = none)
// Divergences are expected substitutions per site (Jukes-Cantor scale); the realised value varies.

function rng(seed) { let x = (seed >>> 0) % 2147483647 || 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; }

function simulate(params = {}, seed = 1) {
    const P = Object.assign({ groups: 5, sizes: 'equal', perGroup: 12, length: 600, between: 0.15, within: 0.02,
        structure: 'star', indel: 0, truncate: 0, gc: 0.5, singletons: 0, rna: false, lowercase: 0, dupFraction: 0, transition: 0.5 }, params);
    const R = rng(seed * 7919 + 17);
    const pick = a => a[Math.floor(R() * a.length)];
    const base = () => { const r = R(); return r < P.gc ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'); };
    const TRANS = { A: 'G', G: 'A', C: 'T', T: 'C' };
    const OTHERS = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };
    function mutate(seq, d) {
        // substitution count ~ Poisson-ish via independent site draws at the JC-corrected rate
        const p = 0.75 * (1 - Math.exp(-4 / 3 * d));
        const out = seq.slice();
        for (let i = 0; i < out.length; i++) {
            const c = out[i]; if (c === '-') continue;
            if (R() < p) out[i] = R() < P.transition ? TRANS[c] : pick(OTHERS[c]);
        }
        return out;
    }
    const founder = Array.from({ length: P.length }, base);

    // group consensuses
    const G = Math.max(1, P.groups | 0);
    let cons = [];
    if (P.structure === 'nested' && G > 1) {
        // random binary tree: recursively split the group set, each branch adds divergence
        const leaves = (lo, hi, seq, depth) => {
            if (hi - lo === 1) { cons[lo] = seq; return; }
            const mid = lo + 1 + Math.floor(R() * (hi - lo - 1));
            const bl = () => P.between * (0.3 + 0.7 * R()) / Math.max(1, Math.log2(G));
            leaves(lo, mid, mutate(seq, bl()), depth + 1);
            leaves(mid, hi, mutate(seq, bl()), depth + 1);
        };
        leaves(0, G, founder, 0);
    } else {
        for (let g = 0; g < G; g++) cons.push(mutate(founder, P.between));
    }
    // group-specific indels: a block deleted (gap) in a subset of groups, always aligned
    if (P.indel > 0) {
        for (let g = 0; g < G; g++) {
            const c = cons[g];
            for (let i = 0; i < c.length; i++) if (R() < P.indel) { const len = 1 + Math.floor(R() * 8); for (let j = i; j < Math.min(c.length, i + len); j++) c[j] = '-'; i += len; }
        }
    }

    // group sizes
    let sizes;
    if (Array.isArray(P.sizes)) sizes = P.sizes.slice(0, G);
    else if (P.sizes === 'geometric') sizes = Array.from({ length: G }, (_, g) => Math.max(1, Math.round(P.perGroup * G * Math.pow(0.6, g) * 0.4)));
    else if (P.sizes === 'dominant') sizes = Array.from({ length: G }, (_, g) => g === 0 ? P.perGroup * G : Math.max(2, Math.round(P.perGroup / 3)));
    else sizes = Array.from({ length: G }, () => P.perGroup);
    while (sizes.length < G) sizes.push(P.perGroup);

    const seqs = [], labels = [];
    for (let g = 0; g < G; g++) {
        for (let m = 0; m < sizes[g]; m++) {
            let s;
            if (P.dupFraction > 0 && m > 0 && R() < P.dupFraction) s = seqs[seqs.length - 1 - Math.floor(R() * m)]._arr.slice();
            else {
                s = mutate(cons[g], P.within);
                if (P.indel > 0) for (let i = 0; i < s.length; i++) if (s[i] !== '-' && R() < P.indel * 0.3) { const len = 1 + Math.floor(R() * 4); for (let j = i; j < Math.min(s.length, i + len); j++) s[j] = '-'; i += len; }
            }
            seqs.push({ header: `g${g}_${m}`, _arr: s });
            labels.push(g);
        }
    }
    for (let i = 0; i < P.singletons; i++) { seqs.push({ header: `lone${i}`, _arr: mutate(Array.from({ length: P.length }, base), 0) }); labels.push(G + i); }

    // chunk-like truncation (random leading / trailing gap padding), as in a consensus-chunk alignment
    seqs.forEach(q => {
        if (P.truncate > 0 && R() < P.truncate) {
            const a = Math.floor(R() * P.length * 0.35), b = Math.floor(R() * P.length * 0.35);
            for (let i = 0; i < a; i++) q._arr[i] = '-';
            for (let i = 0; i < b; i++) q._arr[P.length - 1 - i] = '-';
        }
        let str = q._arr.join('');
        if (P.rna) str = str.replace(/T/g, 'U');
        if (P.lowercase > 0) str = str.split('').map(c => (c !== '-' && R() < P.lowercase) ? c.toLowerCase() : c).join('');
        q.seq = str; delete q._arr;
    });

    // shuffle the row order (the file order must not matter), keeping labels in step
    const idx = seqs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return { seqs: idx.map(i => seqs[i]), labels: idx.map(i => labels[i]), info: { params: P, seed, sizes, nGroups: G + P.singletons } };
}

// quick realised-divergence helper: mean p-distance between sequences of two label sets (aligned columns, no gaps)
function pDist(a, b) { let d = 0, n = 0; for (let i = 0; i < a.length; i++) { const x = a[i], y = b[i]; if (x === '-' || y === '-') continue; n++; if (x.toUpperCase() !== y.toUpperCase()) d++; } return n ? d / n : 0; }

module.exports = { simulate, rng, pDist };
