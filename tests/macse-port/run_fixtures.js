'use strict';
// Compare macse-align.js with real MACSE v2.07 output (tests/codon-align/fixtures: <id>.in.fna -> <id>.macse_NT.fna).
const fs = require('fs'), path = require('path');
const MA = require(path.join(__dirname, '..', '..', 'macse-align.js'));
const args = process.argv.slice(2).filter(a => !a.startsWith('--async='));
const asyncArg = process.argv.slice(2).find(a => a.startsWith('--async='));
const asyncN = asyncArg ? +asyncArg.split('=')[1] : 0;   // --async=N: alignSequencesAsync with an N-thread pool
const dir = args[0] || path.join(__dirname, '..', 'codon-align', 'fixtures');
const only = args[1] ? new Set(args[1].split(',')) : null;   // optional comma-separated subset
const ids = fs.readdirSync(dir).filter(f => f.endsWith('.in.fna')).map(f => f.replace('.in.fna', '')).filter(id => !only || only.has(id)).sort();
(async () => {
const pool = asyncN > 0 ? require('./node_pool.js').makePool(asyncN, path.join(__dirname, '..', '..', 'macse-align.js')) : null;
let same = 0, n = 0, tms = 0;
for (const id of ids) {
    const inp = MA.parseFasta(fs.readFileSync(`${dir}/${id}.in.fna`, 'utf8'));
    const mac = MA.parseFasta(fs.readFileSync(`${dir}/${id}.macse_NT.fna`, 'utf8'));
    const t = Date.now(); let r;
    try { r = pool ? await MA.alignSequencesAsync(inp, {}, pool) : MA.alignSequences(inp); } catch (e) { console.log(id, 'ERROR', e.stack); n++; continue; }
    const ms = Date.now() - t; tms += ms;
    const mine = r.nt.map(x => x.name + '\n' + x.seq).join('\n'), theirs = mac.map(x => x.name + '\n' + x.seq).join('\n');
    const ok = mine === theirs;
    let detail = '';
    if (!ok) {
        const by = Object.fromEntries(r.nt.map(x => [x.name, x.seq])), mb = Object.fromEntries(mac.map(x => [x.name, x.seq]));
        const order = r.nt.map(x => x.name).join(',') === mac.map(x => x.name).join(',') ? 'same order' : `order mine ${r.nt.map(x => x.name)} macse ${mac.map(x => x.name)}`;
        const diffs = mac.map(x => { const a = by[x.name] || '', b = x.seq; let k = 0; while (k < a.length && a[k] === b[k]) k++; return a === b ? null : `${x.name}: len ${a.length}/${b.length} first diff at ${k}`; }).filter(Boolean);
        detail = order + '; ' + diffs.join('; ');
    }
    if (ok) same++; n++;
    console.log(`${id}\t${ok ? 'IDENTICAL' : 'DIFFERENT'}\t${ms} ms\trefine iters ${r.stats.refineIterations}\t${detail}`);
}
console.log(`identical ${same}/${n}; total ${tms} ms${pool ? ` (${asyncN} threads)` : ''}`);
if (pool) await pool.close();
process.exit(same === n && n > 0 ? 0 : 1);
})();
