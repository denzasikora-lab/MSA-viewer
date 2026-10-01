// Scenario: very short alignments where k = 10-12 leaves almost no k-mers.
// Contract: tests/kmer/SCENARIO_CONTRACT.md (no require, no Math.random, deterministic in seed).
'use strict';

// mulberry32: deterministic PRNG, same idea as tests/kmer/sim.js.
function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const BASES = 'ACGT';

// JC69-style substitution: change the base to one of the other three.
function mutate(seq, p, rand) {
    let out = '';
    for (let i = 0; i < seq.length; i++) {
        const c = seq[i];
        if (rand() < p) {
            let n = BASES[(rand() * 4) | 0];
            if (n === c) n = BASES[(BASES.indexOf(c) + 1 + ((rand() * 3) | 0)) % 4];
            out += n;
        } else {
            out += c;
        }
    }
    return out;
}

module.exports = {
    id: 'short-sequences',
    title: 'Very short fragments (60-90 columns), 5 groups, k = 10-12 has almost no k-mers',
    describe: 'Short sequence motifs / barcode-style fragments: only 60-90 aligned columns, ' +
        'five true groups whose consensuses are ~15-25% diverged (pairwise), members ~3-5% diverged ' +
        'within a group. At k = 10-12 a sequence yields only ~L-k+1 k-mers (roughly 50-80 counting ' +
        'multiplicity), and with 20% substitutions a window of 10-12 positions matches across groups ' +
        'only by chance, so almost every k-mer is a one-off event. What makes it hard is scarcity, ' +
        'not missing signal: distances are estimated from tens of k-mers, so weighted Jaccard has ' +
        'high variance and near-ties, and cross-group pairs still share a few accidental k-mers.',

    generate(seed) {
        const rand = rng(typeof seed === 'number' && seed > 0 ? seed : 20260806);

        // Contract floor is 60 columns, so the modeled band is 60-90 (the lower half of the
        // intended 50-90 range: 50-59 columns would violate the contract).
        const len = 60 + ((rand() * 31) | 0);          // 60..90 columns
        const nGroups = 5;
        const perGroup = 8;                            // 40 sequences total (contract: 30..400)

        // Shared founder sequence.
        let founder = '';
        for (let i = 0; i < len; i++) founder += BASES[(rand() * 4) | 0];

        // Star phylogeny. Branch p means "p substitutions per site from the parent on average"
        // (each site is changed with probability p, to a uniformly different base).
        // Two children of the same parent differ in ~2*p sites minus a small overlap term.
        //   group branch  0.085..0.150 -> between-group p-distance ~16-25%
        //   member branch 0.015..0.026 -> within-group  p-distance  ~3-5%
        // Each group and each member draws its own branch length, so realised divergences vary
        // with the seed inside those bands; the ordering within < between holds by construction.
        const seqs = [];
        const labels = [];
        for (let g = 0; g < nGroups; g++) {
            const branchG = 0.085 + rand() * 0.065;
            const cons = mutate(founder, branchG, rand);
            for (let m = 0; m < perGroup; m++) {
                const branchM = 0.015 + rand() * 0.011;
                seqs.push(mutate(cons, branchM, rand));
                labels.push(g);
            }
        }

        // Shuffle rows so file order carries no information about the groups.
        const idx = seqs.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = (rand() * (i + 1)) | 0;
            const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        }

        return {
            seqs: idx.map((i, n) => ({
                header: 'frag_' + String(n + 1).padStart(2, '0'),
                seq: seqs[i]
            })),
            labels: idx.map(i => labels[i]),
            minSize: 3,
            notes: 'Ground truth: 5 groups x 8 members (labels are correct by construction: each ' +
                'sequence was generated from its own group consensus). Alignment length is ' + len +
                ' columns of pure uppercase ACGT, no indels or padding, so every sequence gives at ' +
                'most ' + (len - 10 + 1) + ' distinct 10-mers / ' + (len - 12 + 1) +
                ' 12-mers (fewer distinct). Expectation at k=12: a within-group pair shares roughly ' +
                'half of its windows (a ~2% site error breaks each window it touches), while a ' +
                'cross-group pair shares only a handful of accidental windows, so perfect ' +
                'clustering is usually possible but the margin is thin. Known limits: (1) with ' +
                'only ~60-90 sites the Poisson noise on the ~2-25 substitution differences per pair ' +
                'is large, so individual cross-group pairs can look closer than individual ' +
                'within-group pairs; only the group AVERAGES are guaranteed ordered. (2) kmer-tree ' +
                'caps k at 12 and defaults to 6; at the intended k=10-12 the shared k-mer count per ' +
                'pair is in the tens, so weighted-Jaccard distances are coarse and near-ties are ' +
                'common - tie-breaking, not biology, decides part of the merge order. (3) At k=12 ' +
                'the sequence space (4^12) is far from saturated even in short strings, so these ' +
                'shared k-mers are genuine homology or single coincidences, not multiple hits: ' +
                'this scenario tests estimator variance, not collision noise. Good runs for the ' +
                'k=10-12 band; do not use it as a no-structure control.'
        };
    }
};
