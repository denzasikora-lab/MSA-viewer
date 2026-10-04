'use strict';
// node shard.js <macse_dir> <ids_file> <out.tsv>   (port vs MACSE aln_NT, exact string identity per gene)
const fs = require('fs'), path = require('path');
const MA = require(fs.existsSync(path.join(__dirname, 'macse-align.js')) ? path.join(__dirname, 'macse-align.js') : path.join(__dirname, '..', '..', 'macse-align.js'));
const [dir, idsFile, out] = process.argv.slice(2);
const ids = fs.readFileSync(idsFile, 'utf8').split('\n').filter(Boolean);
const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').map(l => l.split('\t')[0]) : []);
for (const id of ids) {
    if (done.has(id)) continue;
    const inp = MA.parseFasta(fs.readFileSync(`${dir}/in/${id}.fna`, 'utf8'));
    const macF = `${dir}/aln_NT/${id}.fna`;
    if (!fs.existsSync(macF)) { fs.appendFileSync(out, `${id}\tno_macse\t\t${inp.length}\t\t\t\n`); continue; }
    const mac = MA.parseFasta(fs.readFileSync(macF, 'utf8'));
    const t = Date.now(); let r, err = '';
    try { r = MA.alignSequences(inp); } catch (e) { err = String(e.message).replace(/\s+/g, ' '); }
    const ms = Date.now() - t;
    if (err) { fs.appendFileSync(out, `${id}\terror\t${ms}\t${inp.length}\t${inp[0].seq.length}\t\t${err}\n`); continue; }
    const key = x => x.map(y => y.name + '\n' + y.seq).join('\n');
    const same = key(r.nt) === key(mac);
    const sameSet = same || key([...r.nt].sort((a, b) => a.name < b.name ? -1 : 1)) === key([...mac].sort((a, b) => a.name < b.name ? -1 : 1));
    fs.appendFileSync(out, `${id}\t${same ? 'identical' : (sameSet ? 'same_rows_other_order' : 'different')}\t${ms}\t${inp.length}\t${inp[0].seq.length}\t${r.stats.refineIterations}\t\n`);
}
