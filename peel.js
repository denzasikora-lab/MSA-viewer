// Peel loop for "Group by k-mer": repeatedly take the group that differs most clearly from the rest, set it aside, and
// continue with what is left (the manual SubFam workflow: peel the clearest group, then the next, until only noise remains).
// No DOM: runs in the browser (window.Peel) and in Node. Uses KmerTree for distances and the tree.
//
//   Peel.peel(seqs, { metric, k, minSize, minGap, outliers, linkage }) -> { groups, unassigned, outliers, steps }
//   Peel.nextCandidates(dist, ids, minSize)                           -> candidate groups of the current remainder, best first
//
// A candidate is a branch of the average-linkage tree of the remaining sequences. Its score is
//   gap = (mean distance from its members to the other remaining sequences) - (mean distance among its members),
// i.e. how clearly it differs from the rest. Separate outliers (no neighbour as close as a typical sequence's nearest
// neighbour, so not even a pair) are set aside first and again after each peel.
(function (root) {
    'use strict';
    const KT = (typeof require === 'function' && typeof module !== 'undefined') ? require('./kmer-tree.js') : root.KmerTree;

    function submatrix(dist, ids) {
        const m = ids.length, out = Array.from({ length: m }, () => new Float32Array(m));
        for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) { const d = dist[ids[a]][ids[b]]; out[a][b] = d; out[b][a] = d; }
        return out;
    }

    // Candidate branches of the tree of `ids`, scored, best (largest gap) first. Sizes in [minSize, ids.length - 1].
    function nextCandidates(dist, ids, minSize, linkage, alpha) {
        const n = ids.length;
        if (n < minSize + 1) return [];
        const sub = submatrix(dist, ids), tree = KT.upgma(sub, n, linkage === 'single');
        const rowSum = new Float64Array(n);
        for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += sub[i][j]; rowSum[i] = s; }
        const members = new Array(2 * n), within = new Float64Array(2 * n), rows = new Float64Array(2 * n), cur = Array.from({ length: n }, (_, i) => i);
        for (let i = 0; i < n; i++) { members[i] = [i]; rows[i] = rowSum[i]; }
        const out = [];
        tree.merges.forEach((mg, k) => {
            const a = cur[mg.i], b = cur[mg.j], v = n + k, A = members[a], B = members[b];
            let cross = 0; for (const x of A) for (const y of B) cross += sub[x][y];
            members[v] = A.concat(B); within[v] = within[a] + within[b] + cross; rows[v] = rows[a] + rows[b];
            cur[mg.i] = v; members[a] = members[b] = null;
            const m = members[v].length;
            if (m >= minSize && n - m >= minSize) {          // the rest must be a real remainder, not one stray sequence
                const pairs = m * (m - 1) / 2, restN = m * (n - m);
                const inner = pairs ? within[v] / pairs : 0, crossToRest = (rows[v] - 2 * within[v]) / restN;
                out.push({ members: members[v].map(i => ids[i]), size: m, within: inner, rest: crossToRest, gap: crossToRest - inner });
            }
        });
        // alpha > 0 favours bigger groups: score = gap * size^alpha (alpha 0 = the clearest difference, whatever the size)
        out.forEach(c => { c.score = c.gap * Math.pow(c.size, alpha || 0); c.rel = c.rest > 0 ? c.gap / c.rest : 0; });
        out.sort((p, q) => q.score - p.score || q.size - p.size);
        return out;
    }

    // Diagnostic columns (his definition, SINE_discriminator level_test.py): a column is diagnostic for a group when ONE character
    // (a gap counts) fills at least fIn of its members and that character is in at most fOut of the sequences outside it.
    // Candidates are the branches of the average-linkage tree of `ids`; counts are merged up the tree, so a pass is O(n * L).
    const CODE5 = new Uint8Array(128).fill(5);          // 0-3 = A C G T, 4 = gap, 5 = anything else (N, IUPAC codes): missing, not a base
    CODE5[45] = CODE5[46] = 4;
    CODE5[65] = CODE5[97] = 0; CODE5[67] = CODE5[99] = 1; CODE5[71] = CODE5[103] = 2; CODE5[84] = CODE5[116] = CODE5[85] = CODE5[117] = 3;
    function codesOf(seq) { const a = new Uint8Array(seq.length); for (let i = 0; i < seq.length; i++) { const c = seq.charCodeAt(i); a[i] = c < 128 ? CODE5[c] : 5; } return a; }

    function diagCandidates(codes, dist, ids, minSize, o) {
        const n = ids.length, L = codes[ids[0]].length, fIn = o.fIn || 0.9, fOut = o.fOut != null ? o.fOut : 0.02,
            tol = o.tolerate != null ? o.tolerate : 0, indelW = o.indelWeight;   // defaults keep v237: no tolerance, score = column count
        if (n < 2 * minSize) return [];
        const sub = submatrix(dist, ids), tree = KT.upgma(sub, n, o.linkage === 'single');
        const total = new Uint16Array(6 * L);
        for (const id of ids) { const c = codes[id]; for (let j = 0; j < L; j++) total[6 * j + c[j]]++; }
        const cnt = new Array(2 * n).fill(null), size = new Int32Array(2 * n), cur = Array.from({ length: n }, (_, i) => i), mem = new Array(2 * n);
        for (let i = 0; i < n; i++) { const a = new Uint16Array(6 * L), c = codes[ids[i]]; for (let j = 0; j < L; j++) a[6 * j + c[j]] = 1; cnt[i] = a; size[i] = 1; mem[i] = [i]; }
        const out = [];
        tree.merges.forEach((mg, k) => {
            const a = cur[mg.i], b = cur[mg.j], v = n + k, ca = cnt[a], cb = cnt[b], cv = new Uint16Array(6 * L);
            for (let x = 0; x < 6 * L; x++) cv[x] = ca[x] + cb[x];
            cnt[v] = cv; size[v] = size[a] + size[b]; mem[v] = mem[a].concat(mem[b]); cur[mg.i] = v; cnt[a] = cnt[b] = null; mem[a] = mem[b] = null;
            const m = size[v], nout = n - m;
            if (m < minSize || nout < minSize) return;
            let diag = 0, logE = 0, subs = 0, indels = 0, prevIndel = -2; const cols = [], chars = [];
            for (let j = 0; j < L; j++) {
                const base = 6 * j; let best = 0, bc = -1, known = 0, totKnown = 0;
                for (let q = 0; q < 5; q++) { known += cv[base + q]; totKnown += total[base + q]; if (cv[base + q] > bc) { bc = cv[base + q]; best = q; } }
                const nk = totKnown - known;                         // sequences outside the group with a known character here
                if (known < 0.7 * m || nk < 1) continue;
                // exceptions allowed: the percentage (fIn / fOut), but in small groups at least `tol` sequence on each side,
                // so one misaligned or odd sequence does not veto an otherwise clean column (his SINE24 column 23)
                const inMiss = known - bc, outHas = total[base + best] - bc;
                if (inMiss > Math.max((1 - fIn) * known, m >= 5 ? tol : 0)) continue;
                if (outHas > Math.max(fOut * nk, nk >= 10 ? tol : 0)) continue;
                const fo = outHas / nk;
                diag++; logE += Math.log2((bc / known) / Math.max(fo, 0.005)); cols.push(j); chars.push('ACGT-'[best]);
                // an indel column: the group has a gap where the rest has bases, or a base where the rest mostly has gaps
                const restGap = (total[base + 4] - cv[base + 4]) / nk;
                if (best === 4 || restGap >= 0.5) { if (prevIndel !== j - 1) indels++; prevIndel = j; } else subs++;
            }
            // score: substitutions count one each, an indel (a run of indel columns) counts indelWeight, as he weighs them
            out.push({ members: mem[v].map(i => ids[i]), size: m, diag: indelW == null ? diag : subs + indelW * indels, columns: diag, subs, indels, enrich: logE, cols, chars, poolSize: n });
        });
        return out;
    }

    // Sequences with no close relative at all: nearest-neighbour distance far above the typical one (robust: median + z * MAD).
    function findOutliers(dist, ids, z) {
        const n = ids.length; if (n < 8) return [];
        const nn = ids.map((i, a) => { let b = Infinity; for (let c = 0; c < n; c++) if (c !== a && dist[i][ids[c]] < b) b = dist[i][ids[c]]; return b; });
        const sorted = [...nn].sort((p, q) => p - q), med = sorted[n >> 1];
        const dev = nn.map(v => Math.abs(v - med)).sort((p, q) => p - q), mad = Math.max(dev[n >> 1], 0.002);
        const cut = med + z * mad * 1.4826;
        const flagged = ids.map((i, a) => ({ i, d: nn[a] })).filter(o => o.d > cut).sort((p, q) => q.d - p.d);
        return flagged.slice(0, Math.max(1, Math.floor(n * 0.05))).map(o => o.i);   // at most 5% of the remainder per pass
    }

    function peel(seqs, opts) {
        opts = opts || {};
        const minSize = Math.max(2, opts.minSize | 0 || 3), minGap = opts.minGap != null ? opts.minGap : 0.04, z = opts.outlierZ != null ? opts.outlierZ : 10;
        const metric = opts.metric || (KT.isAligned(seqs) ? 'pdist' : 'jaccard');
        const dist = metric === 'pdist' && KT.isAligned(seqs) ? KT.pDistanceMatrix(seqs) : KT.distanceMatrix(KT.profiles(seqs, opts.k || 6, !!opts.canonical));
        const codes = opts.criterion === 'gap' ? null : seqs.map(q => codesOf(q.seq));
        let remaining = seqs.map((_, i) => i);
        const groups = [], outliers = [], steps = [], maxSteps = opts.maxSteps || 200;
        while (remaining.length >= minSize && steps.length < maxSteps) {
            if (opts.outliers !== false) {
                const o = findOutliers(dist, remaining, z);
                if (o.length) { const os = new Set(o); outliers.push(...o); remaining = remaining.filter(i => !os.has(i)); steps.push({ kind: 'outliers', n: o.length, ids: o }); if (remaining.length < minSize) break; }
            }
            let best;
            if (opts.criterion === 'gap') {
                best = nextCandidates(dist, remaining, minSize, opts.linkage, opts.alpha).filter(c => c.gap >= minGap && c.rel >= (opts.minRel || 0))[0];
            } else {
                const minDiag = opts.minDiag != null ? opts.minDiag : 3, byEnrich = opts.score === 'enrich';
                best = diagCandidates(codes, dist, remaining, minSize, opts).filter(c => c.diag >= minDiag)
                    .sort((p, q) => (byEnrich ? q.enrich - p.enrich : q.diag - p.diag) || p.size - q.size)[0];
            }
            if (!best) break;
            groups.push(best.members); steps.push({ kind: 'group', size: best.size, diag: best.diag, gap: best.gap, ids: best.members });
            if (opts.log) { const map = opts._map || (i => i); opts.log.push({ level: opts._level || 0, ids: best.members.map(map), pool: remaining.map(map), diag: best.diag, cols: best.cols || [], chars: best.chars || [] }); }
            const gs = new Set(best.members); remaining = remaining.filter(i => !gs.has(i));
        }
        // What is left is a group too when it is as tight as the groups already peeled (the last coherent group has no remainder
        // of its own to be told apart from); a heterogeneous leftover stays unassigned ("only noisy ungroupable sequences remain").
        const meanWithin = ids => { if (ids.length < 2) return 0; let t = 0, c = 0; const step = Math.max(1, Math.floor(ids.length / 40));
            for (let a2 = 0; a2 < ids.length; a2 += step) for (let b2 = a2 + 1; b2 < ids.length; b2 += step) { t += dist[ids[a2]][ids[b2]]; c++; } return c ? t / c : 0; };
        if (opts.remainderGroup !== false && groups.length && remaining.length >= minSize) {
            const w = groups.map(meanWithin).sort((x, y) => x - y), med = w[w.length >> 1];
            if (meanWithin(remaining) <= 2 * med + 0.01) { groups.push(remaining); steps.push({ kind: 'group', size: remaining.length, diag: 0, remainder: true, ids: remaining }); if (opts.log) { const map = opts._map || (i => i); opts.log.push({ level: opts._level || 0, ids: remaining.map(map), pool: remaining.map(map), diag: 0, cols: [], chars: [], remainder: true }); } remaining = []; }
        }
        // Refine: look inside each peeled group the same way (a peeled group is inspected on its own afterwards). The diagnostic
        // columns are recomputed against the group's own members, so they separate sub-groups, not the group from the rest.
        let refined = groups;
        const depth = opts.refine == null ? 0 : opts.refine | 0;
        if (depth > 0 && opts.criterion !== 'gap') {
            refined = [];
            for (const g of groups) {
                if (g.length < 2 * minSize) { refined.push(g); continue; }
                const outer = opts._map || (i => i);
                const sub = peel(g.map(i => seqs[i]), Object.assign({}, opts, { refine: depth - 1, outliers: false, metric, _map: i => outer(g[i]), _level: (opts._level || 0) + 1 }));
                if (sub.groups.length < 2 && !(sub.groups.length === 1 && sub.remaining.length >= minSize)) { refined.push(g); continue; }
                sub.groups.forEach(x => refined.push(x.map(i => g[i])));
                if (sub.remaining.length >= minSize) refined.push(sub.remaining.map(i => g[i]));
                else sub.remaining.forEach(i => remaining.push(g[i]));      // too few left to be a group: back to the unassigned
            }
        }
        return { groups: refined, coarse: groups, outliers, unassigned: remaining.concat(outliers).sort((a, b) => a - b), remaining, steps, metric };
    }

    const api = { peel, nextCandidates, diagCandidates, findOutliers };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Peel = api;
})(typeof window !== 'undefined' ? window : this);
