'use strict';
// Port vs MACSE on the hamster gene set: exact string identity per gene (names, row order, every '!' and '-').
// node shard.js <macse_dir> <ids_file> <out.tsv> [threads]
//   threads 0 or absent: MacseAlign.alignSequences (one thread); N >= 1: alignSequencesAsync with an N-thread pool
//   (node_pool.js: parallel guide tree, speculative refinement, tiled profile alignments).
// Part of the MACSE port tests (CeCILL 2.1, LICENSE-MACSE).
const fs = require('fs'), path = require('path');
const modPath = fs.existsSync(path.join(__dirname, 'macse-align.js')) ? path.join(__dirname, 'macse-align.js') : path.join(__dirname, '..', '..', 'macse-align.js');
const MA = require(modPath);
const [dir, idsFile, out, threadsArg] = process.argv.slice(2);
const threads = +(threadsArg || 0);
const ids = fs.readFileSync(idsFile, 'utf8').split('\n').filter(Boolean);
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').map(l => l.split('\t')[0]) : []);
(async () => {
    const pool = threads > 0 ? require(path.join(__dirname, 'node_pool.js')).makePool(threads, modPath) : null;
    for (const id of ids) {
        if (done.has(id)) continue;
        const inp = MA.parseFasta(fs.readFileSync(`${dir}/in/${id}.fna`, 'utf8'));
        const macF = `${dir}/aln_NT/${id}.fna`;
        if (!fs.existsSync(macF)) { fs.appendFileSync(out, `${id}\tno_macse\t\t${inp.length}\t\t\t\n`); continue; }
        const mac = MA.parseFasta(fs.readFileSync(macF, 'utf8'));
        const t = Date.now(); let r, err = '';
        try { r = pool ? await MA.alignSequencesAsync(inp, {}, pool) : MA.alignSequences(inp); } catch (e) { err = String(e.message).replace(/\s+/g, ' '); }
        const ms = Date.now() - t;
        if (err) { fs.appendFileSync(out, `${id}\terror\t${ms}\t${inp.length}\t${inp[0].seq.length}\t\t${err}\n`); continue; }
        const key = x => x.map(y => y.name + '\n' + y.seq).join('\n');
        const same = key(r.nt) === key(mac);
        fs.appendFileSync(out, `${id}\t${same ? 'identical' : 'different'}\t${ms}\t${inp.length}\t${inp[0].seq.length}\t${r.stats.refineIterations}\t\n`);
    }
    if (pool) await pool.close();
})();
