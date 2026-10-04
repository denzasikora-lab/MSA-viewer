'use strict';
/**
 * codon-align.js: frameshift-aware codon alignment of coding sequences, in plain JavaScript.
 *
 * Model (after MACSE, Ranwez et al. 2011 PLoS ONE 6:e22594; 2018 MBE 35:2582): the alignment is a series of
 * codon columns. In a column each sequence contributes a whole codon (3 nt), a gap ('---'), or a frameshifted
 * codon: 1 or 2 real nucleotides padded with '!' marking the missing bases. Codon pairs are scored by an amino
 * acid matrix (BLOSUM62) plus a small nucleotide-identity bonus; gaps are affine; every frameshifted codon and
 * every internal stop codon pays a penalty.
 *
 * Differences from MACSE, for speed: pairwise dynamic programming (Gotoh, three states) inside a band, and a
 * centre-star multiple alignment around one frame-defining reference sequence (default: the first). The reference is
 * in frame at its first nucleotide; a first pass with a free reference frame moves a reference frameshift into the
 * reference only when at least half of the other sequences (and at least two of them, if there are two or more)
 * support it. Otherwise frameshifts are attributed to the non-reference sequences, so choose a clean reference.
 *
 * Input: nucleotide CDS (DNA or RNA, any case, IUPAC codes); gaps in the input are ignored. The output keeps the
 * input letters (case, U). Protein-like input (>2% non-nucleotide characters overall or >10% in one sequence) is
 * refused, and so is any pair needing more than opts.maxCells DP cells (3 bytes each).
 *
 * Written from the published algorithm description; no MACSE source code was used.
 *
 * API (browser global CodonAlign, or module.exports in Node):
 *   CodonAlign.alignPairwise(a, b, opts)    -> { columns: [[ka, kb], ...], score }
 *   CodonAlign.alignMultiple(records, opts) -> { nt: [{name, seq}], aa: [{name, seq}], stats }
 *   CodonAlign.toFasta(records), CodonAlign.parseFasta(text)
 * opts: { ref (index or name, default 0; stats.refFound is false for a name that was not found), gapOpen (-10),
 *         gapExtend (-1), frameshift (-40), terminalFrameshift (-10), stop (-50, deliberately below two frameshifts),
 *         ntBonus (0.5 per identical nucleotide), band (null = automatic: |n-m| + max(bandMin, bandFrac*len), widened
 *         on failure), maxCells (1e8), frameRestored (false: keep '!' as MACSE does; true: write '-' instead so the
 *         alignment is plain nucleotide) }
 * Scores were tuned against MACSE v2.07 on 24 four-species hamster BUSCO genes (tests/codon-align); on all 2,636
 * genes of that set 98.9% of MACSE's homologous nucleotide pairs are reproduced (median 99.7%).
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.CodonAlign = api;
}(typeof self !== 'undefined' ? self : this, function () {

    // ---- genetic code (standard) and BLOSUM62 ---------------------------------------------------------------
    const CODE = {};
    (function () {
        const b = 'TCAG', aa = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
        let i = 0;
        for (const x of b) for (const y of b) for (const z of b) CODE[x + y + z] = aa[i++];
    })();
    const AA_ORDER = 'ARNDCQEGHILKMFPSTWYVX*';   // index 20 = X (unknown), 21 = stop
    const B62 = [
        [4, -1, -2, -2, 0, -1, -1, 0, -2, -1, -1, -1, -1, -2, -1, 1, 0, -3, -2, 0],
        [-1, 5, 0, -2, -3, 1, 0, -2, 0, -3, -2, 2, -1, -3, -2, -1, -1, -3, -2, -3],
        [-2, 0, 6, 1, -3, 0, 0, 0, 1, -3, -3, 0, -2, -3, -2, 1, 0, -4, -2, -3],
        [-2, -2, 1, 6, -3, 0, 2, -1, -1, -3, -4, -1, -3, -3, -1, 0, -1, -4, -3, -3],
        [0, -3, -3, -3, 9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1],
        [-1, 1, 0, 0, -3, 5, 2, -2, 0, -3, -2, 1, 0, -3, -1, 0, -1, -2, -1, -2],
        [-1, 0, 0, 2, -4, 2, 5, -2, 0, -3, -3, 1, -2, -3, -1, 0, -1, -3, -2, -2],
        [0, -2, 0, -1, -3, -2, -2, 6, -2, -4, -4, -2, -3, -3, -2, 0, -2, -2, -3, -3],
        [-2, 0, 1, -1, -3, 0, 0, -2, 8, -3, -3, -1, -2, -1, -2, -1, -2, -2, 2, -3],
        [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4, 2, -3, 1, 0, -3, -2, -1, -3, -1, 3],
        [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4, -2, 2, 0, -3, -2, -1, -2, -1, 1],
        [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5, -1, -3, -1, 0, -1, -3, -2, -2],
        [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5, 0, -2, -1, -1, -1, -1, 1],
        [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6, -4, -2, -2, 1, 3, -1],
        [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7, -1, -1, -4, -3, -2],
        [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4, 1, -3, -2, -2],
        [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5, -2, -2, 0],
        [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11, 2, -3],
        [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7, -1],
        [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4]
    ];
    const AA_IDX = {};
    for (let i = 0; i < AA_ORDER.length; i++) AA_IDX[AA_ORDER[i]] = i;

    function translateCodon(c) {
        const u = c.toUpperCase().replace(/U/g, 'T');
        if (u.indexOf('!') >= 0) return '!';
        if (u === '---') return '-';
        return CODE[u] || 'X';
    }

    const DEFAULTS = {
        ref: 0, gapOpen: -10, gapExtend: -1, frameshift: -40, terminalFrameshift: -10, stop: -50, ntBonus: 0.5,
        band: null, bandMin: 60, bandFrac: 0.06, fullLimit: 1500000, maxCells: 100000000, frameRestored: false, lockRefFrame: true
    };

    // Moves: [ka, kb] = nucleotides consumed from a and b. 0 = gap, 3 = codon, 1/2 = frameshifted codon.
    const MOVES = [
        [3, 3], [3, 0], [0, 3],
        [3, 1], [3, 2], [1, 3], [2, 3],
        [1, 0], [2, 0], [0, 1], [0, 2],
        [1, 1], [1, 2], [2, 1], [2, 2]
    ];
    const NEG = -1e9;

    // ---- pairwise banded Gotoh over codon columns ----------------------------------------------------------
    // Returns null when the optimal path leaves the band (caller widens it).
    function alignPairwiseOnce(a, b, o, w) {
        const n = a.length, m = b.length;
        const S = 2; // integer scaling of BLOSUM (so the 0.5 nt bonus is an integer)
        const GO = Math.round(o.gapOpen * S), GE = Math.round(o.gapExtend * S), FS = Math.round(o.frameshift * S);
        const FST = Math.round(o.terminalFrameshift * S), STOP = Math.round(o.stop * S), NTB = Math.round(o.ntBonus * S);
        const lockA = !!o.lockRefFrame;
        // scaled substitution table over 23 codon classes: 20 amino acids, 20 = X, 21 = stop, 22 = a codon that
        // already carries '!' (a frameshift fixed in the reference by the first pass): neutral against anything but a stop
        const SC = new Int16Array(23 * 23);
        for (let x = 0; x < 23; x++) for (let y = 0; y < 23; y++) {
            let v;
            if (x === 22 || y === 22) v = (x === 21 || y === 21) ? STOP : 0;
            else if (x === 21 || y === 21) v = (x === 21 && y === 21) ? 0 : STOP;
            else if (x === 20 || y === 20) v = -1 * S;
            else v = B62[x][y] * S;
            SC[x * 23 + y] = v;
        }
        const ia = new Uint8Array(n + 1), ib = new Uint8Array(m + 1);
        for (let i = 0; i + 3 <= n; i++) { const c = a.substr(i, 3); ia[i] = c.indexOf('!') >= 0 ? 22 : AA_IDX[CODE[c] || 'X']; }
        for (let j = 0; j + 3 <= m; j++) { const c = b.substr(j, 3); ib[j] = c.indexOf('!') >= 0 ? 22 : AA_IDX[CODE[c] || 'X']; }
        const ca = new Uint8Array(n + 3), cb = new Uint8Array(m + 3);
        for (let i = 0; i < n; i++) ca[i] = a.charCodeAt(i);
        for (let j = 0; j < m; j++) cb[j] = b.charCodeAt(j);
        // internal stop codon penalties (a stop in the last codon is not internal)
        const spA = new Int32Array(n + 1), spB = new Int32Array(m + 1);
        for (let i = 0; i + 3 <= n; i++) spA[i] = (ia[i] === 21 && i + 3 < n) ? STOP : 0;
        for (let j = 0; j + 3 <= m; j++) spB[j] = (ib[j] === 21 && j + 3 < m) ? STOP : 0;
        const full = w >= Math.max(n, m);
        const W = full ? m + 1 : 2 * w + 1;
        const cw = new Int32Array(n + 1); // (band centre - w) per row; 0 everywhere in full-matrix mode
        if (!full) for (let i = 0; i <= n; i++) cw[i] = (n === 0 ? 0 : Math.round(i * m / n)) - w;
        // traceback: one byte per cell per state: move index (0..14, 15 = none) | prevState << 4
        const tbM = new Uint8Array((n + 1) * W), tbX = new Uint8Array((n + 1) * W), tbY = new Uint8Array((n + 1) * W);
        // rolling score rows for i-3..i, flat: row r of state M is FM.subarray(r*W, (r+1)*W)
        const FM = new Int32Array(4 * W), FX = new Int32Array(4 * W), FY = new Int32Array(4 * W);
        const RM = [], RX = [], RY = [];
        for (let r = 0; r < 4; r++) { RM.push(FM.subarray(r * W, (r + 1) * W)); RX.push(FX.subarray(r * W, (r + 1) * W)); RY.push(FY.subarray(r * W, (r + 1) * W)); }
        // frameshift moves. With the reference frame locked, a frameshifted reference codon is allowed only as the
        // very last column (a CDS whose length is not a multiple of 3 ends in a partial codon).
        const fsMoves = MOVES.filter(([ka, kb]) => !((ka === 3 && kb === 3) || (ka === 3 && kb === 0) || (ka === 0 && kb === 3)));
        const nf = fsMoves.length;
        const fka = new Int8Array(nf), fkb = new Int8Array(nf), fmv = new Int8Array(nf);
        for (let t = 0; t < nf; t++) { fka[t] = fsMoves[t][0]; fkb[t] = fsMoves[t][1]; fmv[t] = MOVES.indexOf(fsMoves[t]); }

        for (let i = 0; i <= n; i++) {
            const r = i & 3, M = RM[r], X = RX[r], Y = RY[r];
            M.fill(NEG); X.fill(NEG); Y.fill(NEG);
            const base = i * W, cwi = cw[i];
            const jlo = Math.max(0, cwi), jhi = Math.min(m, cwi + W - 1);
            const M3 = RM[(i - 3) & 3], X3 = RX[(i - 3) & 3], Y3 = RY[(i - 3) & 3];
            const cw3 = i >= 3 ? cw[i - 3] : 0;
            for (let j = jlo; j <= jhi; j++) {
                const k = j - cwi;
                if (i === 0 && j === 0) { M[k] = 0; tbM[base] = 15; continue; }
                let bestM = NEG, bestMmv = 15, bestMprev = 0;
                let bestX = NEG, bestXmv = 15, bestXprev = 0;
                let bestY = NEG, bestYmv = 15, bestYprev = 0;
                // (3,3) codon match
                if (i >= 3 && j >= 3) {
                    const pk = j - 3 - cw3;
                    if (pk >= 0 && pk < W) {
                        let sc = SC[ia[i - 3] * 23 + ib[j - 3]];
                        if (ca[i - 3] === cb[j - 3]) sc += NTB;
                        if (ca[i - 2] === cb[j - 2]) sc += NTB;
                        if (ca[i - 1] === cb[j - 1]) sc += NTB;
                        let best = M3[pk], prev = 0;
                        if (X3[pk] > best) { best = X3[pk]; prev = 1; }
                        if (Y3[pk] > best) { best = Y3[pk]; prev = 2; }
                        if (best > NEG / 2) { bestM = best + sc; bestMmv = 0; bestMprev = prev; }
                    }
                }
                // (3,0) gap in b -> X (affine)
                if (i >= 3) {
                    const pk = j - cw3;
                    if (pk >= 0 && pk < W) {
                        const sc = spA[i - 3];
                        const fx = X3[pk] + GE + sc, fm = M3[pk] + GO + sc, fy = Y3[pk] + GO + sc;
                        bestX = fx; bestXprev = 1; bestXmv = 1;
                        if (fm > bestX) { bestX = fm; bestXprev = 0; }
                        if (fy > bestX) { bestX = fy; bestXprev = 2; }
                        if (bestX <= NEG / 2) { bestX = NEG; bestXmv = 15; }
                    }
                }
                // (0,3) gap in a -> Y (affine)
                if (j >= 3) {
                    const pk = j - 3 - cwi;
                    if (pk >= 0 && pk < W) {
                        const sc = spB[j - 3];
                        const fy = Y[pk] + GE + sc, fm = M[pk] + GO + sc, fx = X[pk] + GO + sc;
                        bestY = fy; bestYprev = 2; bestYmv = 2;
                        if (fm > bestY) { bestY = fm; bestYprev = 0; }
                        if (fx > bestY) { bestY = fx; bestYprev = 1; }
                        if (bestY <= NEG / 2) { bestY = NEG; bestYmv = 15; }
                    }
                }
                // frameshift moves -> M
                for (let t = 0; t < nf; t++) {
                    const ka = fka[t], kb = fkb[t];
                    if (lockA && ka !== 0 && ka !== 3 && i !== n) continue;
                    const pi = i - ka, pj = j - kb;
                    if (pi < 0 || pj < 0) continue;
                    const pk = pj - cw[pi];
                    if (pk < 0 || pk >= W) continue;
                    const po = (pi & 3) * W + pk;
                    const pM = FM[po], pX = FX[po], pY = FY[po];
                    let best = pM, prev = 0;
                    if (pX > best) { best = pX; prev = 1; }
                    if (pY > best) { best = pY; prev = 2; }
                    if (best <= NEG / 2) continue;
                    let sc = 0;
                    if (ka === 1 || ka === 2) sc += (pi === 0 || i === n) ? FST : FS;
                    if (kb === 1 || kb === 2) sc += (pj === 0 || j === m) ? FST : FS;
                    if (ka === 0 || kb === 0) sc += GO;
                    if (ka === 3) sc += spA[pi];
                    if (kb === 3) sc += spB[pj];
                    const v = best + sc;
                    if (v > bestM) { bestM = v; bestMmv = fmv[t]; bestMprev = prev; }
                }
                M[k] = bestM; X[k] = bestX; Y[k] = bestY;
                tbM[base + k] = bestMmv | (bestMprev << 4);
                tbX[base + k] = bestXmv | (bestXprev << 4);
                tbY[base + k] = bestYmv | (bestYprev << 4);
            }
        }
        const kEnd = m - cw[n];
        if (kEnd < 0 || kEnd >= W) return null;
        const re = n & 3;
        let st = 0, score = RM[re][kEnd];
        if (RX[re][kEnd] > score) { score = RX[re][kEnd]; st = 1; }
        if (RY[re][kEnd] > score) { score = RY[re][kEnd]; st = 2; }
        if (score <= NEG / 2) return null;
        const cols = [];
        let i = n, j = m;
        while (i > 0 || j > 0) {
            const k = j - cw[i];
            const tb = st === 0 ? tbM : st === 1 ? tbX : tbY;
            const code = tb[i * W + k];
            const mv = code & 15, prev = code >> 4;
            if (mv === 15) return null;
            const ka = MOVES[mv][0], kb = MOVES[mv][1];
            cols.push([ka, kb]);
            i -= ka; j -= kb; st = prev;
        }
        cols.reverse();
        return { columns: cols, score: score / S };
    }

    function alignPairwise(a, b, opts) {
        const o = Object.assign({}, DEFAULTS, opts || {});
        a = scoringForm(a); b = scoringForm(b);
        const n = a.length, m = b.length, mx = Math.max(n, m, 1);
        let w = o.band;
        if (w == null) {
            w = Math.abs(n - m) + Math.max(o.bandMin, Math.round(o.bandFrac * mx));
            if (n * m <= o.fullLimit) w = mx;
        }
        w = Math.max(3, Math.min(w, mx));
        for (;;) { // widen the band until the alignment fits (a long indel can leave the diagonal)
            const W = w >= Math.max(n, m) ? m + 1 : 2 * w + 1;
            const cells = (n + 1) * W;
            if (cells > o.maxCells) {
                throw new Error('codon-align: ' + n.toLocaleString() + ' vs ' + m.toLocaleString() + ' nt needs about ' +
                    Math.round(cells * 3 / 1048576).toLocaleString() + ' MB of working memory (limit ' + Math.round(o.maxCells * 3 / 1048576) +
                    ' MB). Codon alignment expects homologous coding sequences of similar length; trim very long or very different sequences first.');
            }
            const r = alignPairwiseOnce(a, b, o, w);
            if (r) return r;
            if (w >= mx) throw new Error('codon-align: no alignment found');
            w = Math.min(mx, w * 2);
        }
    }

    // ---- render a frameshifted codon: k real nucleotides padded with '!' where it best matches the partner --
    // nts keeps the caller's letters (case, U); partner is in scoring form (upper case, T)
    function padCodon(nts, partner) {
        const k = nts.length;
        if (k === 3) return nts;
        if (k === 0) return '---';
        const options = k === 2 ? [nts + '!', nts[0] + '!' + nts[1], '!' + nts] : [nts + '!!', '!' + nts + '!', '!!' + nts];
        if (!partner || partner.indexOf('-') >= 0 || partner.indexOf('!') >= 0) return options[0];
        let best = options[0], bestN = -1;
        for (const op of options) {
            const opU = scoringForm(op);
            let s = 0;
            for (let t = 0; t < 3; t++) if (opU[t] !== '!' && opU[t] === partner[t]) s++;
            if (s > bestN) { bestN = s; best = op; }
        }
        return best;
    }

    // Upper case, U -> T: the form used for scoring and translation. The output keeps the input letters.
    function scoringForm(s) {
        return s.toUpperCase().replace(/U/g, 'T');
    }

    const NT_OK = /[ACGTUNRYKMSWBDHVacgtunrykmswbdhv]/;
    function checkNucleotide(recs) {
        let bad = 0, tot = 0, worst = null, worstFrac = 0;
        for (const r of recs) {
            let b = 0;
            for (const ch of r.orig) if (!NT_OK.test(ch)) b++;
            bad += b; tot += r.orig.length;
            const f = r.orig.length ? b / r.orig.length : 0;
            if (f > worstFrac) { worstFrac = f; worst = r.name; }
        }
        if (tot > 0 && (bad / tot > 0.02 || worstFrac > 0.1)) {
            throw new Error('codon-align: the input does not look like nucleotide coding sequences (' + (100 * bad / tot).toFixed(1) +
                '% non-nucleotide characters; worst: "' + String(worst).split(/\s+/)[0] + '" ' + (100 * worstFrac).toFixed(0) +
                '%). Codon alignment needs CDS in nucleotides.');
        }
    }

    // ---- centre-star multiple alignment ------------------------------------------------------------------------
    function alignMultiple(records, opts) {
        const o = Object.assign({}, DEFAULTS, opts || {});
        const recs = records.map(r => {
            const orig = String(r.seq).replace(/[-.!\s]/g, '');
            return { name: r.name, orig, seq: scoringForm(orig) };
        });
        if (recs.length === 0) return { nt: [], aa: [], stats: {} };
        checkNucleotide(recs);
        let refIdx = 0, refFound = true;
        if (typeof o.ref === 'number') refIdx = Math.max(0, Math.min(recs.length - 1, o.ref));
        else if (typeof o.ref === 'string' && o.ref) {
            const f = recs.findIndex(r => r.name === o.ref || r.name.split(/\s+/)[0] === o.ref);
            if (f >= 0) refIdx = f; else refFound = false;
        }
        const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const t0 = now();
        const ref0 = recs[refIdx].seq, ref0Orig = recs[refIdx].orig;
        // Pass 1 (reference frame free): find frameshifts that belong to the reference itself. A reference-side
        // frameshift supported by at least half of the other sequences (at least two when there are two or more)
        // is fixed into the reference as '!' padding, so that pass 2 can keep the reference frame locked (needed for
        // the centre-star merge) while the whole alignment can still change frame where every sequence does (a
        // gene-model error shared by all of them). With two sequences this gives the optimal pairwise alignment.
        // The reference is in frame at its first nucleotide by definition: a shift at nucleotide 0 (re-reading the
        // whole reference in another frame) and partial codons at the very end never vote.
        const k = recs.length - 1;
        const need = k === 1 ? 1 : Math.max(2, Math.ceil(k / 2));
        const votes = new Map(); // ref nt index -> {count, ka}
        if (k >= 1) {
            for (let s = 0; s < recs.length; s++) {
                if (s === refIdx) continue;
                const { columns } = alignPairwise(ref0, recs[s].seq, Object.assign({}, o, { lockRefFrame: false }));
                let i = 0;
                for (const [ka] of columns) {
                    if ((ka === 1 || ka === 2) && i > 0 && i + ka < ref0.length) { // start and terminal partial codons do not vote
                        const v = votes.get(i) || { count: 0, ka: {} };
                        v.count++; v.ka[ka] = (v.ka[ka] || 0) + 1; votes.set(i, v);
                    }
                    i += ka;
                }
            }
        }
        let ref = '', refOut = '';
        {
            let i = 0;
            while (i < ref0.length) {
                const v = votes.get(i);
                if (v && v.count >= need) {
                    const ka = (v.ka[1] || 0) >= (v.ka[2] || 0) ? 1 : 2;
                    ref += padCodon(ref0.substr(i, ka), null); refOut += padCodon(ref0Orig.substr(i, ka), null); i += ka;
                } else { ref += ref0.substr(i, 3); refOut += ref0Orig.substr(i, 3); i += 3; }
            }
            const rem = ref.length % 3;
            if (rem) {
                ref = ref.slice(0, ref.length - rem) + padCodon(ref.slice(ref.length - rem), null);
                refOut = refOut.slice(0, refOut.length - rem) + padCodon(refOut.slice(refOut.length - rem), null);
            }
        }
        const nCod = ref.length / 3;
        // per non-reference sequence: refCol[r] (codon string aligned to ref codon r), ins[r] (codon strings inserted before ref codon r)
        const per = [];
        const pairScores = [];
        for (let s = 0; s < recs.length; s++) {
            if (s === refIdx) { per.push(null); continue; }
            const seq = recs[s].seq, orig = recs[s].orig;
            const { columns, score } = alignPairwise(ref, seq, Object.assign({}, o, { lockRefFrame: true }));
            pairScores.push(score);
            const refCol = new Array(nCod).fill('---');
            const ins = []; for (let r = 0; r <= nCod; r++) ins.push([]);
            let i = 0, j = 0, r = 0;
            for (const [ka, kb] of columns) {
                const bnts = orig.substr(j, kb);
                if (ka > 0) { // reference codon r (ka < 3 only for a terminal partial codon)
                    const rc = ref.substr(i, ka);
                    refCol[r] = padCodon(bnts, rc.length === 3 ? rc : null);
                    r++;
                } else { // ka === 0: insertion in this sequence before ref codon r
                    ins[r].push(padCodon(bnts, null));
                }
                i += ka; j += kb;
            }
            per.push({ refCol, ins });
        }
        // merge around the reference
        const out = recs.map(() => []);
        for (let r = 0; r <= nCod; r++) {
            let maxIns = 0;
            for (const p of per) if (p && p.ins[r].length > maxIns) maxIns = p.ins[r].length;
            for (let t = 0; t < maxIns; t++) {
                for (let s = 0; s < recs.length; s++) {
                    const p = per[s];
                    out[s].push(p && t < p.ins[r].length ? p.ins[r][t] : '---');
                }
            }
            if (r < nCod) {
                const rc = refOut.substr(3 * r, 3);
                for (let s = 0; s < recs.length; s++) {
                    if (s === refIdx) out[s].push(rc);
                    else out[s].push(per[s].refCol[r]);
                }
            }
        }
        const nt = recs.map((rec, s) => ({ name: rec.name, seq: out[s].join('') }));
        const aa = nt.map(x => ({ name: x.name, seq: (x.seq.match(/.{1,3}/g) || []).map(translateCodon).join('') }));
        // a stop is internal unless only gaps / frameshift padding follow it
        const internalStopCount = s => { const t = s.replace(/[-!]+$/, ''); return ((t.endsWith('*') ? t.slice(0, -1) : t).match(/\*/g) || []).length; };
        const stats = {
            ref: recs[refIdx].name, refFound, columns: out[0].length,
            frameshifts: nt.map(x => ({ name: x.name, n: (x.seq.match(/.{3}/g) || []).filter(c => c.indexOf('!') >= 0).length })),
            internalStops: aa.map(x => ({ name: x.name, n: internalStopCount(x.seq) })),
            pairScores, ms: now() - t0
        };
        if (o.frameRestored) for (const x of nt) x.seq = x.seq.replace(/!/g, '-');
        return { nt, aa, stats };
    }

    function toFasta(records, width) {
        width = width || 0;
        return records.map(r => {
            const s = width > 0 ? r.seq.match(new RegExp('.{1,' + width + '}', 'g')).join('\n') : r.seq;
            return '>' + r.name + '\n' + s;
        }).join('\n') + '\n';
    }

    function parseFasta(text) {
        const out = []; let cur = null;
        for (const raw of String(text).split('\n')) {
            const l = raw.trim();
            if (!l) continue;
            if (l[0] === '>') { cur = { name: l.slice(1).trim(), seq: '' }; out.push(cur); }
            else if (cur) cur.seq += l;
        }
        return out;
    }

    return { alignPairwise, alignMultiple, toFasta, parseFasta, translateCodon, checkNucleotide, DEFAULTS, MOVES };
}));
