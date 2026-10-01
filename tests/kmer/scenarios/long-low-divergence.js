// Scenario 'long-low-divergence': six closely related groups across a long (2600-column)
// genomic alignment. Groups sit 2.0-2.9% off the shared ancestor (so any PAIR of groups is
// ~4-6% divergent) while members sit ~0.25% off their own group consensus (~0.5% pairwise
// within). Labels are correct BY CONSTRUCTION: every sequence is generated from a known
// group consensus, nothing is inferred. Contract: tests/kmer/SCENARIO_CONTRACT.md.
// No require, no Math.random (own mulberry32 PRNG), deterministic in `seed`, all rows same length.

'use strict';

// ---- tunables of the biological model ----
const COLS = 2600;                        // alignment columns (task asks 2000-3000)
const GROUPS = 6;                         // true groups
const PER_GROUP = 8;                       // 48 sequences total, every group >> minSize
const TS_BIAS = 0.55;                     // mild transition bias
const ROOT_LO = 0.020, ROOT_HI = 0.029;   // consensus-vs-ancestor rate: pairs land at ~4-6%
const WITHIN = 0.0025, JITTER = 0.4;      // member-vs-consensus ~0.15-0.35% -> ~0.5% pairwise
const MIN_SIZE = 3;

// mulberry32: small, fast, seeded
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const TS = { A: 'G', G: 'A', C: 'T', T: 'C' };
const TV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };

module.exports = {
    id: 'long-low-divergence',
    title: 'long alignment (2600 cols): 6 groups 4-6% apart, 0.5% within',
    describe: 'Six cryptic species / population clusters spanning a long genome-like alignment: ' +
        'each group consensus sits 2.0-2.9% off the shared ancestor, so any two groups differ by ' +
        '~4-6% while members of a group differ from each other by only ~0.5%. ' +
        'Because sequences are this similar, k-mers of practical length are shared across group ' +
        'boundaries everywhere (0.95^k is still ~0.6 at k=10), so k-mer spectra are dense, tie-riddled ' +
        'and compressed into a narrow distance band. ' +
        'What is hard is scale separation (0.5% within vs 4-6% between) plus resolving a six-way ' +
        'topology whose 15 pairwise distances all lie in one narrow interval.',
    generate(seed) {
        const R = mulberry32(((seed >>> 0) ^ 0x1F123BB5) || 1);
        const pick = (a) => a[Math.floor(R() * a.length)];
        const base = () => (R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));
        // Substitutions at an expected rate (per site), with Jukes-Cantor correction for p,
        // drawn independently per column. Nothing is executed here; arrays are mutated in place.
        const mutate = (arr, rate) => {
            const p = 0.75 * (1 - Math.exp(-(4 * rate) / 3));
            for (let i = 0; i < arr.length; i++) {
                const c = arr[i];
                if (c === '-' || R() >= p) continue;
                arr[i] = R() < TS_BIAS ? TS[c] : pick(TV[c]);
            }
            return arr;
        };

        const ancestor = Array.from({ length: COLS }, base);

        // group consensuses: star topology, one drawn rate per group
        const cons = [];
        for (let g = 0; g < GROUPS; g++) {
            const rate = ROOT_LO + R() * (ROOT_HI - ROOT_LO);
            cons.push(mutate(ancestor.slice(), rate));
        }

        // members: ~0.5% pairwise within their own group (label = group index by construction)
        const seqs = [], labels = [];
        let made = 0;
        for (let g = 0; g < GROUPS; g++) {
            for (let m = 0; m < PER_GROUP; m++) {
                const rate = WITHIN * (1 - JITTER + 2 * JITTER * R());
                seqs.push({
                    header: 'isolate_' + String(++made).padStart(2, '0'),
                    seq: mutate(cons[g].slice(), rate).join('')
                });
                labels.push(g);
            }
        }

        // shuffle row order so file order carries no information; labels travel with rows
        const idx = seqs.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
        }

        return {
            seqs: idx.map((i) => seqs[i]),
            labels: idx.map((i) => labels[i]),
            minSize: MIN_SIZE,
            notes: 'Correct by construction: labels[i] is the group whose consensus seeded seqs[i]. ' +
                'Realised divergence varies with seed but targets ~4-6% between consensuses and ' +
                '~0.3-0.7% within (mean 0.5%), so within-group similarity beats between-group by ~10x. ' +
                'Expected difficulty: HIGH for small k (3-8), where 60-85% of k-mers are still shared ' +
                'between groups, so the within/between contrast in any shared-k-mer distance is weak, ' +
                'ties are frequent and neighbour-joining-style noise dominates; large k sharpens the ' +
                'contrast but starves even within-group sharing. Group-count estimation is also hard: ' +
                'all 15 inter-group merge heights are small and similar, so a stopping rule sees a ramp, ' +
                'not a gap. Known limits (deliberate): no indels and no gap columns (difficulty is purely ' +
                'substitutional; gap handling untested), no truncation/chunks, transition bias only, and ' +
                'a star topology (nested group structure not exercised). ' +
                'Cost: 48 rows x 2600 cols per seed -> ~10x the k-mer work of the default 600-col sim, ' +
                'so this scenario also stresses runtime and memory of the k-mer counting itself.'
        };
    }
};
