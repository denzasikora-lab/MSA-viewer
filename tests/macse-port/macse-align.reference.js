'use strict';
/**
 * macse-align.js: the "alignSequences" program of MACSE v2.07, ported to JavaScript.
 *
 * MACSE: Multiple Alignment of Coding SEquences accounting for frameshifts and stop codons.
 *   Ranwez V, Harispe S, Delsuc F, Douzery EJP (2011) PLoS ONE 6:e22594.
 *   Ranwez V, Douzery EJP, Cambon C, Chantret N, Delsuc F (2018) Mol Biol Evol 35:2582-2584.
 * MACSE is distributed under the CeCILL 2.1 licence (https://cecill.info). This file is a derivative work: it is a
 * line-by-line port of the MACSE v2.07 classes that implement alignSequences (sequences.*, programs.profile.*,
 * programs.align.*, programs.refine.*, sequences.sp_scores.*), made from the official release jar (sha256
 * 96873a1465f1e1aa9d0c462d469eee6954d36e8639727f69f34a72fcb6583963), and is therefore distributed under CeCILL 2.1.
 * See LICENSE-MACSE in this repository.
 *
 * Goal: identical output to `java -jar macse_v2.07.jar -prog alignSequences` with default options (or the options
 * given below). Order of operations, tie-breaking, integer and single-precision float arithmetic follow the Java code.
 * Differences that do not change the result: score and traceback storage (typed arrays; only the band is stored),
 * and arithmetic regrouping of exact integer sums.
 *
 * API (browser global MacseAlign, or module.exports in Node):
 *   MacseAlign.alignSequences(records, opts) -> { nt: [{name, seq}], aa: [{name, seq}], stats }
 *     records: [{name, seq}] nucleotide sequences (gaps are removed first, as MACSE does).
 *     opts: { gc (genetic code number, 1), fs (30), fs_term (10), fs_lr (10), fs_lr_term (7), stop (50), stop_lr (17),
 *             gap_op (7), gap_ext (1), gap_op_term (6.3), gap_ext_term (0.9), max_refine_iter (-1),
 *             local_realign_init (0.5), local_realign_dec (0.5), optim (2), lessReliable: [names],
 *             ambi_OFF (false), maxTracebackCells (4e8), onProgress (fn(stage, done, total)) }
 *     nt: aligned nucleotides in MACSE's output order, '!' marks frameshift padding, '-' gaps (raw alignSequences
 *         output). aa: MACSE's out_AA translation ('!' frameshift, '*' stop).
 *   MacseAlign.parseFasta(text), MacseAlign.toFasta(records)
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.MacseAlign = api;
}(typeof self !== 'undefined' ? self : this, function () {

    // ------------------------------------------------------------------ Java numeric helpers
    const f32 = Math.fround;
    function javaRoundF(x) {                      // Math.round(float) -> int
        if (Number.isNaN(x)) return 0;
        if (x <= -2147483648) return -2147483648;
        if (x >= 2147483647) return 2147483647;
        return Math.floor(x + 0.5);
    }
    function javaIntF(x) {                        // (int) cast of a float/double
        if (Number.isNaN(x)) return 0;
        if (x <= -2147483648) return -2147483648;
        if (x >= 2147483647) return 2147483647;
        return Math.trunc(x);
    }
    const idiv = (a, b) => Math.trunc(a / b);     // Java int division (b != 0)

    function MacseError(msg) { const e = new Error(msg); e.macse = true; return e; }

    // ------------------------------------------------------------------ amino acid alphabet (sequences.SeqAA)
    const AMINOS_LETTERS = 'N!#$()*-<>ABCDEFGHIKLMNPQRSTVWXYZ';
    const NAA = AMINOS_LETTERS.length;            // 33
    const A2B = new Int32Array(91);               // Java AMINO_TO_BYTE (unknown letters -> 0)
    for (let i = 0; i < NAA; i++) A2B[AMINOS_LETTERS.charCodeAt(i)] = i;   // 'N' ends at 22 (asparagine)
    const B2A = AMINOS_LETTERS;                   // BYTE_TO_AMINO
    function upper(c) { return c >= 97 && c <= 122 ? c - 32 : c; }
    function aByte(code) {                        // SeqAA.toAminoByte
        const u = upper(code);
        if (u > 90) throw MacseError('amino acid character not handled: ' + String.fromCharCode(code));
        return A2B[u];
    }
    const C_BANG = 33, C_HASH = 35, C_DOLLAR = 36, C_LPAR = 40, C_RPAR = 41, C_STAR = 42, C_DASH = 45, C_LT = 60, C_GT = 62, C_X = 88;
    const B_X = A2B[C_X];

    // ------------------------------------------------------------------ nucleotides (sequences.SeqNT)
    const N2B = new Int32Array(128);              // Java NUCLEO_TO_BYTE, plus lower case (toNucleoByte upper-cases)
    [['R', 1], ['Y', 2], ['N', 3], ['A', 4], ['C', 5], ['G', 6], ['T', 7], ['-', 8], ['!', 15]].forEach(([c, b]) => {
        N2B[c.charCodeAt(0)] = b;
        if (c >= 'A' && c <= 'Z') N2B[c.toLowerCase().charCodeAt(0)] = b;
    });
    const AMBIGUITIES = [];                        // indexed by nucleotide byte 0..15
    {
        const B2N = ['N', 'R', 'Y', 'N', 'A', 'C', 'G', 'T', '-', '', '', '', '', '', '', '!'];
        const map = { R: 'AG', Y: 'CT', N: 'ACGT' };
        for (let b = 0; b < 16; b++) {
            const v = map[B2N[b]];
            AMBIGUITIES[b] = v ? v.split('').map(c => N2B[c.charCodeAt(0)]) : [b];
        }
    }
    function isLetter(code) { return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code > 127; }
    function checkNT(acids) {                     // SeqNT.checkAcids
        let out = null;
        for (let i = 0; i < acids.length; i++) {
            const c = acids.charCodeAt(i), u = upper(c);
            if (u > 90) throw MacseError('nucleotide character not handled: ' + acids[i]);
            if (N2B[u] !== 0) continue;
            if (isLetter(c)) {
                if (!out) out = acids.split('');
                out[i] = 'N';
            } else throw MacseError('nucleotide character not handled: ' + acids[i]);
        }
        return out ? out.join('') : acids;
    }
    const isGapNT = c => c === C_DASH || c === C_BANG;   // (nucleoByte & 8) == 8
    const isFsNT = c => c === C_BANG;                    // (nucleoByte & 0xF) == 15
    const pullGapCode = (code, nbyte) => ((code & 3) << 1) | ((nbyte & 8) >> 3);
    function ungapped(s) { return s.replace(/[-!]/g, ''); }

    // ------------------------------------------------------------------ genetic codes (sequences.ribosome.Ribosome)
    // MACSE's data/ribosomes files, as 64 amino acids in TCAG codon order.
    const CODE_TABLES = {
        1: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 2: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG',
        3: 'FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 4: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        5: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG', 6: 'FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        9: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG', 10: 'FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        11: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 12: 'FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        13: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG', 14: 'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG',
        15: 'FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 16: 'FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        21: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG', 22: 'FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        23: 'FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 24: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG',
        25: 'FFLLSSSSYY**CCGWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 26: 'FFLLSSSSYY**CC*WLLLAPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        27: 'FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 28: 'FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        29: 'FFLLSSSSYYYYCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 30: 'FFLLSSSSYYEECC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        31: 'FFLLSSSSYYEECCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG', 32: 'FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG',
        33: 'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG'
    };
    const ribosomeCache = {};
    function ribosome(code, ambiOff) {
        const key = code + (ambiOff ? 'a' : '');
        if (ribosomeCache[key]) return ribosomeCache[key];
        const table = CODE_TABLES[code];
        if (!table) throw MacseError('genetic code ' + code + ' is not available');
        const c0 = new Int32Array(512), c1 = new Int32Array(512);   // char codes, 0 = unset
        const T = 'TCAG';
        for (let i = 0; i < 64; i++) {
            const cod = T[i >> 4] + T[(i >> 2) & 3] + T[i & 3];
            let v = 0;
            for (let k = 0; k < 3; k++) v = (v << 3) | N2B[cod.charCodeAt(k)];
            c0[v] = c1[v] = table.charCodeAt(i);
        }
        for (let id = 0; id < 512; id++) {        // loadMissingRibosomes, ascending codon id
            if (c0[id] !== 0) continue;
            const nuc = [(id >> 6) & 7, (id >> 3) & 7, id & 7];
            const first = c1[(((AMBIGUITIES[nuc[0]][0] << 3) | AMBIGUITIES[nuc[1]][0]) << 3) | AMBIGUITIES[nuc[2]][0]];
            let amb = first;
            if (first !== C_X) {
                outer:
                for (const a of AMBIGUITIES[nuc[0]]) for (const b of AMBIGUITIES[nuc[1]]) for (const c of AMBIGUITIES[nuc[2]]) {
                    if (c1[(((a << 3) | b) << 3) | c] !== first) { amb = C_X; break outer; }
                }
            }
            c0[id] = C_X; c1[id] = amb;
        }
        const r = ambiOff ? c0 : c1;
        ribosomeCache[key] = r;
        return r;
    }

    // ------------------------------------------------------------------ score matrix (sequences.matrix.ScoreMatrix / Costs)
    const BLOSUM62_ORDER = 'ARNDCQEGHILKMFPSTWYVBZX';
    const BLOSUM62 = [
        [4], [-1, 5], [-2, 0, 6], [-2, -2, 1, 6], [0, -3, -3, -3, 9], [-1, 1, 0, 0, -3, 5], [-1, 0, 0, 2, -4, 2, 5],
        [0, -2, 0, -1, -3, -2, -2, 6], [-2, 0, 1, -1, -3, 0, 0, -2, 8], [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4],
        [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4], [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5],
        [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5], [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6],
        [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7], [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4],
        [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5],
        [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11],
        [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7],
        [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4],
        [-2, -1, 3, 4, -3, 0, 1, -1, 0, -3, -4, 0, -3, -3, -2, 0, -1, -4, -3, -3, 4],
        [-1, 0, 0, 1, -3, 3, 4, -2, 0, -3, -3, 1, -1, -3, -1, 0, -1, -3, -2, -2, 1, 4],
        [0, -1, -1, -1, -2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -2, 0, 0, -2, -1, -1, -1, -1, -1]
    ];
    function negCost(c) { let v = javaRoundF(f32(f32(c) * 10)); if (v > 0) v = -v; return v; }
    function makeCosts(o) {
        const c = {
            fsInt: negCost(o.fs), fsIntLR: negCost(o.fs_lr), fsTerm: negCost(o.fs_term), fsTermLR: negCost(o.fs_lr_term),
            gapExtInt: negCost(o.gap_ext), gapExtTerm: negCost(o.gap_ext_term), gapOpInt: negCost(o.gap_op), gapOpTerm: negCost(o.gap_op_term),
            stop: negCost(o.stop), stopLR: negCost(o.stop_lr)
        };
        if (c.fsTerm > c.gapExtTerm) c.fsTerm = c.gapExtTerm;          // Costs.getFrameshiftTerminal* clamps
        if (c.fsTermLR > c.gapExtTerm) c.fsTermLR = c.gapExtTerm;
        return c;
    }
    function makeMatrix(costs) {
        const M = new Int32Array(NAA * NAA);
        const set = (a, b, v) => { const x = aByte(a.charCodeAt(0)), y = aByte(b.charCodeAt(0)); M[x * NAA + y] = v; M[y * NAA + x] = v; };
        const CODES = '!#$()*-<>';
        const aminoCost = ch => ch === '!' ? costs.fsTerm : ch === '$' ? costs.fsTermLR : ch === '(' ? costs.fsInt : ch === ')' ? costs.fsIntLR
            : ch === '<' ? costs.stop : ch === '>' ? costs.stopLR : ch === '-' ? costs.gapExtInt : ch === '#' ? costs.gapExtTerm : 0;
        const chars = BLOSUM62_ORDER + CODES;
        for (let r = 0; r < BLOSUM62_ORDER.length; r++) {                    // loadAminosCosts, row by row
            const a = chars[r];
            for (let col = 0; col < chars.length; col++) {
                const b = chars[col];
                const v = col < r + 1 ? BLOSUM62[r][col] * 10 : (col >= BLOSUM62_ORDER.length ? aminoCost(a) + aminoCost(b) : 0);
                set(a, b, v);
            }
        }
        const isFs = ch => ch === '!' || ch === '$' || ch === '(' || ch === ')';
        const isGap = ch => ch === '-' || ch === '#';
        for (const a of CODES) for (const b of CODES) {                      // loadCodesToCodesCosts
            const fsGap = (isFs(a) && isGap(b)) || (isGap(a) && isFs(b));
            let v;
            if (fsGap) v = (a === '(' || b === '(') ? costs.fsInt : (a === ')' || b === ')') ? costs.fsIntLR : (a === '!' || b === '!') ? costs.fsTerm : costs.fsTermLR;
            else if (isGap(a) && isGap(b)) v = 0;
            else if (isFs(a) && isFs(b)) v = Math.ceil(0.9 * (aminoCost(a) + aminoCost(b)));
            else v = aminoCost(a) + aminoCost(b);
            set(a, b, v);
        }
        return M;
    }

    // ------------------------------------------------------------------ compressed alphabet (data/alphabets/SE_B_8)
    const ALPHABETS = { SE_B_8: 'AST, C, DHN, EKQR, FWY, G, ILMV, P' };
    const alphabetCache = {};
    function alphabetChars(name) {               // SeqAA.readGroupValues: amino byte -> group letter (X if none)
        if (alphabetCache[name]) return alphabetCache[name];
        const def = ALPHABETS[name];
        if (!def) throw MacseError('alphabet ' + name + ' is not available');
        const chars = new Array(NAA).fill(0);
        for (const g of def.split(', ')) for (const ch of g) chars[aByte(ch.charCodeAt(0))] = g.charCodeAt(0);
        for (let i = 0; i < NAA; i++) if (chars[i] === 0) chars[i] = C_X;
        const letters = [];
        for (const c of chars) if (!letters.includes(c)) letters.push(c);
        const r = { map: Int32Array.from(chars), letters: String.fromCharCode(...letters) };
        alphabetCache[name] = r;
        return r;
    }
    function translateAlphabet(acids, alpha) {
        const m = alpha.map; let s = '';
        for (let i = 0; i < acids.length; i++) s += String.fromCharCode(m[aByte(acids.charCodeAt(i))]);
        return s;
    }

    // ------------------------------------------------------------------ sequences
    // Ctx holds what the Java code reaches through SeqSetWrapper: ribosome, score matrix, costs.
    class SeqNT {
        constructor(name, acids, reliable, check) {
            this.name = name; this.acids = check === false ? acids : checkNT(acids); this.reliable = reliable;
            this._first = -1; this._last = -1;
        }
        first() {
            if (this._first === -1) { let s = 0; const a = this.acids; while (s < a.length && isGapNT(a.charCodeAt(s))) s++; this._first = s; }
            return this._first;
        }
        last() {
            if (this._last === -1) { const a = this.acids; let s = a.length - 1; while (s > 0 && isGapNT(a.charCodeAt(s))) s--; this._last = s; }
            return this._last;
        }
        insertAcids(index, s) {                   // AbstractSeq.insertAcids: no cache reset (as in Java)
            this.acids = this.acids.substring(0, index) + s + this.acids.substring(index + s.length);
        }
        removeGaps() { this.acids = ungapped(this.acids); }   // AbstractSeq.removeGaps: no cache reset
        toAminos(ctx) {                           // per nucleotide site: amino of the codon ending there
            const a = this.acids, ribo = ctx.ribo, n = a.length;
            const out = new Array(n);
            let code = 0, gap = 7;
            for (let s = 0; s < n; s++) {
                const b = N2B[a.charCodeAt(s)];
                code = ((code & 0x3F) << 3) | (b & 7);
                gap = pullGapCode(gap, b);
                out[s] = s >= 2 ? (gap === 0 ? ribo[code] : (gap === 7 ? C_DASH : C_BANG)) : C_BANG;
            }
            return new SeqAA(this.name, codesToString(out), this.reliable);
        }
        updatedAcids(ctx) {                       // SeqNT.computeUpdatedAcids
            const fsExt = this.reliable ? C_BANG : C_DOLLAR, fsInt = this.reliable ? C_LPAR : C_RPAR, stop = this.reliable ? C_LT : C_GT;
            const first = this.first(), last = this.last();
            const aa = this.toAminos(ctx).acids, n = aa.length;
            const out = new Array(n);
            for (let site = 0; site < n; site++) {
                const amino = aa.charCodeAt(site);
                out[site] = site < 2 ? fsExt : (site < last && amino === C_STAR ? stop
                    : ((site - 2 <= first || site >= last) && amino === C_DASH ? C_HASH
                        : (amino === C_BANG ? ((site - 2 <= first || site >= last) ? fsExt : fsInt) : amino)));
            }
            return out;                            // array of char codes
        }
        isCodonFrameshift(site) {
            const a = this.acids;
            for (let k = site; k < site + 3; k++) { if (k >= a.length) throw MacseError('alignment length is not a multiple of 3'); if (a.charCodeAt(k) === C_BANG) return true; }
            return false;
        }
        fsOrGapCount(site) {
            const a = this.acids; let n = 0;
            for (let k = 0; k < 3; k++) { if (site + k >= a.length) throw MacseError('alignment length is not a multiple of 3'); n += N2B[a.charCodeAt(site + k)] >> 3; }
            return n;
        }
        codonsPossibilities(site) {
            const n = this.fsOrGapCount(site), a = this.acids;
            if (n === 1) {
                const real = []; let fs = '!';
                for (let k = 0; k < 3; k++) { const ch = a[site + k]; if (isGapNT(ch.charCodeAt(0))) fs = ch; else real.push(ch); }
                return [fs + real[0] + real[1], real[0] + real[1] + fs, real[0] + fs + real[1]];
            }
            if (n === 2) {
                const fs = ['!', '!']; let real = '!', cpt = 0;
                for (let k = 0; k < 3; k++) { const ch = a[site + k]; if (!isGapNT(ch.charCodeAt(0))) { real = ch; break; } fs[cpt++] = ch; }
                return [fs[0] + fs[1] + real, real + fs[0] + fs[1], fs[0] + real + fs[1]];
            }
            return [];
        }
    }
    function bigFromCodes(arr) { let s = ''; for (let i = 0; i < arr.length; i += 30000) s += String.fromCharCode.apply(null, arr.slice(i, i + 30000)); return s; }
    function codesToString(arr) { return arr.length < 60000 ? String.fromCharCode.apply(null, arr) : bigFromCodes(arr); }

    class SeqAA {
        constructor(name, acids, reliable) { this.name = name; this.acids = acids; this.reliable = reliable; this._first = -1; this._last = -1; this._upd = null; }
        static isGapCode(c) { return c === C_DASH || c === C_HASH; }
        first() {
            if (this._first === -1) { let s = 0; const a = this.acids; while (s < a.length && SeqAA.isGapCode(a.charCodeAt(s))) s++; this._first = s; }
            return this._first;
        }
        last() {
            if (this._last === -1) { const a = this.acids; let s = a.length - 1; while (s > 0 && SeqAA.isGapCode(a.charCodeAt(s))) s--; this._last = s; }
            return this._last;
        }
        isGap(site) { return SeqAA.isGapCode(this.acids.charCodeAt(site)); }
        updated() {                               // SeqAA.computeUpdatedAminos
            if (this._upd) return this._upd;
            const fsExt = this.reliable ? C_BANG : C_DOLLAR, fsInt = this.reliable ? C_LPAR : C_RPAR, stop = this.reliable ? C_LT : C_GT;
            const first = this.first(), last = this.last(), a = this.acids, n = a.length;
            const out = new Int32Array(n);
            for (let site = 0; site < n; site++) {
                const amino = a.charCodeAt(site);
                if (site < last && amino === C_STAR) out[site] = stop;
                else if ((site < first || site >= last) && amino === C_DASH) out[site] = C_HASH;
                else if (amino === C_BANG) out[site] = (site <= first || site >= last) ? fsExt : fsInt;
                else out[site] = amino;
            }
            this._upd = out;
            return out;
        }
        frameAminos(rf) {                         // SeqAA.frameAminos(readingFrame)
            const a = this.acids, out = [];
            for (let s = (rf + 1) % 3; s < a.length; s += 3) out.push(a[s]);
            const nb = Math.ceil(f32(f32(a.length) / 3));
            if (out.length < nb) out.push(this.reliable ? '!' : '$');
            return new SeqAA(this.name, out.join(''), this.reliable);
        }
        gapsIntervals() {                         // SeqAA.computeGapsIntervals
            const r = [], a = this.acids; let gs = -1, ge = -1;
            for (let s = 0; s < a.length; s++) {
                if (SeqAA.isGapCode(a.charCodeAt(s))) { if (gs === -1) { gs = s; ge = s; } else ge++; }
                else if (gs !== -1) { r.push([gs, ge]); gs = -1; }
            }
            if (gs !== -1) r.push([gs, ge]);
            return r;
        }
    }

    // Ordered set with unique names (AbstractSeqSet extends LinkedHashSet; equals/hashCode use the name).
    class SeqSet {
        constructor() { this.arr = []; this.names = new Set(); }
        add(s) { if (!this.names.has(s.name)) { this.names.add(s.name); this.arr.push(s); } }
        get size() { return this.arr.length; }
        sites() { return this.arr.length ? this.arr[0].acids.length : -1; }
    }

    // GapsRestriction with threshold 0 (all uses in alignSequences)
    function keptColumnsNT(set, removeFS) {
        const n = set.sites(), kept = new Uint8Array(Math.max(n, 0));
        for (let site = 0; site < n; site++) {
            let real = false;
            for (const s of set.arr) {
                if (real) break;
                const c = s.acids.charCodeAt(site);
                real = removeFS ? (!isFsNT(c) && !isGapNT(c)) : (isFsNT(c) || !isGapNT(c));
            }
            if (real) kept[site] = 1;
        }
        return kept;
    }
    function restrictNT(set, removeFS) {          // AbstractSeqSet.computeGapsRestriction(removeFS) for SeqSetNT
        const kept = keptColumnsNT(set, removeFS), n = kept.length;
        let all = true; for (let i = 0; i < n; i++) if (!kept[i]) { all = false; break; }
        const out = new SeqSet();
        for (const s of set.arr) {
            let acids;
            if (all) acids = s.acids;
            else { const b = []; for (let i = 0; i < n; i++) if (kept[i]) b.push(s.acids[i]); acids = b.join(''); }
            if (ungapped(acids).length > 0) out.add(new SeqNT(s.name, acids, s.reliable));
        }
        return out;
    }
    function toAminosSet(set, ctx) { const r = new SeqSet(); for (const s of set.arr) r.add(s.toAminos(ctx)); return r; }
    function frameSet(setAA, rf) { const r = new SeqSet(); for (const s of setAA.arr) r.add(s.frameAminos(rf)); return r; }

    // SeqSetNT.improveFrameshiftsPositions
    function improveFrameshiftsPositions(set) {
        const nbSites = set.sites();
        const ACGT = 'ACGT';
        for (let site = 0; site < nbSites; site += 3) {
            const fq = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
            for (const s of set.arr) {
                if (s.fsOrGapCount(site) !== 0) continue;
                for (let k = 0; k < 3; k++) { const i = ACGT.indexOf(s.acids[site + k]); if (i >= 0) fq[k][i]++; }
            }
            for (const s of set.arr) {
                if (!s.isCodonFrameshift(site)) continue;
                const codons = s.codonsPossibilities(site);
                let best = -1, codon = '';
                for (const c of codons) {
                    let sc = 0;
                    for (let k = 0; k < 3; k++) { const i = ACGT.indexOf(c[k]); sc += i >= 0 ? fq[k][i] : 0; }
                    if (sc > best) { best = sc; codon = c; }
                }
                s.insertAcids(site, codon);
            }
        }
    }
    // SeqNT.removeUselessFrameshifts
    function removeUselessFrameshifts(s) {
        const comp = ['---', '!!', '!', ''];
        let b = '';
        for (let site = 0; site < s.length; site += 3) {
            let reals = '';
            for (let k = site; k < site + 3 && k < s.length; k++) { const c = s.charCodeAt(k); if (c !== C_BANG && c !== C_DASH) reals += s[k]; }
            b += comp[reals.length] + reals;
        }
        if (b.length !== s.length) {
            for (let site = b.length; site < s.length; site++) b += s[site] === '-' ? '!' : s[site];
        }
        return b;
    }

    // ------------------------------------------------------------------ profiles (programs.profile.Profile / SiteInfo)
    // Dimer patterns: X I E XX XI XE IX II EX EE
    const P_X = 0, P_I = 1, P_E = 2, P_EX = 8, P_II = 7, P_EE = 9;
    const DIMER_CODING = [[3, 4, 5], [6, 7, -1], [8, -1, 9]];
    const GAP_OPEN_TEMPLATE = (() => {             // GapOpenCostComputer.PESSIMISTIC_GAP_OPEN
        const t = Array.from({ length: 10 }, () => new Array(10).fill(0));
        t[3][4] = 2; t[3][5] = 1;
        t[4][3] = 2; t[4][6] = 2; t[4][8] = 2;
        t[5][3] = 1; t[5][6] = 1; t[5][8] = 1;
        t[6][4] = 2; t[6][5] = 1; t[6][7] = 2; t[6][9] = 1;
        t[7][6] = 2; t[7][8] = 2;
        t[8][4] = 2; t[8][5] = 1; t[8][7] = 2; t[8][9] = 1;
        t[9][6] = 1; t[9][8] = 1;
        return t;
    })();
    function dimerCode(prev, cur) { const v = DIMER_CODING[prev][cur]; if (v < 0) throw MacseError('internal: invalid dimer'); return v; }

    function buildProfile(set, ctx) {
        const S = set.sites() + 1;
        const freq = new Int32Array(S * 4 * NAA), dim = new Int32Array(S * 4 * 10), prevMono = new Int32Array(S);
        const GAPB = 8, B_HASH = A2B[C_HASH], B_DASH = A2B[C_DASH];
        for (const sq of set.arr) {
            const upd = sq.updatedAcids(ctx), acids = sq.acids;
            const first = sq.first(), last = sq.last(), rel = sq.reliable;
            let cgc = 7;
            for (let p = 0; p < S; p++) {
                const ss = p - 1; let amino;
                if (ss < 0) { cgc = 0; amino = C_X; }
                else { cgc = pullGapCode(cgc, N2B[acids.charCodeAt(ss)]); amino = upd[ss]; }
                const ab = aByte(amino);
                freq[(p * 4) * NAA + ab]++;
                const cur = amino === C_HASH ? P_E : (amino === C_DASH ? P_I : P_X);
                prevMono[p] = cur;
                let pm = p - 3 < 0 ? P_X : prevMono[p - 3];
                dim[(p * 4) * 10 + cur]++;
                dim[(p * 4) * 10 + dimerCode(pm, cur)]++;
                let addGap, mgm;
                if (ss < first || ss >= last) { addGap = B_HASH; mgm = P_E; } else { addGap = B_DASH; mgm = P_I; }
                let mcgc = pullGapCode(cgc, GAPB);
                for (let g = 1; g <= 2; g++) {
                    if (g === 2) mcgc = pullGapCode(mcgc, GAPB);
                    if (mcgc === 0) throw MacseError('Bug profile init site info gap1.');
                    const pmg = p + g - 3 < 0 ? P_X : prevMono[p + g - 3];
                    const o = (p * 4 + g);
                    if (mcgc === 7) {
                        freq[o * NAA + addGap]++; dim[o * 10 + mgm]++; dim[o * 10 + dimerCode(pmg, mgm)]++;
                    } else {
                        const fsType = (ss <= first + g % 2 || ss >= last) ? (rel ? A2B[C_BANG] : A2B[C_DOLLAR]) : (rel ? A2B[C_LPAR] : A2B[C_RPAR]);
                        freq[o * NAA + fsType]++; dim[o * 10 + P_X]++; dim[o * 10 + dimerCode(pmg, P_X)]++;
                    }
                }
                pm = prevMono[p];
                const o3 = p * 4 + 3;
                freq[o3 * NAA + addGap]++; dim[o3 * 10 + mgm]++; dim[o3 * 10 + dimerCode(pm, mgm)]++;
            }
        }
        // SiteInfo for every (gapSize g, site s); index i = g*S + s
        const M = ctx.matrix, N4 = 4 * S;
        const internal = new Float64Array(N4), inFront = new Int32Array(N4 * NAA);
        const cfStart = new Int32Array(N4), cfLen = new Int32Array(N4);
        const cfAA = [], cfF = [];
        const dC = new Int32Array(N4 * 10), dIE = new Int32Array(N4 * 10), dXIE = new Int32Array(N4 * 10);
        for (let g = 0; g < 4; g++) for (let s = 0; s < S; s++) {
            const i = g * S + s, fo = (s * 4 + g) * NAA, dO = (s * 4 + g) * 10;
            cfStart[i] = cfAA.length;
            for (let a = 0; a < NAA; a++) if (freq[fo + a] > 0) { cfAA.push(a); cfF.push(freq[fo + a]); }
            cfLen[i] = cfAA.length - cfStart[i];
            let sp = 0;
            for (let u = cfStart[i]; u < cfStart[i] + cfLen[i]; u++) {
                const x = cfAA[u], fx = cfF[u];
                sp = (sp + Math.imul(idiv(Math.imul(fx, fx - 1), 2), M[x * NAA + x])) | 0;
                for (let v = u + 1; v < cfStart[i] + cfLen[i]; v++) sp = (sp + Math.imul(Math.imul(fx, cfF[v]), M[x * NAA + cfAA[v]])) | 0;
            }
            internal[i] = sp;
            for (let x = 0; x < NAA; x++) {
                let t = 0;
                for (let u = cfStart[i]; u < cfStart[i] + cfLen[i]; u++) t = (t + Math.imul(cfF[u], M[x * NAA + cfAA[u]])) | 0;
                inFront[i * NAA + x] = t;
            }
            for (let p = 3; p < 10; p++) dC[i * 10 + p] = dim[dO + p];
            const mX = dim[dO + P_X], mI = dim[dO + P_I], mE = dim[dO + P_E];
            dIE[i * 10 + P_EE] = mE; dIE[i * 10 + P_II] = mI;                       // computeDimerFreqIE
            dXIE[i * 10 + P_EX] += mX; dXIE[i * 10 + P_II] += mI; dXIE[i * 10 + P_EE] += mE;   // computeDimerFreqXIE
        }
        // H vectors (for use as the column profile): H[p1] = sum_p2 G[p1][p2] * f2[p2]
        const G = GAP_OPEN_TEMPLATE.map(r => r.map(v => v === 1 ? ctx.costs.gapOpTerm : v === 2 ? ctx.costs.gapOpInt : 0));
        const hv = d => {
            const h = new Int32Array(N4 * 10);
            for (let i = 0; i < N4; i++) for (let p1 = 3; p1 < 10; p1++) {
                let t = 0; for (let p2 = 3; p2 < 10; p2++) if (G[p1][p2]) t += G[p1][p2] * d[i * 10 + p2];
                h[i * 10 + p1] = t;
            }
            return h;
        };
        return {
            S, set, internal, inFront, cfStart, cfLen, cfAA: Int32Array.from(cfAA), cfF: Int32Array.from(cfF),
            dC, dIE, dXIE, hC: hv(dC), hIE: hv(dIE), hXIE: hv(dXIE)
        };
    }

    // ------------------------------------------------------------------ RestrictedCoordinates
    class RestrictedCoordinates {
        constructor(kept) {
            const pos = [];
            for (let i = 0; i < kept.length; i++) if (kept[i]) pos.push(i);
            this.pos = pos; this.nbSites = pos.length; this.facing = null;
        }
        setFacingSite(c2) {
            const a = this.pos, b = c2.pos;
            this.facing = a.map(() => [0, 0]); c2.facing = b.map(() => [0, 0]);
            let p1 = 0, p2 = 0;
            while (p1 < a.length && p2 < b.length) {
                const o1 = a[p1], o2 = b[p2];
                if (o1 < o2) { this.facing[p1][0] = p2 - 1; this.facing[p1][1] = p2; c2.facing[p2][0] = p1++; continue; }
                if (o2 < o1) { c2.facing[p2][0] = p1 - 1; c2.facing[p2][1] = p1; this.facing[p1][0] = p2++; continue; }
                this.facing[p1][0] = p2; this.facing[p1][1] = p2; c2.facing[p2][0] = p1; c2.facing[p2][1] = p1++; ++p2;
            }
            while (p1 < a.length) { this.facing[p1][0] = b.length - 1; this.facing[p1][1] = -1; ++p1; }
            while (p2 < b.length) { c2.facing[p2][0] = a.length - 1; c2.facing[p2][1] = -1; ++p2; }
        }
        boundsDeltaMax(c2, deltaDefault, deltaConserved, conserved) {
            const nb = this.nbSites, f = this.facing, pb = Array.from({ length: nb + 1 }, () => [0, 0]);
            pb[0][0] = -1; pb[nb][1] = -1;
            for (let prof = 0; prof < f.length + 1; prof++) {
                const delta = conserved != null && prof - 1 >= 0 && conserved[this.pos[prof - 1]] ? deltaConserved : deltaDefault;
                const sq = prof - 1;
                pb[prof][0] = sq - 1 < 0 || f[sq - 1][0] === -1 ? 0 : Math.max(0, f[sq - 1][0] + 1 - delta);
                pb[prof][1] = sq + 1 >= f.length || f[sq + 1][1] === -1 ? c2.nbSites + 1 : Math.min(c2.nbSites + 1, f[sq + 1][1] + 1 + delta);
            }
            pb[0][0] = 0; pb[0][1] = pb[1][1];
            return pb;
        }
        conservedSites(ali2) {
            const r = [];
            for (let i = 0; i < this.facing.length; i++) {
                const g = ali2.facing[i];
                if (g === undefined) throw MacseError('internal: conserved sites index out of range');
                if (this.facing[i][0] === g[0] && this.facing[i][1] === g[1]) r.push([this.pos[i], ali2.pos[i]]);
            }
            return r;
        }
    }

    // ------------------------------------------------------------------ profile aligner (programs.profile.ProfileAligner)
    const INS = 0, DEL = 1, MUT = 2;
    const MOVES = [[], [], []];
    for (const [di, dj] of [[3, 0], [2, 0], [1, 0]]) for (const pc of [INS, DEL, MUT]) MOVES[INS].push([pc, di, dj]);
    for (const [di, dj] of [[0, 3], [0, 2], [0, 1]]) for (const pc of [INS, DEL, MUT]) MOVES[DEL].push([pc, di, dj]);
    for (const [di, dj] of [[3, 3], [3, 2], [2, 3], [3, 1], [1, 3], [2, 2], [2, 1], [1, 2], [1, 1]]) for (const pc of [INS, DEL, MUT]) MOVES[MUT].push([pc, di, dj]);
    const MOVE_FLAT = MOVES.map(list => Int32Array.from(list.flat()));
    const TEMPLATE_FWD = ['---', '!!N', '!NN', 'NNN'];   // codonTemplate reversed (the Java builder is reversed at the end)

    class ProfileAligner {
        constructor(ctx) { this.ctx = ctx; this.cur = [INS, 0, 0]; this.p1Coord = null; }

        alignProfiles(set1, set2, bounds) {
            const ctx = this.ctx;
            const P1 = buildProfile(set1, ctx), P2 = buildProfile(set2, ctx);
            const { t1, t2 } = this.dp(P1, P2, bounds);
            // ProfileAlignerBacktrack.backtrack
            const bt = new SeqSet();
            for (const [P, t] of [[P1, t1], [P2, t2]]) for (const sq of P.set.arr) {
                const src = sq.acids, b = new Array(t.length); let cpt = 0;
                for (let k = 0; k < t.length; k++) b[k] = t.charCodeAt(k) === 78 ? src[cpt++] : '-';
                bt.add(new SeqNT(sq.name, removeUselessFrameshifts(b.join('')), sq.reliable));
            }
            let set = restrictNT(bt, false);
            const kept = keptColumnsNT(set, false);
            set = restrictNT(set, false);
            let f1 = '', f2 = '';
            for (let i = 0; i < kept.length; i++) if (kept[i]) { f1 += t1[i]; f2 += t2[i]; }
            const toKept = t => { const k = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) k[i] = t[i] !== '-' && t[i] !== '!' ? 1 : 0; return k; };
            this.p1Coord = new RestrictedCoordinates(toKept(f1));
            this.p1Coord.setFacingSite(new RestrictedCoordinates(toKept(f2)));
            improveFrameshiftsPositions(set);
            return set;
        }

        dp(P1, P2, bounds) {
            const S1 = P1.S, S2 = P2.S, ctx = this.ctx;
            const rowMin = new Int32Array(S1), rowMax = new Int32Array(S1), rowOff = new Float64Array(S1);
            let tot = 0;
            for (let l = 0; l < S1; l++) {
                let a = 0, b = S2;
                if (bounds) { a = bounds[l][0]; b = bounds[l][1]; }
                rowMin[l] = a; rowMax[l] = b; rowOff[l] = tot; tot += Math.max(0, b - a);
            }
            if (tot > ctx.maxTracebackCells) throw MacseError(`alignment needs ${Math.round(tot * 2 / 1048576)} MB of traceback memory (limit ${Math.round(ctx.maxTracebackCells * 2 / 1048576)} MB)`);
            const tb = new Uint16Array(tot);
            const W = 3 * S2;
            const sc = new Float64Array(4 * W).fill(-Infinity);
            const slot = [0, W, 2 * W, 3 * W];
            sc[slot[0] + MUT * S2 + 0] = 0;
            const { internal: in1, cfStart: cs1, cfLen: cl1, cfAA: ca1, cfF: cf1, inFront: if1, dC: dC1, dIE: dIE1, dXIE: dXIE1 } = P1;
            const { internal: in2, cfStart: cs2, cfLen: cl2, cfAA: ca2, cfF: cf2, inFront: if2, hC: hC2, hIE: hIE2, hXIE: hXIE2 } = P2;
            const cur = this.cur;
            let curPc = cur[0], curDi = cur[1], curDj = cur[2];
            const fbm = (target, line, col) => {
                const base0 = slot[0] + target * S2 + col;
                sc[base0] = -Infinity;
                const mv = MOVE_FLAT[target];
                for (let k = 0; k < mv.length; k += 3) {
                    const pc = mv[k], di = mv[k + 1], dj = mv[k + 2];
                    if (line < di || col < dj) continue;
                    const prev = sc[slot[di] + pc * S2 + col - dj];
                    if (prev === -Infinity) continue;
                    const i1 = (3 - di) * S1 + line, i2 = (3 - dj) * S2 + col;
                    let ps = prev + in1[i1] + in2[i2];
                    if (!(di === 3 && dj === 3) && !(ps > sc[base0])) continue;
                    // SiteInfo.computeSPscoreS1_S2_nonInternal (symmetric; the shorter list is iterated)
                    let s12 = 0;
                    if (cl1[i1] > cl2[i2]) { const o = i1 * NAA; for (let u = cs2[i2], e = u + cl2[i2]; u < e; u++) s12 = (s12 + Math.imul(cf2[u], if1[o + ca2[u]])) | 0; }
                    else { const o = i2 * NAA; for (let u = cs1[i1], e = u + cl1[i1]; u < e; u++) s12 = (s12 + Math.imul(cf1[u], if2[o + ca1[u]])) | 0; }
                    ps += s12;
                    if (!(ps > sc[base0])) continue;
                    // ProfileAligner.computeGapOpenCost
                    const isIE = target === pc;
                    let f1, h2;
                    if (pc === DEL) { f1 = isIE ? dIE1 : dXIE1; h2 = hC2; }
                    else if (pc === INS) { f1 = dC1; h2 = isIE ? hIE2 : hXIE2; }
                    else { f1 = dC1; h2 = hC2; }
                    const a = i1 * 10, b = i2 * 10;
                    const go = (f1[a + 3] * h2[b + 3] + f1[a + 4] * h2[b + 4] + f1[a + 5] * h2[b + 5] + f1[a + 6] * h2[b + 6]
                        + f1[a + 7] * h2[b + 7] + f1[a + 8] * h2[b + 8] + f1[a + 9] * h2[b + 9]) | 0;
                    ps += go;
                    if (!(ps > sc[base0])) continue;
                    sc[base0] = ps; curPc = pc; curDi = di; curDj = dj;
                }
                const code = curPc << 2;
                if (target === DEL) return (code | curDj) << 10;
                if (target === INS) return (code | curDi) << 6;
                return ((code | curDi) << 2) | curDj;
            };
            for (let line = 0; line < S1; line++) {
                const cmin = rowMin[line], cmax = rowMax[line];
                if (line > 0) {
                    const t = slot[3]; slot[3] = slot[2]; slot[2] = slot[1]; slot[1] = slot[0]; slot[0] = t;
                    sc.fill(-Infinity, t, t + W);
                }
                const off = rowOff[line] - cmin;
                for (let col = cmin; col < cmax; col++) {
                    if (line > 0 || col > 0) {
                        const m = fbm(MUT, line, col), d = fbm(DEL, line, col), i = fbm(INS, line, col);
                        tb[off + col] = m | d | i;
                    }
                }
                if (ctx.onRow) ctx.onRow(line, S1);
            }
            cur[0] = curPc; cur[1] = curDi; cur[2] = curDj;
            // computeBacktrackPosition
            let best = -Infinity, bm = -1;
            for (let m = 0; m < 3; m++) { const v = sc[slot[0] + m * S2 + S2 - 1]; if (v !== -Infinity && v >= best) { best = v; bm = m; } }
            if (bm < 0) throw MacseError('internal: no alignment path inside the band');
            const parts1 = [], parts2 = [];
            let line = S1 - 1, col = S2 - 1, m = bm;
            while (line !== 0 || col !== 0) {
                if (col < rowMin[line] || col >= rowMax[line]) throw MacseError('internal: traceback left the band');
                const mv = tb[rowOff[line] + col - rowMin[line]];
                let di, dj, pm;
                if (m === DEL) { const x = mv >> 10; di = 0; dj = x & 3; pm = (x & 0xC) >> 2; }
                else if (m === INS) { const x = mv >> 6; di = x & 3; dj = 0; pm = (x & 0xC) >> 2; }
                else { dj = mv & 3; di = (mv & 0xC) >> 2; pm = (mv & 0x30) >> 4; }
                if (di === 0 && dj === 0) throw MacseError('Infinite loop : ' + line + ' ' + col + '.');
                parts1.push(TEMPLATE_FWD[di]); parts2.push(TEMPLATE_FWD[dj]);
                line -= di; col -= dj; m = pm;
            }
            const t1 = parts1.reverse().join(''), t2 = parts2.reverse().join('');
            if (t1.length > S1 + S2) throw MacseError('Crash.');
            return { t1, t2 };
        }
    }

    // ------------------------------------------------------------------ SP score (sequences.sp_scores.SPscoreLinear)
    function spScoreLinear(setAA, ctx) {
        const seqs = setAA.arr, n = setAA.sites(), M = ctx.matrix, c = ctx.costs;
        const freq = new Int32Array(NAA * Math.max(n, 0));
        for (const s of seqs) { const u = s.updated(); for (let site = 0; site < n; site++) freq[aByte(u[site]) * n + site]++; }
        let subst = 0;
        for (let site = 0; site < n; site++) {
            const used = [];
            for (let a = 0; a < NAA; a++) if (freq[a * n + site] > 0) used.push(a);
            let siteScore = 0;
            for (let x = 0; x < used.length; x++) {
                const ax = used[x], fx = freq[ax * n + site];
                siteScore = (siteScore + Math.imul(idiv(Math.imul(fx, fx - 1), 2), M[ax * NAA + ax])) | 0;
                for (let y = x + 1; y < used.length; y++) siteScore = (siteScore + Math.imul(Math.imul(fx, freq[used[y] * n + site]), M[ax * NAA + used[y]])) | 0;
            }
            subst = (subst + siteScore) | 0;
        }
        const gapsFreq = new Int32Array(Math.max(n, 0)), closings = new Array(Math.max(n, 0));
        for (const s of seqs) for (const iv of s.gapsIntervals()) {
            for (let p = iv[0]; p <= iv[1]; p++) gapsFreq[p]++;
            (closings[iv[1]] || (closings[iv[1]] = [])).push(iv);
        }
        let gapOpen = 0;
        for (let site = 0; site < n; site++) {
            const cl = closings[site];
            if (!cl) continue;
            let g = 0;
            for (const iv of cl) {
                const nb = seqs.length - gapsFreq[iv[0]];
                const ext = site === n - 1 || iv[0] === 0;
                g = (g + Math.imul(nb, ext ? c.gapOpTerm : c.gapOpInt)) | 0;
            }
            gapOpen = (gapOpen + g) | 0;
            for (const iv of cl) for (let p = iv[0]; p <= iv[1]; p++) gapsFreq[p]--;
        }
        const score = f32((subst + gapOpen) | 0);
        return f32(score / f32(10));
    }

    // ------------------------------------------------------------------ suffix tree and MEMs (programs.align.SuffixTree)
    const INVALID_CHARS = '*!-X\u0001\u0002';
    class NodeST {
        constructor(begin, end, depth, parent, alen) {
            this.begin = begin; this.end = end; this.depth = depth; this.parent = parent;
            this.children = new Array(alen).fill(null); this.cc = -1; this.mask = 0; this.post = 0; this.link = null;
        }
        hasChildren() { for (const c of this.children) if (c) return true; return false; }
        nextChild() { ++this.cc; while (this.cc < this.children.length) { if (this.children[this.cc]) return this.children[this.cc]; ++this.cc; } return null; }
    }
    class Mem {
        constructor(p1, p2, len, rf1, rf2) {
            this.posS1 = p1; this.posS2 = p2; this.length = len; this.rf1 = rf1 || 1; this.rf2 = rf2 || 1;
            this.children = []; this.overlaps = []; this.nbPrevious = 0; this.maxScore = len; this.maxScoreSave = 0;
        }
        clearDag() { this.children = []; this.overlaps = []; this.maxScoreSave = this.maxScore; this.maxScore = this.length; }
        tot() { return this.maxScore + this.maxScoreSave; }
    }
    const before = (n1, n2, len) => n1.posS1 + len < n2.posS1 && n1.posS2 + len < n2.posS2;
    function addChildOverlap(n1, n2, direct) {
        let o1, o2;
        if (direct) { o1 = Math.max(n1.posS1 + n1.length - n2.posS1, 0); o2 = Math.max(n1.posS2 + n1.length - n2.posS2, 0); }
        else { o1 = Math.max(n2.posS1 + n2.length - n1.posS1, 0); o2 = Math.max(n2.posS2 + n2.length - n1.posS2, 0); }
        n1.overlaps.push(Math.max(o1, o2));
        n1.children.push(n2); n2.nbPrevious++;
    }
    function linkIfCompatibleOverlap(a, b, direct) {
        if (before(a, b, 0)) { if (direct) addChildOverlap(a, b, true); else addChildOverlap(b, a, false); }
        else if (before(b, a, 0)) { if (direct) addChildOverlap(b, a, true); else addChildOverlap(a, b, false); }
    }
    function linkIfCompatible(a, b, direct) {
        const add = (x, y) => { x.children.push(y); y.nbPrevious++; };
        if (before(a, b, a.length)) { if (direct) add(a, b); else add(b, a); }
        else if (before(b, a, b.length)) { if (direct) add(b, a); else add(a, b); }
    }

    class SuffixTree {
        constructor(s1, s2, minMem, alphaName) {
            const alpha = alphabetChars(alphaName);
            this.alphabet = alpha.letters.replace(/X/g, '') + INVALID_CHARS;
            this.s1 = s1; this.s2 = s2; this.minMem = minMem;
            const a = s1[0] + '\u0001' + s1[1] + '\u0001' + s1[2], b = s2[0] + '\u0002' + s2[1] + '\u0002' + s2[2];
            this.lim0 = a.length; this.lim1 = a.length + b.length + 1;
            this.letters = a + '\u0001' + b + '\u0002';
            this.alen = this.alphabet.length;
            this.root = new NodeST(0, 0, 0, null, this.alen);
            this.post = [];
            this.build();
            this.postOrder();
            this.setMasks();
        }
        build() {
            const L = this.letters, alen = this.alen, root = this.root;
            const ab = new Int32Array(L.length);
            for (let i = 0; i < L.length; i++) { const k = this.alphabet.indexOf(L[i]); ab[i] = (k << 24) >> 24; }   // (byte) cast
            if (ab.some(v => v < 0)) throw MacseError('internal: character outside the distance alphabet');
            let node = root, index = 0, tail = 0;
            while (index < ab.length) {
                let last = null;
                while (tail >= 0) {
                    let child = node.children[ab[index - tail]];
                    while (child !== null && tail >= child.end - child.begin) {
                        node = child;
                        tail -= child.end - child.begin;
                        child = child.children[ab[index - tail]];
                    }
                    if (child === null) {
                        node.children[ab[index]] = new NodeST(index, ab.length, node.depth + node.end - node.begin, node, alen);
                        if (last !== null) last.link = node;
                        last = null;
                    } else {
                        const c = ab[child.begin + tail];
                        if (c === ab[index]) { if (last === null) break; last.link = node; break; }
                        const split = new NodeST(child.begin, child.begin + tail, node.depth + node.end - node.begin, node, alen);
                        const nn = new NodeST(index, ab.length, child.depth + tail, split, alen);
                        split.children[ab[index]] = nn;
                        split.children[c] = child;
                        child.parent = split; child.begin += tail; child.depth += tail;
                        node.children[ab[index - tail]] = split;
                        if (last !== null) last.link = split;
                        last = split;
                    }
                    if (node === root) { --tail; continue; }
                    node = node.link;
                }
                ++index; ++tail;
            }
        }
        postOrder() {
            let pos = 0, node = this.root;
            while (node !== null) {
                const nc = node.nextChild();
                if (nc !== null) { node = nc; continue; }
                this.post.push(node); node.post = pos++; node.cc = -1; node = node.parent;
            }
        }
        setMasks() {
            const i1 = this.lim0, i2 = this.lim1;
            for (const node of this.post) {
                let mc = 0;
                for (const c of node.children) if (c) mc |= c.mask;
                const rb = node.begin - node.depth;
                if (rb <= i1 && i1 < node.end) node.mask = 1;
                else if (i1 < rb && rb <= i2 && i2 < node.end) node.mask = 2;
                node.mask |= mc;
            }
        }
        validPrefixNodes() {
            const n = this.post.length, v = new Uint8Array(n), L = this.letters;
            v[n - 1] = 1;
            for (let id = n - 2; id >= 0; id--) {
                const node = this.post[id];
                v[id] = v[node.parent.post];
                if (v[id]) for (let i = node.begin; i < node.end; i++) if (INVALID_CHARS.indexOf(L[i]) >= 0) { v[id] = 0; break; }
            }
            return v;
        }
        mems() {
            const valid = this.validPrefixNodes(), L = this.letters, minMem = this.minMem;
            const lists = new Array(this.post.length);
            const mems = [];
            const newList = pos => { const nd = { pos, next: null }; return { head: nd, tail: nd }; };
            const append = (dst, src) => {
                if (src.head !== null) { if (dst.head === null) dst.head = src.head; else dst.tail.next = src.head; dst.tail = src.tail; }
            };
            const localMem = (node, child, lgMax, normal) => {
                const id1 = normal ? 1 : 2, id2 = normal ? 2 : 1;
                for (let li = lists[node.post][id1].head; li !== null; li = li.next) {
                    for (let lj = lists[child.post][id2].head; lj !== null; lj = lj.next) {
                        const left = li.pos > 0 && lj.pos > 0 && L[li.pos - 1] === L[lj.pos - 1] && INVALID_CHARS.indexOf(L[li.pos - 1]) < 0;
                        if (lgMax >= minMem && !left) mems.push(normal ? new Mem(li.pos, lj.pos, lgMax) : new Mem(lj.pos, li.pos, lgMax));
                    }
                }
            };
            for (const node of this.post) {
                lists[node.post] = [null, { head: null, tail: null }, { head: null, tail: null }];
                const start = node.begin - node.depth;
                if (!node.hasChildren()) {
                    const tgt = lists[node.post][node.mask];
                    if (!tgt) throw MacseError('internal: suffix tree leaf without mask');
                    append(tgt, newList(start));
                    continue;
                }
                const lg1 = node.depth + node.end - node.begin;
                const parent = node.parent;
                const validParent = parent === null || valid[parent.post] === 1;
                const validNode = valid[node.post] === 1;
                let lg2 = lg1;
                if (validParent && !validNode) {
                    lg2 = parent.depth + parent.end - parent.begin;
                    if (lg1 >= minMem) for (let i = node.begin; i < node.end; i++) { if (INVALID_CHARS.indexOf(L[i]) >= 0) break; ++lg2; }
                }
                for (let ci = 0; ci < this.alen; ci++) {
                    const child = node.children[ci];
                    if (child === null) continue;
                    if (validNode && validParent && lg1 >= minMem) { localMem(node, child, lg1, true); localMem(node, child, lg1, false); }
                    append(lists[node.post][1], lists[child.post][1]);
                    append(lists[node.post][2], lists[child.post][2]);
                }
                if (!validParent || validNode || lg2 < minMem) continue;
                localMem(node, node, lg2, true);
            }
            return mems;
        }
        maxCompatibleMems(mems, overlap, direct) {
            for (const m of mems) m.clearDag();
            for (let i = 0; i < mems.length; i++) for (let j = i + 1; j < mems.length; j++) {
                if (overlap) linkIfCompatibleOverlap(mems[i], mems[j], direct); else linkIfCompatible(mems[i], mems[j], direct);
            }
            const stack = [];
            for (const m of mems) if (m.nbPrevious === 0) stack.push(m);
            while (stack.length) {
                const cur = stack.pop();
                for (let c = 0; c < cur.children.length; c++) {
                    const ch = cur.children[c];
                    let ns = cur.maxScore + ch.length - 10;
                    if (cur.rf1 !== ch.rf1) ns -= 30;
                    if (cur.rf2 !== ch.rf2) ns -= 30;
                    if (overlap) ns -= cur.overlaps[c];
                    ns = Math.max(ns, ch.length);
                    ch.maxScore = Math.max(ns, ch.maxScore);
                    ch.nbPrevious--;
                    if (ch.nbPrevious === 0) stack.push(ch);
                }
            }
            let init = false, max = 0;
            for (const m of mems) { if (init && m.maxScore <= max) continue; max = m.maxScore; init = true; }
            return max;
        }
        filteredMems(mems, overlap, minFraction, maxDist) {
            const dir = f32(this.maxCompatibleMems(mems, overlap, true));
            this.maxCompatibleMems(mems, overlap, false);
            const maxScore = dir;
            const out = [];
            const minLg = 3 * Math.min(this.s1[0].length, this.s2[0].length);
            const distance = f32(1 - f32(dir / f32(minLg)));
            if (maxDist > 0 && distance > maxDist) return out;
            for (const m of mems) {
                const through = f32(m.tot() - m.length);
                const frac = f32(through / maxScore);
                if (frac >= minFraction) out.push(m);
            }
            return out;
        }
        ntMems3RF(maxDist) {
            const s1 = this.s1, s2 = this.s2;
            const st1 = [0, s1[0].length + 1, s1[0].length + s1[1].length + 2];
            const f2 = s1[0].length + s1[1].length + s1[2].length + 3;
            const st2 = [f2, f2 + s2[0].length + 1, f2 + s2[0].length + s2[1].length + 2];
            const conv = (p, st) => p < st[1] ? [(p - st[0]) * 3, 1] : (p < st[2] ? [(p - st[1]) * 3 - 2, 2] : [(p - st[2]) * 3 - 1, 3]);
            const nt = this.mems().map(m => { const a = conv(m.posS1, st1), b = conv(m.posS2, st2); return new Mem(a[0], b[0], m.length * 3, a[1], b[1]); });
            return this.filteredMems(nt, true, 0.8, maxDist === undefined ? -1 : maxDist);
        }
        memDist3RF() {
            const mems = this.ntMems3RF();
            const maxComp = this.maxCompatibleMems(mems, true, true);
            const minLg = 3 * Math.min(this.s1[0].length, this.s2[0].length);
            return f32(1 - f32(f32(maxComp) / f32(minLg)));
        }
    }

    // ------------------------------------------------------------------ guide tree (programs.align.AlignmentDynamicTree)
    function seqCons3RF(seqNT, ctx) {
        const aa = seqNT.toAminos(ctx), alpha = alphabetChars(ctx.alphabet), r = [];
        for (let rf = 0; rf < 3; rf++) r.push(translateAlphabet(aa.frameAminos(rf + 1).acids, alpha));
        return r;
    }
    function consensusSequence(setAA, ctx, threshold) {   // SeqSetAA.computeConsensusSequence
        const alpha = alphabetChars(ctx.alphabet), res = [];
        for (let rf = 0; rf <= 2; rf++) {
            const framed = frameSet(setAA, rf + 1);
            const comp = framed.arr.map(s => translateAlphabet(s.acids, alpha));
            const nbSites = framed.sites();
            let out = '';
            for (let site = 0; site < nbSites; site++) {
                const fq = new Int32Array(NAA);
                for (let k = 0; k < framed.arr.length; k++) { if (framed.arr[k].isGap(site)) continue; fq[aByte(comp[k].charCodeAt(site))]++; }
                let maxPos = 0;
                for (let k = 0; k < framed.arr.length; k++) {
                    const c = comp[k].charCodeAt(site);
                    if (SeqAA.isGapCode(c)) continue;
                    const b = aByte(c);
                    if (fq[b] < fq[maxPos]) continue;
                    maxPos = b;
                }
                let nbGaps = 0; for (const s of framed.arr) if (s.isGap(site)) nbGaps++;
                const mf = f32(f32(fq[maxPos]) / f32(framed.arr.length - nbGaps));
                out += mf >= f32(threshold) ? B2A[maxPos] : 'X';
            }
            res.push(out);
        }
        return res;
    }
    function treeBounds(infoI, infoJ, delta, ctx) {        // AlignmentDynamicTreeBounds.computeBounds
        const st = new SuffixTree(infoI.cons, infoJ.cons, 12, ctx.alphabet);
        const mems = st.ntMems3RF();
        const sitesCount = infoI.restricted.sites();
        const res = Array.from({ length: sitesCount }, () => [-1, -1]);
        for (const m of mems) for (let sh = 0; sh < m.length; sh++) {
            const p1 = m.posS1 + sh, p2 = m.posS2 + sh;
            const r = res[p1];
            if (!r) throw MacseError('internal: MEM outside the profile');
            if (r[0] === -1 || r[0] > p2) r[0] = p2;
            if (r[1] === -1 || r[1] < p2) r[1] = p2;
        }
        res[0][0] = -1; res[sitesCount - 1][1] = -1;
        const sc = infoJ.restricted.sites() + 1;
        const ok = Array.from({ length: res.length + 1 }, () => [0, 0]);
        ok[0][0] = -1; ok[0][1] = -1;
        let mp = -1;
        for (let s = 0; s < res.length; s++) { if (res[s][1] !== -1) mp = Math.max(mp, res[s][1]); ok[s + 1][1] = mp; }
        let mf = sc;
        for (let i = res.length - 1; i >= 0; i--) if (res[i][0] !== -1) ok[i + 1][0] = mf = Math.min(mf, res[i][0]);
        let lm = -1;
        for (let s = 0; s < res.length; s++) { if (res[s][0] !== -1) lm = ok[s + 1][0]; ok[s + 1][0] = lm; }
        let nm = -1;
        for (let s = res.length - 1; s >= 0; s--) { if (res[s][1] !== -1) nm = ok[s + 1][1]; ok[s + 1][1] = nm; }
        for (let s = 1; s >= 0; s--) ok[s][1] = ok[s + 1][1];
        for (let s = 0; s < ok.length - 1; s++) { const b = ok[s + 1][0]; if (ok[s][1] !== -1 && ok[s][1] < b) ok[s][1] = b; }
        for (const r of ok) { r[0] = Math.max(0, r[0] - delta); if (r[1] === -1) r[1] = sc; r[1] = Math.min(sc, r[1] + delta); }
        return ok;
    }
    function nodeLabel(a, b) { return a < b ? '(' + a + ',' + b + ')' : '(' + b + ',' + a + ')'; }

    function dynamicTree(set, distances, ctx, progress) {
        const aligner = new ProfileAligner(ctx);
        let nbUsed = set.size;
        const orders = new Int32Array(nbUsed), nodes = [], post = [];
        set.arr.forEach((sq, i) => {
            const one = new SeqSet(); one.add(sq);
            const info = { label: sq.name, cluster: one, restricted: one, cons: seqCons3RF(sq, ctx) };
            orders[i] = i; nodes[i] = { info, label: sq.name, children: [] }; post.push(nodes[i]);
        });
        let step = 0;
        while (nbUsed > 1) {
            let minI = 0, minJ = 1, minValue = distances[orders[0]][orders[1]];
            for (let i = 0; i < nbUsed; i++) for (let j = i + 1; j < nbUsed; j++) {
                const d = distances[orders[i]][orders[j]];
                if (d < minValue) { minI = i; minJ = j; minValue = d; }
            }
            if (minI > minJ) { const t = minI; minI = minJ; minJ = t; }
            const minVal = f32(f32(minValue) / f32(500));
            const infoI = nodes[minI].info, infoJ = nodes[minJ].info;
            let bounds = null;
            if (minVal < 0.3) {
                const bound = javaIntF(Math.min(f32(50), f32(f32(1 - minVal) * f32(50))));
                bounds = treeBounds(infoI, infoJ, bound, ctx);
            }
            const label = nodeLabel(infoI.label, infoJ.label);
            const aligned = aligner.alignProfiles(infoI.restricted, infoJ.restricted, bounds);
            const restricted = restrictNT(aligned, true);
            const info = { label, cluster: aligned, restricted, cons: null };
            const node = { info, label, children: [nodes[minI], nodes[minJ]] };
            info.cons = consensusSequence(toAminosSet(restricted, ctx), ctx, 0.6);
            nodes[minI] = node;
            const sI = infoI.cluster.size, sJ = infoJ.cluster.size;
            for (let k = 0; k < nbUsed; k++) {
                if (k === minI || k === minJ) continue;
                const dk = orders[k], di = orders[minI], dj = orders[minJ];
                const nd = idiv(distances[dk][di] * sI + distances[dk][dj] * sJ, sI + sJ);
                distances[dk][di] = nd; distances[di][dk] = nd;
            }
            orders[minJ] = orders[nbUsed - 1];
            nodes[minJ] = nodes[nbUsed - 1];
            --nbUsed;
            post.push(node);
            if (progress) progress('tree', ++step, set.size - 1);
        }
        return post[post.length - 1].info.cluster;
    }

    // ------------------------------------------------------------------ refinement (programs.refine.Refiner.refine_2_cut)
    function memOverlDist(a1, a2, ctx) {
        let b1 = '', b2 = '', l1 = 0, l2 = 0;
        for (let s = 0; s < a2.acids.length; s++) {
            const g1 = a1.isGap(s), g2 = a2.isGap(s);
            if (!g1) l1++;
            if (!g2) l2++;
            if (!g1 || !g2) { b1 += a1.acids[s]; b2 += a2.acids[s]; }
        }
        const alpha = alphabetChars(ctx.alphabet);
        const t1 = translateAlphabet(b1, alpha), t2 = translateAlphabet(b2, alpha);
        let mem = 0, over = 0;
        for (let s = 0; s < b2.length; s++) {
            if (t1.charCodeAt(s) !== C_X && t1.charCodeAt(s) === t2.charCodeAt(s)) ++mem;
            else { if (mem >= 6) over = over === 0 ? mem : over + mem - 2; mem = 0; }
        }
        const pc = f32(f32(over) / f32(Math.min(l1, l2)));
        return javaIntF(f32(f32(500) * f32(1 - pc)));
    }
    function refineTreePostOrder(set, dist) {             // RefineTree
        let nbUsed = set.size;
        const orders = new Int32Array(nbUsed), nodes = [], post = [];
        set.arr.forEach((s, i) => { orders[i] = i; nodes[i] = { label: s.name }; post.push(nodes[i]); });
        while (nbUsed > 1) {
            let minI = 0, minJ = 1, minValue = dist[orders[0]][orders[1]];
            for (let i = 0; i < nbUsed; i++) for (let j = i + 1; j < nbUsed; j++) {
                const d = dist[orders[i]][orders[j]];
                if (d < minValue) { minI = i; minJ = j; minValue = d; }
            }
            if (minI > minJ) { const t = minI; minI = minJ; minJ = t; }
            const node = { label: nodeLabel(nodes[minI].label, nodes[minJ].label) };
            nodes[minI] = node;
            for (let k = 0; k < nbUsed; k++) {
                if (k === minI || k === minJ) continue;
                const dk = orders[k], di = orders[minI], dj = orders[minJ];
                const d = idiv(dist[dk][di] + dist[dk][dj], 2);
                dist[dk][di] = d; dist[di][dk] = d;
            }
            orders[minJ] = orders[nbUsed - 1];
            nodes[minJ] = nodes[nbUsed - 1];
            --nbUsed;
            post.push(node);
        }
        return post;
    }
    function javaSplitComma(s) { const p = s.split(','); while (p.length > 1 && p[p.length - 1] === '') p.pop(); if (p.length === 1 && p[0] === '' && s.length === 0) return ['']; return p; }

    function refine2cut(setIn, ctx, progress) {
        if (setIn.size < 2) return setIn;
        const aligner = new ProfileAligner(ctx);
        const testedCut = [];
        let improve = true, nbIter = 0, nbTest = 0, conservedScore = null;
        let set = setIn;
        let currentScore = spScoreLinear(frameSet(toAminosSet(set, ctx), 1), ctx);
        let localReal = f32(ctx.localRealignInit);
        while ((ctx.maxRefines < 0 || nbIter < ctx.maxRefines) && improve) {
            let conserved;
            if (nbIter > 0) { conserved = new Uint8Array(conservedScore.length); for (let i = 0; i < conserved.length; i++) conserved[i] = conservedScore[i] === nbTest ? 1 : 0; }
            else conserved = new Uint8Array(set.sites());
            conservedScore = new Int32Array(set.sites());
            nbTest = 0; improve = false;
            const framed = frameSet(toAminosSet(set, ctx), 1);
            const n = framed.size, dist = Array.from({ length: n }, () => new Array(n).fill(0));
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { dist[i][j] = memOverlDist(framed.arr[i], framed.arr[j], ctx); dist[j][i] = dist[i][j]; }
            const postOrder = refineTreePostOrder(set, dist).reverse();
            ++nbIter;
            let done = 0;
            for (const node of postOrder) {
                done++;
                const clade = javaSplitComma(node.label.replace(/\(/g, '').replace(/\)/g, ''));
                const inClade = new Set(clade);
                const s1 = new SeqSet(), s2 = new SeqSet();
                for (const sq of set.arr) (inClade.has(sq.name) ? s1 : s2).add(sq);
                if (s1.size === 0 || s2.size === 0) continue;
                const sig = x => x.arr.map(s => s.name + ',').join('');
                const g1 = sig(s1), g2 = sig(s2);
                const signature = s1.size < s2.size || (s1.size === s2.size && g1 < g2) ? g1 + '  |  ' + g2 : g2 + '  |  ' + g1;
                if (testedCut.includes(signature)) continue;
                testedCut.push(signature);
                ++nbTest;
                const c1 = new RestrictedCoordinates(keptColumnsNT(s1, true)), c2 = new RestrictedCoordinates(keptColumnsNT(s2, true));
                c1.setFacingSite(c2);
                let deltaDefault = Math.ceil(f32(f32(s2.sites()) * localReal));
                deltaDefault = Math.max(deltaDefault, 30);
                const conservedMax = idiv(deltaDefault, 2);
                const bounds = c1.boundsDeltaMax(c2, deltaDefault, conservedMax, conserved);
                const newAlign = aligner.alignProfiles(restrictNT(s1, true), restrictNT(s2, true), bounds);
                const newScore = spScoreLinear(frameSet(toAminosSet(newAlign, ctx), 1), ctx);
                const accepted = newScore > currentScore;
                if (accepted) { set = newAlign; currentScore = newScore; testedCut.length = 0; improve = true; }
                if (progress) progress('refine', done, postOrder.length, nbIter);
                const former = conservedScore;
                if (accepted) {
                    const pairs = c1.conservedSites(aligner.p1Coord);
                    conservedScore = new Int32Array(newAlign.sites());
                    for (const [o, nw] of pairs) conservedScore[nw] = 1 + former[o];
                    const formerC = conserved;
                    conserved = new Uint8Array(newAlign.sites());
                    for (const [o, nw] of pairs) conserved[nw] = formerC[o];
                    continue;
                }
                for (let s = 0; s < conservedScore.length; s++) conservedScore[s]++;
            }
            localReal = f32(localReal * f32(ctx.localRealignDec));
        }
        ctx.refineIterations = nbIter;
        return set;
    }

    // Refiner.cutLeaves (optim = 1)
    function cutLeaves(setIn, ctx) {
        if (setIn.size < 2) return setIn;
        let canImprove = true, nbIter = 0, set = setIn;
        const aligner = new ProfileAligner(ctx);
        let currentScore = spScoreLinear(frameSet(toAminosSet(set, ctx), 1), ctx);
        let localReal = f32(ctx.localRealignInit);
        while ((ctx.maxRefines < 0 || nbIter < ctx.maxRefines) && canImprove) {
            canImprove = false;
            for (const sq of set.arr.slice()) {
                let s1 = new SeqSet(); s1.add(sq);
                const k1 = keptColumnsNT(s1, true); s1 = restrictNT(s1, true);
                let s2 = new SeqSet(); for (const o of set.arr) if (o.name !== sq.name) s2.add(o);
                const k2 = keptColumnsNT(s2, true); s2 = restrictNT(s2, true);
                const c1 = new RestrictedCoordinates(k1), c2 = new RestrictedCoordinates(k2);
                c1.setFacingSite(c2);
                let dd = Math.ceil(f32(f32(s2.sites()) * localReal)); dd = Math.max(dd, 30);
                const nb = c1.boundsDeltaMax(c2, dd, dd, null);
                const na = aligner.alignProfiles(s1, s2, nb);
                const ns = spScoreLinear(frameSet(toAminosSet(na, ctx), 1), ctx);
                if (ns > currentScore) { set = na; currentScore = ns; canImprove = true; }
            }
            ++nbIter;
            localReal = f32(localReal * f32(ctx.localRealignDec));
        }
        return set;
    }

    // ------------------------------------------------------------------ top level (programs.align.Aligner)
    const DEFAULTS = {
        gc: 1, ambi_OFF: false, fs: 30, fs_lr: 10, fs_term: 10, fs_lr_term: 7, gap_ext: 1, gap_ext_term: 0.9, gap_op: 7, gap_op_term: 6.3,
        stop: 50, stop_lr: 17, max_refine_iter: -1, local_realign_init: 0.5, local_realign_dec: 0.5, optim: 2, alphabet_AA: 'SE_B_8',
        lessReliable: [], maxTracebackCells: 4e8, onProgress: null
    };
    function makeCtx(opts) {
        const o = Object.assign({}, DEFAULTS, opts || {});
        const costs = makeCosts(o);
        return {
            opts: o, costs, matrix: makeMatrix(costs), ribo: ribosome(o.gc, o.ambi_OFF), alphabet: o.alphabet_AA,
            maxRefines: o.max_refine_iter, localRealignInit: o.local_realign_init, localRealignDec: o.local_realign_dec,
            maxTracebackCells: o.maxTracebackCells, refineIterations: 0
        };
    }

    function alignSequences(records, opts) {
        const t0 = Date.now();
        const ctx = makeCtx(opts);
        const progress = ctx.opts.onProgress;
        const lr = new Set(ctx.opts.lessReliable || []);
        const set = new SeqSet();
        for (const r of records) {
            if (!r.seq || !r.seq.length) continue;
            set.add(new SeqNT(r.name, r.seq.replace(/\s+/g, ''), !lr.has(r.name)));
        }
        if (set.size === 0) throw MacseError('no sequences');
        let out;
        if (set.size === 1) out = set;
        else if (set.size === 2) {
            for (const s of set.arr) s.removeGaps();
            const a = new SeqSet(), b = new SeqSet(); a.add(set.arr[0]); b.add(set.arr[1]);
            out = new ProfileAligner(ctx).alignProfiles(a, b, null);
        } else {
            for (const s of set.arr) s.removeGaps();
            const n = set.size, dist = Array.from({ length: n }, () => new Array(n).fill(0));
            const tr = set.arr.map(s => seqCons3RF(s, ctx));
            let pairsDone = 0;
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                const d = javaRoundF(f32(new SuffixTree(tr[i], tr[j], 6, ctx.alphabet).memDist3RF() * f32(500)));
                dist[i][j] = d; dist[j][i] = d;
                if (progress) progress('distances', ++pairsDone, n * (n - 1) / 2);
            }
            out = dynamicTree(set, dist, ctx, progress);
            if (ctx.opts.optim === 2) out = refine2cut(out, ctx, progress);
            else if (ctx.opts.optim === 1) out = cutLeaves(out, ctx);
        }
        const nt = out.arr.filter(s => s.acids.length).map(s => ({ name: s.name, seq: s.acids }));
        const aa = out.arr.filter(s => s.acids.length).map(s => ({ name: s.name, seq: s.toAminos(ctx).frameAminos(1).acids }));
        return { nt, aa, stats: { sequences: set.size, columns: nt.length ? nt[0].seq.length : 0, refineIterations: ctx.refineIterations, ms: Date.now() - t0 } };
    }

    function parseFasta(text) {
        const out = []; let cur = null;
        for (const line0 of String(text).split(/\r?\n/)) {
            const line = line0.replace(/\r$/, '');
            if (!line.length || line[0] === '#') continue;
            if (line[0] === '>') { cur = { name: line.substring(1), seq: '' }; out.push(cur); }
            else if (cur) cur.seq += line;
        }
        return out.filter(r => r.seq.length);
    }
    function toFasta(records) { return records.map(r => '>' + r.name + '\n' + r.seq + '\n').join(''); }

    return { alignSequences, parseFasta, toFasta, DEFAULTS, _internal: { SuffixTree, spScoreLinear, makeCtx, SeqNT, SeqSet, ProfileAligner } };
}));
