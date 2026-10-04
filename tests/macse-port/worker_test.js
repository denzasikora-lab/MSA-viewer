'use strict';
// Runs codon-align-worker.js in a Node vm (importScripts / postMessage shims) and checks the MACSE engine wrapper:
// rows come back in input order with the user's letters (case, U, IUPAC), '!' written as '-', the alignment
// columns equal MACSE's, progress messages arrive, and bad input is refused.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const fx = path.join(root, 'tests', 'codon-align', 'fixtures');

function makeWorker() {
    const msgs = [];
    const ctx = { console, Date, Math, Map, Set, Array, String, Number, Object, Error, RegExp, JSON, Int32Array, Uint8Array, Uint16Array, Float64Array, Int8Array };
    ctx.self = ctx;
    ctx.location = { search: '' };
    ctx.postMessage = (m) => msgs.push(m);
    ctx.importScripts = (...files) => { for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f.replace(/\?.*$/, '')), 'utf8'), ctx, { filename: f }); };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'codon-align-worker.js'), 'utf8'), ctx, { filename: 'codon-align-worker.js' });
    return { send: (data) => { msgs.length = 0; ctx.onmessage({ data }); return msgs.slice(); } };
}
const parse = t => t.split('>').filter(Boolean).map(b => { const [h, ...r] = b.split('\n'); return { name: h.trim(), seq: r.join('').trim() }; });
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

const w = makeWorker();
const id = '202190at40674';
const inp = parse(fs.readFileSync(`${fx}/${id}.in.fna`, 'utf8'));
const mac = parse(fs.readFileSync(`${fx}/${id}.macse_NT.fna`, 'utf8'));

// 1. plain input, reversed order, names with commas/parentheses and a duplicate-prone name
const names = ['Cgriseus (CriGri, PICRH)', 'C. sokolovi', 'Prob', 'CricCric'];
const byName = Object.fromEntries(inp.map(r => [r.name, r.seq]));
const order = ['Prob', 'Csokolovi', 'CricCric', 'Cgriseus'];
const disp = { Cgriseus: names[0], Csokolovi: names[1], Prob: names[2], CricCric: names[3] };
const fasta = order.map(n => `>${disp[n]}\n${byName[n]}\n`).join('');
let out = w.send({ id: 1, type: 'align', fasta, opts: { engine: 'macse', frameRestored: true } });
let fin = out[out.length - 1];
check(fin.ok, 'MACSE engine returns a result');
let res = parse(fin.result);
check(res.map(r => r.name).join('|') === order.map(n => disp[n]).join('|'), 'rows come back in input order with the original names');
const macBy = Object.fromEntries(mac.map(r => [r.name, r.seq.replace(/!/g, '-')]));
check(order.every((n, i) => res[i].seq === macBy[n]), 'alignment equals MACSE (with ! written as -)');
check(!fin.result.includes('!'), "no '!' in the frame-restored output");
check(out.some(m => m.progress && m.progress.stage === 'refine'), 'progress messages are posted');
check(fin.stats.engine === 'macse' && fin.stats.columns > 0, 'stats report the engine and codon columns');

// 2. user letters survive: lower case, U, IUPAC codes (aligned as MACSE would, i.e. as N / T)
const s0 = byName.Csokolovi;
const tweak = s0.slice(0, 30).toLowerCase() + 'U' + s0.slice(31, 60) + 'W' + s0.slice(61);
const fasta2 = `>Cgriseus\n${byName.Cgriseus}\n>Csokolovi\n${tweak}\n>Prob\n${byName.Prob}\n>CricCric\n${byName.CricCric}\n`;
out = w.send({ id: 2, type: 'align', fasta: fasta2, opts: { engine: 'macse' } });
fin = out[out.length - 1];
res = parse(fin.result);
const sok = res.find(r => r.name === 'Csokolovi').seq;
check(sok.replace(/-/g, '') === tweak, 'lower case, U and W are kept in the output');
check(sok.toUpperCase().replace(/U/, 'T').replace(/W/, s0[60]) === macBy.Csokolovi.toUpperCase().replace(/W/, s0[60]) || sok.length === macBy.Csokolovi.length, 'the tweaked letters do not shift the alignment length');

// 3. raw MACSE output with '!' when frameRestored is false
out = w.send({ id: 3, type: 'align', fasta, opts: { engine: 'macse', frameRestored: false } });
fin = out[out.length - 1];
res = parse(fin.result);
const macRaw = Object.fromEntries(mac.map(r => [r.name, r.seq]));
check(order.every((n, i) => res[i].seq === macRaw[n]), "frameRestored:false gives MACSE's raw output including '!'");

// 4. refusals
out = w.send({ id: 4, type: 'align', fasta: '>a\nMKVLAAGIVRSTQWERTYPLKMNHGFDSA\n>b\nMKVLAAGIVRSTQWERTYPLKMNHGFDSA\n', opts: { engine: 'macse' } });
check(out[out.length - 1].ok === false && /protein|nucleotide/i.test(out[out.length - 1].error), 'protein input is refused: ' + out[out.length - 1].error);
out = w.send({ id: 5, type: 'align', fasta: '>a\nATGAAA\n', opts: { engine: 'macse' } });
check(out[out.length - 1].ok === false, 'a single sequence is refused');

// 5. fast engine still reachable
out = w.send({ id: 6, type: 'align', fasta, opts: { engine: 'fast', frameRestored: true } });
check(out[out.length - 1].ok && out[out.length - 1].stats.engine === 'fast', 'fast engine still works');

console.log(fails ? `${fails} FAILED` : 'all worker checks passed');
process.exit(fails ? 1 : 0);
