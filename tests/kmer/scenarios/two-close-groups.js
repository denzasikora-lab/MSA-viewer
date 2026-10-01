'use strict';

// tests/kmer/scenarios/two-close-groups.js
//
// Scenario: exactly TWO true groups, 40 members each, only ~3-4% divergent from each other and
// ~1% within each group - as in two recently separated SINE/retrotransposon subfamilies, or two
// populations separated by a handful of diagnostic sites out of 600 columns.
//
// Correct by construction: every row is mutate(groupConsensus[trueGroup], 1%), so a row label
// is the group that literally generated it (no inference, no estimation, no relabelling).
//
// Fair: the consensuses carry no gap blocks, so there is no block-marker shortcut; characters
// are plain ACGT plus '-' for the per-row deletions; headers row01..row80 reveal nothing about
// groups; rows are shuffled. Hard: the whole split rests on ~20 diagnostic columns, and each row
// carries about one short deletion that shifts its k-mer stream behind the gap.

function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const LEN = 600;             // alignment columns (contract: 60..3000)
const PER_GROUP = 40;        // members per group -> 80 rows (contract: 30..400 sequences)
const WITHIN = 0.010;        // substitutions/site of a member vs its own group consensus
const BETWEEN_LO = 0.030;   // the two consensuses are BETWEEN_LO..BETWEEN_LO+SPAN apart;
const BETWEEN_SPAN = 0.010; // drawn once per seed, so seeds cover the whole 3-4% range
const INDEL = 0.002;         // per-site chance a row starts a 1..4 column deletion (aligned '-')
const GC = 0.45;
const TS_BIAS = 0.6;        // transitions somewhat more likely than transversions
const TR = { A: 'G', G: 'A', C: 'T', T: 'C' };
const OT = { A: 'CT', G: 'CT', C: 'AG', T: 'AG' };

module.exports = {
    id: 'two-close-groups',
    title: 'Two close groups: 40 + 40 rows, 3-4% between, 1% within',
    describe:
        'Two recently separated families of 40 copies each: the two consensuses differ at only ' +
        'about 3-4% of sites while every copy drifts 1% from its own consensus, so a within-group ' +
        'pair and a cross-group pair differ by only about 2% vs about 5% of columns. This models ' +
        'SINE/retrotransposon subfamilies that amplified apart only recently. It is hard because ' +
        'the whole split rests on roughly twenty diagnostic columns and each row also carries a ' +
        'short aligned deletion that shifts its k-mer stream behind the gap, so shared-k-mer ' +
        'counting works close to its resolution limit and no block marker or name hint exists.',

    generate(seed) {
        const R = mulberry32(((seed >>> 0) ^ 0x9E3779B9) | 0);
        const base = () => (R() < GC ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));
        const mutate = (arr, d) => {      // substitutions at the Jukes-Cantor rate for d
            const p = 0.75 * (1 - Math.exp(-4 / 3 * d));
            const out = arr.slice();
            for (let i = 0; i < out.length; i++) {
                if (out[i] === '-' || R() >= p) continue;
                out[i] = R() < TS_BIAS ? TR[out[i]] : OT[out[i]][R() < 0.5 ? 0 : 1];
            }
            return out;
        };

        const between = BETWEEN_LO + BETWEEN_SPAN * R();   // seed-fixed realisation, 3.0-4.0%
        const consA = Array.from({ length: LEN }, base);
        const consB = mutate(consA, between);               // the single split branch A -> B
        const cons = [consA, consB];

        const rows = [], labels = [];
        for (let g = 0; g < 2; g++) {
            for (let m = 0; m < PER_GROUP; m++) {
                const s = mutate(cons[g], WITHIN);           // member = 1% off its own consensus
                for (let i = 0; i < LEN; i++) {             // ~1 short deletion per row, aligned
                    if (s[i] === '-' || R() >= INDEL) continue;
                    const len = 1 + Math.floor(R() * 4);
                    for (let j = i; j < Math.min(LEN, i + len); j++) s[j] = '-';
                    i += len;
                }
                rows.push({ header: 'row' + String(rows.length + 1).padStart(2, '0'), seq: s.join('') });
                labels.push(g);
            }
        }

        // honesty: measure what was realised on this seed rather than quoting the parameters
        const pd = (a, b) => { let d = 0, n = 0; for (let i = 0; i < a.length; i++) { if (a[i] === '-' || b[i] === '-') continue; n++; if (a[i] !== b[i]) d++; } return n ? d / n : 0; };
        let wSum = 0, wN = 0, xSum = 0, xN = 0, bSum = 0;
        for (let i = 0; i < rows.length; i++) {
            bSum += pd(rows[i].seq, cons[labels[i]].join(''));
            for (let j = i + 1; j < rows.length; j++) {
                const d = pd(rows[i].seq, rows[j].seq);
                if (labels[i] === labels[j]) { wSum += d; wN++; } else { xSum += d; xN++; }
            }
        }
        const consDiv = pd(consA.join(''), consB.join(''));
        const within = bSum / rows.length;                 // realised member -> own consensus
        const pairIn = wSum / wN, pairOut = xSum / xN;      // realised mean pairwise distances
        const pct = v => (100 * v).toFixed(2) + '%';

        // shuffle rows and labels with the same permutation (file order must not matter)
        const idx = rows.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }

        const notes = [
            'Expected difficulty: hard but fair. Two equal groups of 40: the split rests on only about ' +
            Math.round(consDiv * LEN) + ' diagnostic columns out of ' + LEN + ' (realised consensus divergence ' +
            pct(consDiv) + ', nominal 3-4%), while each row is a ' + pct(within) + ' mutated copy of one of the ' +
            'two consensuses, giving mean pairwise ' + pct(pairIn) + ' within a group vs ' + pct(pairOut) +
            ' across groups, a margin of ' + (pairOut / pairIn).toFixed(1) + 'x - real, but thin.',
            'What should work: with the true count (2) supplied and a mid-range k (roughly 5-10), both clades ' +
            'are dense and homogeneous, so UPGMA over weighted k-mer Jaccard is expected to find the two groups ' +
            'with ARI near 1. Such a win only shows the tool survived 1% noise, about one short deletion per row ' +
            'and ~20 diagnostic columns; it does not certify resolution finer than a 3% split over 600 columns.',
            'What is genuinely hard: (1) group-count auto-selection is the crux - there is exactly one real gap ' +
            'in the merge-height profile, so an estimator tuned for bigger relative gaps may lump to 1 group or ' +
            'split into 3-8, which is the main way to lose points here. (2) Small k (3-4): most short k-mers ' +
            'survive both levels of divergence, so within and cross distances are both small and closer together ' +
            '(roughly 0.12 vs 0.27 at k=3 in the (1-p)**k model), the indel noise is a larger share of the thin ' +
            'margin, and early merges are decided by near-ties. (3) Large k (10-12, top of the supported range): ' +
            'gap characters are dropped and k-mers join across them, so the ~1 short deletion per row shifts ' +
            'its k-mer stream and, together with the 1% substitutions, erodes shared k-mers until within-group ' +
            'and cross-group distances move closer together again.',
            'Known limits and fairness: labels are exact by construction, never inferred; groups are more ' +
            'similar to themselves than to each other on average (' + pct(pairIn) + ' vs ' + pct(pairOut) + ', ' +
            'measured above), although individual near-ties can exist. There are no singletons, no truncation, ' +
            'no lowercase/U/N tricks - only ACGT plus - gaps; headers row01..row80 are uninformative and rows ' +
            'are shuffled, so nothing can be scored from order or names. The generator is deterministic in the ' +
            'seed, and the between-rate is itself drawn from 3.0-4.0%, so repeated seeds sample the stated range; ' +
            'an individual seed with the low end of that draw is measurably harder than one at the high end.'
        ].join(' ');

        return {
            seqs: idx.map(i => rows[i]),
            labels: idx.map(i => labels[i]),
            minSize: 3,
            notes: notes
        };
    }
};
