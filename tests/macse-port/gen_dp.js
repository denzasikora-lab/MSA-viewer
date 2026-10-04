'use strict';
// Generates the unrolled dynamic-programming kernels of macse-align.js from one template, in two flavours:
//   - JavaScript: functions dpCore and dpTile, written between the "BEGIN GENERATED dpCore" / "END GENERATED dpCore"
//     markers of macse-align.js;
//   - AssemblyScript: tests/macse-port/dpcore.ts, compiled by build_wasm.js into macse-dp-wasm.js (WebAssembly).
// dpCore fills a whole profile pair with four rolling score rows (MACSE's matrices4). dpTile fills one rectangular
// tile from a buffer that carries the 3 rows above and the 3 columns to its left (no move reaches further back), so
// that tiles on an anti-diagonal can run in parallel threads. Both evaluate the same moves, in the same order, with
// the same comparisons as MACSE's ProfileAligner.findBestMovement; only the loops over move groups and predecessors
// are unrolled. Integer sums wrap like Java int; scores are doubles (Java long values are exact in a double far
// beyond any alignment size).
// node tests/macse-port/gen_dp.js
// Part of the MACSE port (CeCILL 2.1, LICENSE-MACSE); made by Toki-bio for ViewAlign, 2026-10-04.
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', '..', 'macse-align.js');

// Targets in MACSE's evaluation order (MUTATION, DELETION, INSERTION); (di, dj) groups in MatrixMovement order;
// within a group the predecessor matrices INSERTION(0), DELETION(1), MUTATION(2).
// Gap-open vectors per predecessor: line profile 0 = compacted, 1 = IE, 2 = XIE; column profile hC / hIE / hXIE.
const TARGETS = [
    { t: 2, name: 'MUTATION', pairs: [[3, 3], [3, 2], [2, 3], [3, 1], [1, 3], [2, 2], [2, 1], [1, 2], [1, 1]], vf: [0, 2, 0], vh: ['hXIE', 'hC', 'hC'] },
    { t: 1, name: 'DELETION', pairs: [[0, 3], [0, 2], [0, 1]], vf: [0, 1, 0], vh: ['hXIE', 'hC', 'hC'] },
    { t: 0, name: 'INSERTION', pairs: [[3, 0], [2, 0], [1, 0]], vf: [0, 2, 0], vh: ['hIE', 'hC', 'hC'] }
];
const I = n => ' '.repeat(n);

// mode 'core': rows 0..S1-1 with rolling score rows sc; mode 'tile': rows r0..r0+nR-1 and columns c0..c0+nC-1 of
// the tile buffer T (row stride RS = (nC + 3) * 3, the first 3 rows and 3 columns hold the neighbours' values).
function generate(F, mode) {
    const tile = mode === 'tile';
    const out = [];
    const body = (b, s) => out.push(I(b) + s);
    const ti = F.ti, tf = F.tf;
    out.push(...F.head(mode));
    if (!tile) body(8, `let R0${ti} = 0, R1${ti} = W, R2${ti} = 2 * W, R3${ti} = 3 * W;`);
    body(8, `let cPc${ti} = 0, cDi${ti} = 0, cDj${ti} = 0, code${ti} = 0, cc${ti} = 0;`);
    body(8, `let best${tf} = NEG, p0${tf} = NEG, p1${tf} = NEG, p2${tf} = NEG, ps${tf} = 0, inn${tf} = 0;`);
    body(8, `let s12${ti} = 0, sd${ti} = 0, go${ti} = 0, rb${ti} = 0, u${ti} = 0, e${ti} = 0, q${ti} = 0;`);
    if (tile) {
        body(8, `if (r0 === 0 && c0 === 0) ${F.setF64('T', '3 * RS + 9 + 2', '0')};   // MUTATION at (0, 0)`);
        body(8, `for (let lr${ti} = 0; lr < nR; lr++) {`);
        body(12, `const line${ti} = r0 + lr;`);
        body(12, `let cmin${ti} = ${F.i32('rowMin', 'lr')}, cmax${ti} = ${F.i32('rowMax', 'lr')};`);
        body(12, 'if (cmin < c0) cmin = c0;');
        body(12, 'if (cmax > c0 + nC) cmax = c0 + nC;');
        body(12, `const rowBase${ti} = (lr + 3) * RS, L4${ti} = lr * 4, tbRow${ti} = lr * nC - c0;`);
    } else {
        body(8, F.setF64('sc', '2', '0') + ';   // MUTATION at (0, 0)');
        body(8, `for (let line${ti} = 0; line < S1; line++) {`);
        body(12, `const cmin${ti} = ${F.i32('rowMin', 'line')}, cmax${ti} = ${F.i32('rowMax', 'line')};`);
        body(12, `if (line > 0) { const t${ti} = R3; R3 = R2; R2 = R1; R1 = R0; R0 = t; ${F.fillNeg('t', 'W')} }`);
        body(12, `const off${F.tu} = ${F.rowOff('line')} - ${F.toU('cmin')}, L4${ti} = line * 4;`);
    }
    // Site values of the line profile for this row (gap sizes m = 0..3), loaded once per row instead of in every move
    // group: the profile arrays are read-only here, so the values are the same.
    for (let m = 0; m < 4; m++) {
        body(12, `const a1_${m}${tf} = ${F.f64('in1', `L4 + ${m}`)}, l1_${m}${ti} = ${F.i32('cl1', `L4 + ${m}`)}, s1_${m}${ti} = ${F.i32('cs1', `L4 + ${m}`)}, o1_${m}${ti} = (L4 + ${m}) * 33;`);
    }
    const lists = new Set();
    for (const T of TARGETS) for (const [di] of T.pairs) for (let pc = 0; pc < 3; pc++) lists.add(`${3 - di}${T.vf[pc]}`);
    for (const mk of [...lists].sort()) {
        const m = mk[0], k = mk[1];
        body(12, `const ss${mk}${ti} = ${F.i32('spS', `(L4 + ${m}) * 3 + ${k}`)}, sl${mk}${ti} = ${F.i32('spL', `(L4 + ${m}) * 3 + ${k}`)};`);
    }
    // The cell (0, 0) only holds the start value: the loop starts at column 1 on line 0 instead of testing every cell.
    body(12, `for (let col${ti} = (line === 0 && cmin === 0) ? 1 : cmin; col < cmax; col++) {`);
    body(16, tile ? `const lc3${ti} = col - c0 + 3, C4${ti} = (col - c0) * 4;` : `const C4${ti} = col * 4;`);
    // site values of the column profile for this cell (gap sizes n = 0..3)
    for (let n = 0; n < 4; n++) {
        body(16, `const a2_${n}${tf} = ${F.f64('in2', `C4 + ${n}`)}, l2_${n}${ti} = ${F.i32('cl2', `C4 + ${n}`)}, s2_${n}${ti} = ${F.i32('cs2', `C4 + ${n}`)}, o2_${n}${ti} = (C4 + ${n}) * 33, hb${n}${ti} = (C4 + ${n}) * 10;`);
    }
    // sum over a short list (usually 1-3 entries) in the same order as a loop: straight-line code for 1 and 2 entries
    const listSum = (acc, term) => `if (e === 1) ${acc} = ${term('u')}; else if (e === 2) { ${acc} = ${term('u')}; ${acc} += ${term('u + 1')}; } else { ${acc} = 0; for (q = 0; q < e; q++) ${acc} += ${term('u + q')}; }`;
    const buf = tile ? 'T' : 'sc';
    body(16, 'code = 0;');
    for (const T of TARGETS) {
        const b = 16;
        body(b, `// ---- target ${T.name}`);
        body(b, 'best = NEG;');
        for (const [di, dj] of T.pairs) {
            const m = 3 - di, n = 3 - dj;
            const conds = [];
            if (di > 0) conds.push(`line >= ${di}`);
            if (dj > 0) conds.push(`col >= ${dj}`);
            const full = di === 3 && dj === 3;
            const rbExpr = tile ? `rowBase - ${di} * RS + (lc3 - ${dj}) * 3` : `R${di} + (col - ${dj}) * 3`;
            body(b, `if (${conds.join(' && ')}) {   // (${di}, ${dj})`);
            body(b + 4, `rb = ${rbExpr}; p0 = ${F.f64(buf, 'rb')}; p1 = ${F.f64(buf, 'rb + 1')}; p2 = ${F.f64(buf, 'rb + 2')};`);
            body(b + 4, 'if (p0 !== NEG || p1 !== NEG || p2 !== NEG) {');
            body(b + 8, `inn = a1_${m} + a2_${n}; sd = 0;`);
            for (let pc = 0; pc < 3; pc++) {
                const c = b + 8, k = T.vf[pc], h = T.vh[pc];
                body(c, `if (p${pc} !== NEG) {`);
                body(c + 4, `ps = p${pc} + inn;`);
                body(c + 4, `if (${full ? 'true' : 'ps > best'}) {`);
                body(c + 8, 'if (sd === 0) {');
                body(c + 12, `if (l1_${m} > l2_${n}) { u = s2_${n}; e = l2_${n}; ${listSum('s12', x => `${F.i32('cf2', x)} * ${F.i32('if1', `o1_${m} + ${F.i32('ca2', x)}`)}`)} }`);
                body(c + 12, `else { u = s1_${m}; e = l1_${m}; ${listSum('s12', x => `${F.i32('cf1', x)} * ${F.i32('if2', `o2_${n} + ${F.i32('ca1', x)}`)}`)} }`);
                body(c + 12, `${F.wrap('s12')} sd = 1;`);
                body(c + 8, '}');
                body(c + 8, `ps += ${F.toF('s12')};`);
                body(c + 8, 'if (ps > best) {');
                body(c + 12, `u = ss${m}${k}; e = sl${m}${k}; ${listSum('go', x => `${F.i32('spF', x)} * ${F.i32(h, `hb${n} + ${F.i32('spP', x)}`)}`)}`);
                body(c + 12, `ps += ${F.toF(F.wrapExpr('go'))};`);
                body(c + 12, `if (ps > best) { best = ps; cPc = ${pc}; cDi = ${di}; cDj = ${dj}; }`);
                body(c + 8, '}');
                body(c + 4, '}');
                body(c, '}');
            }
            body(b + 4, '}');
            body(b, '}');
        }
        body(b, F.setF64(buf, tile ? `rowBase + lc3 * 3 + ${T.t}` : `R0 + col * 3 + ${T.t}`, 'best') + ';');
        body(b, 'cc = cPc << 2;');
        if (T.t === 1) body(b, 'code |= (cc | cDj) << 10;');
        else if (T.t === 0) body(b, 'code |= (cc | cDi) << 6;');
        else body(b, 'code |= ((cc | cDi) << 2) | cDj;');
    }
    body(16, (tile ? F.setU16('tb', 'tbRow + col', 'code') : F.setU16('tb', `off + ${F.toU('col')}`, 'code')) + ';');
    body(12, '}');
    body(8, '}');
    body(8, tile ? 'return 0;' : 'return R0;');
    out.push('    }');
    return out.join('\n');
}

// ---- JavaScript flavour
const JS = {
    ti: '', tf: '', tu: '',
    head: mode => mode === 'tile' ? [
        '    // Fills one tile (rows r0..r0+nR-1, columns c0..c0+nC-1) of a profile pair; P1/P2 are the matching profile',
        '    // slices (sliceProfile), rowMin/rowMax the band limits of the tile rows, T the tile buffer (see gen_dp.js).',
        '    function dpTile(S1, S2, r0, nR, c0, nC, rowMin, rowMax, T, tb, P1, P2) {',
        '        const in1 = P1.internal, cs1 = P1.cfStart, cl1 = P1.cfLen, ca1 = P1.cfAA, cf1 = P1.cfF, if1 = P1.inFront;',
        '        const in2 = P2.internal, cs2 = P2.cfStart, cl2 = P2.cfLen, ca2 = P2.cfAA, cf2 = P2.cfF, if2 = P2.inFront;',
        '        const spS = P1.spStart, spL = P1.spLen, spP = P1.spP, spF = P1.spF, hC = P2.hC, hIE = P2.hIE, hXIE = P2.hXIE;',
        '        const RS = (nC + 3) * 3, NEG = -Infinity;'
    ] : [
        '    // Fills the score rows and the traceback for one profile pair; returns the row base of the last line.',
        '    function dpCore(S1, S2, rowMin, rowMax, rowOff, tb, sc, P1, P2) {',
        '        const in1 = P1.internal, cs1 = P1.cfStart, cl1 = P1.cfLen, ca1 = P1.cfAA, cf1 = P1.cfF, if1 = P1.inFront;',
        '        const in2 = P2.internal, cs2 = P2.cfStart, cl2 = P2.cfLen, ca2 = P2.cfAA, cf2 = P2.cfF, if2 = P2.inFront;',
        '        const spS = P1.spStart, spL = P1.spLen, spP = P1.spP, spF = P1.spF, hC = P2.hC, hIE = P2.hIE, hXIE = P2.hXIE;',
        '        const W = 3 * S2, NEG = -Infinity;'
    ],
    f64: (a, i) => `${a}[${i}]`, i32: (a, i) => `${a}[${i}]`,
    setF64: (a, i, v) => `${a}[${i}] = ${v}`, setU16: (a, i, v) => `${a}[${i}] = ${v}`,
    fillNeg: (t, W) => `sc.fill(NEG, ${t}, ${t} + ${W});`,
    rowOff: l => `rowOff[${l}]`, toU: x => x, toF: x => x,
    wrap: x => `${x} |= 0;`, wrapExpr: x => `(${x} | 0)`
};
// ---- AssemblyScript flavour (raw memory; all arrays are byte addresses into linear memory)
function asLoad(type, shift, a, i) {
    const m = /^(.+) \+ (\d+)$/.exec(i);
    if (m) {
        let depth = 0, ok = true;                      // the part before " + K" must be a complete expression
        for (const ch of m[1]) { if (ch === '(') depth++; else if (ch === ')' && --depth < 0) ok = false; }
        if (ok && depth === 0) return `load<${type}>(${a} + ((<usize>(${m[1]})) << ${shift}), ${(+m[2]) << shift})`;
    }
    return `load<${type}>(${a} + ((<usize>(${i})) << ${shift}))`;
}
const PROFILE_ARGS = 'in1: usize, cs1: usize, cl1: usize, ca1: usize, cf1: usize, if1: usize, spS: usize, spL: usize, spP: usize, spF: usize,\n' +
    '        in2: usize, cs2: usize, cl2: usize, ca2: usize, cf2: usize, if2: usize, hC: usize, hIE: usize, hXIE: usize';
const AS = {
    ti: ': i32', tf: ': f64', tu: ': u32',
    head: mode => mode === 'tile' ? [
        'export function dpTile(S1: i32, S2: i32, r0: i32, nR: i32, c0: i32, nC: i32, rowMin: usize, rowMax: usize, T: usize, tb: usize,',
        '        ' + PROFILE_ARGS + '): i32 {',
        '        const RS: i32 = (nC + 3) * 3;',
        '        const NEG: f64 = -Infinity;'
    ] : [
        '// GENERATED by tests/macse-port/gen_dp.js from the same template as dpCore/dpTile in macse-align.js; do not edit.',
        '// Part of the MACSE port (CeCILL 2.1, LICENSE-MACSE). Build: node tests/macse-port/build_wasm.js',
        'export function dpCore(S1: i32, S2: i32, rowMin: usize, rowMax: usize, rowOff: usize, tb: usize, sc: usize,',
        '        ' + PROFILE_ARGS + '): i32 {',
        '        const W: i32 = 3 * S2;',
        '        const NEG: f64 = -Infinity;'
    ],
    // an index "x + K" (K a literal) becomes a load with an immediate byte offset: same address, less arithmetic
    f64: (a, i) => asLoad('f64', 3, a, i),
    i32: (a, i) => asLoad('i32', 2, a, i),
    setF64: (a, i, v) => `store<f64>(${a} + ((<usize>(${i})) << 3), ${v})`,
    setU16: (a, i, v) => `store<u16>(${a} + ((<usize>(${i})) << 1), <u16>${v})`,
    fillNeg: (t, W) => `for (let k: i32 = 0; k < ${W}; k++) store<f64>(sc + ((<usize>(${t} + k)) << 3), NEG);`,
    rowOff: l => `load<u32>(rowOff + ((<usize>(${l})) << 2))`, toU: x => `<u32>${x}`, toF: x => `<f64>(${x})`,
    wrap: () => '', wrapExpr: x => x
};

let src = fs.readFileSync(file, 'utf8');
const gen = '    // BEGIN GENERATED dpCore (tests/macse-port/gen_dp.js); do not edit by hand\n' +
    generate(JS, 'core') + '\n\n' + generate(JS, 'tile') + '\n    // END GENERATED dpCore';
const a = src.indexOf('    // BEGIN GENERATED dpCore'), z = src.indexOf('    // END GENERATED dpCore');
if (a < 0 || z < 0) throw new Error('markers not found in macse-align.js');
src = src.slice(0, a) + gen + src.slice(z + '    // END GENERATED dpCore'.length);
fs.writeFileSync(file, src);
const asSrc = (generate(AS, 'core') + '\n\n' + generate(AS, 'tile')).replace(/^ {4}/gm, '') + '\n';
fs.writeFileSync(path.join(__dirname, 'dpcore.ts'), asSrc);
console.log(`dpCore and dpTile written to macse-align.js and tests/macse-port/dpcore.ts (${gen.split('\n').length} lines)`);
