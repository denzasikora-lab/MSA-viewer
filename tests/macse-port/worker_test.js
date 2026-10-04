'use strict';
// Runs macse-worker.js and codon-align-worker.js in Node vm contexts (importScripts / postMessage shims) and checks
// the MACSE wrapper: rows in input order with the user's letters (case, U, IUPAC), '!' written as '-', columns equal
// MACSE's, progress messages, refusals, the pool-member ('dp') role, and that the fast engine still works.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const fx = path.join(root, 'tests', 'codon-align', 'fixtures');

function makeWorker(file) {
    const msgs = [];
    const ctx = {
        console, Date, Math, Map, Set, Array, String, Number, Object, Error, RegExp, JSON, Promise, Symbol, Boolean, BigInt,
        Int32Array, Uint32Array, Uint8Array, Uint16Array, Float64Array, Int8Array, ArrayBuffer, WebAssembly, atob, setTimeout, queueMicrotask
    };
    ctx.self = ctx;
    ctx.location = { search: '', href: file };
    ctx.navigator = { hardwareConcurrency: 4 };
    ctx.postMessage = (m) => msgs.push(m);
    ctx.importScripts = (...files) => { for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f.replace(/\?.*$/, '')), 'utf8'), ctx, { filename: f }); };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
    return {
        ctx,
        async send(data) {
            msgs.length = 0;
            await ctx.onmessage({ data });
            for (let k = 0; k < 2000 && !msgs.some(m => 'ok' in m); k++) await new Promise(r => setTimeout(r, 5));
            return msgs.slice();
        }
    };
}
const parse = t => t.split('>').filter(Boolean).map(b => { const [h, ...r] = b.split('\n'); return { name: h.trim(), seq: r.join('').trim() }; });
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

(async () => {
    const w = makeWorker('macse-worker.js');
    check(w.ctx.MacseAlign && w.ctx.MacseAlign.wasmAvailable(), 'macse-worker loads macse-align.js and the WebAssembly kernel');
    const id = '202190at40674';
    const inp = parse(fs.readFileSync(`${fx}/${id}.in.fna`, 'utf8'));
    const mac = parse(fs.readFileSync(`${fx}/${id}.macse_NT.fna`, 'utf8'));

    // 1. reversed order, names with commas/parentheses
    const byName = Object.fromEntries(inp.map(r => [r.name, r.seq]));
    const order = ['Prob', 'Csokolovi', 'CricCric', 'Cgriseus'];
    const disp = { Cgriseus: 'Cgriseus (CriGri, PICRH)', Csokolovi: 'C. sokolovi', Prob: 'Prob', CricCric: 'CricCric' };
    const fasta = order.map(n => `>${disp[n]}\n${byName[n]}\n`).join('');
    let out = await w.send({ id: 1, type: 'align', fasta, opts: { engine: 'macse', frameRestored: true } });
    let fin = out[out.length - 1];
    check(fin.ok, 'MACSE engine returns a result' + (fin.ok ? '' : ': ' + fin.error));
    let res = parse(fin.result);
    check(res.map(r => r.name).join('|') === order.map(n => disp[n]).join('|'), 'rows come back in input order with the original names');
    const macBy = Object.fromEntries(mac.map(r => [r.name, r.seq.replace(/!/g, '-')]));
    check(order.every((n, i) => res[i].seq === macBy[n]), 'alignment equals MACSE (with ! written as -)');
    check(!fin.result.includes('!'), "no '!' in the frame-restored output");
    check(out.some(m => m.progress && m.progress.stage === 'refine'), 'progress messages are posted');
    check(fin.stats.engine === 'macse' && fin.stats.columns > 0 && fin.stats.wasm === true, 'stats report the engine, codon columns and the WebAssembly kernel');

    // 2. user letters survive: lower case, U, IUPAC codes
    const s0 = byName.Csokolovi;
    const tweak = s0.slice(0, 30).toLowerCase() + 'U' + s0.slice(31, 60) + 'W' + s0.slice(61);
    const fasta2 = `>Cgriseus\n${byName.Cgriseus}\n>Csokolovi\n${tweak}\n>Prob\n${byName.Prob}\n>CricCric\n${byName.CricCric}\n`;
    out = await w.send({ id: 2, type: 'align', fasta: fasta2, opts: { engine: 'macse' } });
    fin = out[out.length - 1];
    res = parse(fin.result);
    check(res.find(r => r.name === 'Csokolovi').seq.replace(/-/g, '') === tweak, 'lower case, U and W are kept in the output');

    // 3. raw MACSE output with '!' when frameRestored is false
    out = await w.send({ id: 3, type: 'align', fasta, opts: { engine: 'macse', frameRestored: false } });
    res = parse(out[out.length - 1].result);
    const macRaw = Object.fromEntries(mac.map(r => [r.name, r.seq]));
    check(order.every((n, i) => res[i].seq === macRaw[n]), "frameRestored:false gives MACSE's raw output including '!'");

    // 4. refusals
    out = await w.send({ id: 4, type: 'align', fasta: '>a\nMKVLAAGIVRSTQWERTYPLKMNHGFDSA\n>b\nMKVLAAGIVRSTQWERTYPLKMNHGFDSA\n', opts: { engine: 'macse' } });
    check(out[out.length - 1].ok === false && /nucleotide/i.test(out[out.length - 1].error), 'protein input is refused: ' + out[out.length - 1].error);
    out = await w.send({ id: 5, type: 'align', fasta: '>a\nATGAAA\n', opts: { engine: 'macse' } });
    check(out[out.length - 1].ok === false, 'a single sequence is refused');

    // 5. pool-member role: one profile alignment task
    const MA = w.ctx.MacseAlign;
    const ctx = MA._internal.makeCtx({});
    const A = new MA._internal.SeqSet(), B = new MA._internal.SeqSet();
    A.add(new MA._internal.SeqNT('a', 'ATGGCTGAAAAGCTGGATACC', true)); B.add(new MA._internal.SeqNT('b', 'ATGGCTGAGAAGCTGATACC', true));
    out = await w.send({ type: 'dp', id: 9, task: { opts: ctx.taskOpts, s1: [['a', 'ATGGCTGAAAAGCTGGATACC', true]], s2: [['b', 'ATGGCTGAGAAGCTGATACC', true]], bounds: null } });
    check(out[0] && out[0].ok && out[0].result.set.length === 2, "the 'dp' role aligns one profile pair");

    // 6. fast engine (its own worker)
    const f = makeWorker('codon-align-worker.js');
    out = await f.send({ id: 6, type: 'align', fasta, opts: { engine: 'fast', frameRestored: true } });
    check(out[out.length - 1].ok && out[out.length - 1].stats.engine === 'fast', 'fast engine still works in codon-align-worker.js');
    check(typeof f.ctx.MacseAlign === 'undefined', 'codon-align-worker.js does not load the MACSE port');

    console.log(fails ? `${fails} FAILED` : 'all worker checks passed');
    process.exit(fails ? 1 : 0);
})();
