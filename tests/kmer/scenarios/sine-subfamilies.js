// tests/kmer/scenarios/sine-subfamilies.js
//
// Six SINE subfamilies radiating from one young master copy.
//
// Real SINEs (Alu, MIR, B2, ...) are transcribed from internally-promoted masters, so a
// subfamily is defined by a handful of DIAGNOSTIC point mutations that were carried by the
// master and are therefore shared by every copy it produced, while each inserted copy then
// picks up its own private substitutions (the "background noise" of the family).
//
// Modelled here: one 300-column AT-biased master, 9 marker columns, each of the 6 subfamilies
// carrying a distinct 2-4 of them (pairwise consensuses differ at >= 3 columns, so they stay
// ~98% identical), 10-40 copies per subfamily with 1-3% private substitutions each, and 12%
// of copies 5'-truncated (a common fate of retrotransposed SINEs).
//
// Hard part: the whole subfamily signal is 3-8 columns out of 300, which is SMALLER than the
// private noise, so the between-family structure barely wins over the within-family spread.

// Deterministic PRNG (no Math.random, no require, no I/O).
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

function shuffle(arr, R) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

module.exports = {
    id: 'sine-subfamilies',
    title: 'SINE subfamilies keyed by 2-4 diagnostic mutations inside 1-3% background noise',
    describe: 'A young SINE family split into six subfamilies, each defined by 2-4 diagnostic point mutations shared by all of its copies; copies also carry 1-3% private substitutions. Because the subfamily consensuses are otherwise 98% or more identical, the true labels live in a handful of columns that carry far less weight than the noise, which is what makes this hard. Expected behaviour for a grouping method is coarse recovery of the family with confusion between the nearest subfamilies.',
    generate(seed) {
        const R = mulberry32(Math.imul((Number(seed) >>> 0) || 20240607, 2654435761) ^ 0x9E3779B9);
        const L = 300, NG = 6, NMARK = 9, MINSEP = 3;
        const TS = { A: 'G', G: 'A', C: 'T', T: 'C' };                 // transitions dominate real SINE markers
        const TV = { A: ['C', 'T'], G: ['C', 'T'], C: ['A', 'G'], T: ['A', 'G'] };
        const sub = c => (R() < 0.8 ? TS[c] : TV[c][Math.floor(R() * 2)]);
        const wt = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
        const ham = (a, b) => wt(a ^ b);

        // founding master, mild AT bias
        const master = [];
        for (let i = 0; i < L; i++) master.push(R() < 0.42 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T'));

        // subfamily "keys": bit patterns over the marker columns, 2-4 markers each,
        // kept at least MINSEP diagnostic columns apart from one another.
        const cand = [];
        for (let m = 0; m < (1 << NMARK); m++) if (wt(m) >= 2 && wt(m) <= 4) cand.push(m);
        shuffle(cand, R);
        let states = [];
        for (let sep = MINSEP; sep >= 1 && states.length < NG; sep--) {
            states = [];
            for (const p of cand) { if (states.length >= NG) break; if (states.every(q => ham(p, q) >= sep)) states.push(p); }
        }
        for (const p of cand) { if (states.length >= NG) break; if (!states.includes(p)) states.push(p); }  // safety net, never expected to fire

        // marker columns sit away from the ends so they survive 5'-truncated copies.
        const pool = []; for (let i = 22; i < L - 8; i++) pool.push(i);
        const markCols = shuffle(pool, R).slice(0, NMARK);
        // shared bit => shared derived allele (TS of the master base), so subfamilies that share
        // a marker look like they share ancestry, exactly as real subfamilies do.
        const cons = states.map(p => { const c = master.slice(); for (let b = 0; b < NMARK; b++) if ((p >> b) & 1) c[markCols[b]] = TS[master[markCols[b]]]; return c; });
        const diagN = states.map(wt);
        let cmin = 99, cmax = 0;
        for (let i = 0; i < NG; i++) for (let j = i + 1; j < NG; j++) { const h = ham(states[i], states[j]); if (h < cmin) cmin = h; if (h > cmax) cmax = h; }

        // copies: 10-40 per subfamily, 1-3% private substitutions, occasional 5' truncation.
        const seqs = [], labels = [];
        for (let g = 0; g < NG; g++) {
            const n = 10 + Math.floor(R() * 31);
            for (let m = 0; m < n; m++) {
                const rate = 0.01 + R() * 0.02;
                const a = cons[g].slice();
                for (let i = 0; i < L; i++) if (R() < rate) a[i] = sub(a[i]);
                if (R() < 0.12) { const cut = 2 + Math.floor(R() * 12); for (let i = 0; i < cut && i < L; i++) a[i] = '-'; }
                seqs.push(a.join(''));
                labels.push(g);
            }
        }

        // measure what was actually produced, so the notes can state facts instead of guesses.
        const pd = (x, y) => { let d = 0, n = 0; for (let i = 0; i < L; i++) { const p = x[i], q = y[i]; if (p === '-' || q === '-') continue; n++; if (p !== q) d++; } return n ? d / n : 0; };
        let wi = 0, wn = 0, be = 0, bn = 0;
        for (let i = 0; i < seqs.length; i++) for (let j = i + 1; j < seqs.length; j++) {
            const d = pd(seqs[i], seqs[j]);
            if (labels[i] === labels[j]) { wi += d; wn++; } else { be += d; bn++; }
        }

        // neutral headers assigned AFTER shuffling, so the row order carries no group hint.
        const idx = shuffle(seqs.map((_, i) => i), R);
        const pct = v => (v * 100).toFixed(2) + '%';
        return {
            seqs: idx.map((i, r) => ({ header: 'SINEcopy_' + String(r + 1).padStart(3, '0'), seq: seqs[i] })),
            labels: idx.map(i => labels[i]),
            minSize: 3,
            notes: [
                seqs.length + ' copies of one SINE, ' + NG + ' subfamilies of ' + diagN.join('/') + ' diagnostic markers each.',
                'Labels are correct by construction: every copy was mutated directly from its own subfamily consensus, so its label is the subfamily it was drawn from.',
                'Realised divergence: markers in cols [' + markCols.join(', ') + ']; subfamily consensuses differ at ' + cmin + '-' + cmax + ' of ' + L + ' columns (' + pct(cmin / L) + '-' + pct(cmax / L) + '), i.e. ~98% identical.',
                'Mean within-subfamily p-distance ' + pct(wi / wn) + ' (over ' + wn + ' pairs) vs mean between-subfamily ' + pct(be / bn) + ' (' + bn + ' pairs): within IS smaller on average, but the margins are thin.',
                'Known limits / expected difficulty: the between-subfamily signal is smaller than the per-copy noise, so the closest subfamily pairs are expected to be merged or swapped by any distance- or k-mer-based method; larger k makes it worse, since one diagnostic column perturbs only k k-mers while each private substitution perturbs k times ~2% of L k-mers.',
                '12% of copies are 5\'-truncated (leading gaps); a method that treats long terminal gaps as informative may split those off into a spurious "truncated" cluster, which counts as an error against these labels.'
            ].join('\n')
        };
    }
};
