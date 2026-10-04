'use strict';
// Exact identity of macse-align.js with MACSE v2.07 on the random corpus (tests/macse-port/corpus, MACSE outputs in
// corpus/out). Compares nucleotide and amino-acid outputs as strings (names, row order, every '!' and '-').
// node run_corpus.js [--module path] [--async N] [--dir corpus_dir] [--opts JSON] [id,id,...]
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
let modPath = path.join(__dirname, '..', '..', 'macse-align.js'), asyncN = 0, only = null, dir = path.join(__dirname, 'corpus'), alignOpts = {};
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--module') modPath = path.resolve(args[++i]);
    else if (args[i] === '--async') asyncN = +args[++i];
    else if (args[i] === '--dir') dir = path.resolve(args[++i]);
    else if (args[i] === '--opts') alignOpts = JSON.parse(args[++i]);
    else only = new Set(args[i].split(','));
}
const MA = require(modPath);
const ids = fs.readdirSync(dir).filter(f => /^r\d+\.fna$/.test(f)).map(f => f.replace('.fna', '')).filter(id => !only || only.has(id)).sort();
const key = recs => recs.map(r => r.name + '\n' + r.seq).join('\n');
(async () => {
    let pool = null;
    if (asyncN > 0) pool = require('./node_pool.js').makePool(asyncN, modPath);
    let same = 0, n = 0, tms = 0;
    for (const id of ids) {
        const inp = MA.parseFasta(fs.readFileSync(path.join(dir, id + '.fna'), 'utf8'));
        const macNT = MA.parseFasta(fs.readFileSync(path.join(dir, 'out', id + '.macse_NT.fna'), 'utf8'));
        const macAA = MA.parseFasta(fs.readFileSync(path.join(dir, 'out', id + '.macse_AA.faa'), 'utf8'));
        const t = Date.now(); let r;
        try { r = pool ? await MA.alignSequencesAsync(inp, alignOpts, pool) : MA.alignSequences(inp, alignOpts); }
        catch (e) { console.log(id, 'ERROR', e.stack); n++; continue; }
        const ms = Date.now() - t; tms += ms;
        const okNT = key(r.nt) === key(macNT), okAA = key(r.aa) === key(macAA);
        if (okNT && okAA) same++;
        n++;
        if (!(okNT && okAA) || process.env.VERBOSE) console.log(`${id}\t${inp.length} seqs\t${okNT ? 'NT ok' : 'NT DIFFERENT'}\t${okAA ? 'AA ok' : 'AA DIFFERENT'}\t${ms} ms`);
    }
    if (pool) await pool.close();
    console.log(`corpus: identical ${same}/${n} (NT and AA); total ${tms} ms`);
    process.exit(same === n && n > 0 ? 0 : 1);
})();
