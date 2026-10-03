'use strict';
// Run codon-align.js on every MACSE input of the hamster re-prediction and compare (incremental TSV output).
// node tests/codon-align/full_vs_macse.js <macse_dir> <out.tsv>
const fs = require('fs'), path = require('path');
const CA = require(path.join(__dirname, '..', '..', 'codon-align.js'));
const dir = process.argv[2], outPath = process.argv[3];
const ids = fs.readdirSync(dir + '/aln_NT').map(f => f.replace('.fna', '')).sort();
function pairSet(ax, ay) { const s = new Set(); let i = 0, j = 0; for (let c = 0; c < ax.length; c++) { const rx = ax[c] !== '-' && ax[c] !== '!', ry = ay[c] !== '-' && ay[c] !== '!'; if (rx && ry) s.add(i * 1000003 + j); if (rx) i++; if (ry) j++; } return s; }
const fsC = s => (s.match(/.{3}/g) || []).filter(c => c.includes('!')).length;
fs.writeFileSync(outPath, 'gene\tlen\tms\tagree\tfs_mine\tfs_macse\n');
let t0 = Date.now(), ag = [], same = 0, n = 0, fsMine = 0, fsMac = 0, sokOnlyMine = 0, sokOnlyMac = 0, both = 0, errs = 0, maxMs = 0, maxId = '';
for (const id of ids) {
    const inp = CA.parseFasta(fs.readFileSync(`${dir}/in/${id}.fna`, 'utf8'));
    const mac = CA.parseFasta(fs.readFileSync(`${dir}/aln_NT/${id}.fna`, 'utf8'));
    const ref = inp.some(r => r.name === 'Cgriseus') ? 'Cgriseus' : inp[0].name;
    const t = Date.now(); let r;
    try { r = CA.alignMultiple(inp, { ref }); } catch (e) { errs++; fs.appendFileSync(outPath, `${id}\t${inp[0].seq.length}\tERROR\t\t\t${e.message}\n`); continue; }
    const ms = Date.now() - t; if (ms > maxMs) { maxMs = ms; maxId = id; }
    const by = Object.fromEntries(r.nt.map(x => [x.name, x.seq])), mb = Object.fromEntries(mac.map(x => [x.name, x.seq]));
    const names = inp.map(x => x.name); let a = 0, tot = 0;
    for (let p = 0; p < names.length; p++) for (let q = p + 1; q < names.length; q++) {
        if (!mb[names[p]] || !mb[names[q]]) continue;
        const A = pairSet(by[names[p]], by[names[q]]), B = pairSet(mb[names[p]], mb[names[q]]);
        for (const v of B) if (A.has(v)) a++; tot += B.size;
    }
    const agree = tot ? a / tot : NaN; ag.push(agree); n++;
    const f1 = names.map(x => fsC(by[x])), f2 = names.map(x => fsC(mb[x] || ''));
    if (f1.every((v, i) => v === f2[i])) same++;
    fsMine += f1.reduce((s, v) => s + v, 0); fsMac += f2.reduce((s, v) => s + v, 0);
    const iS = names.indexOf('Csokolovi'), iG = names.indexOf('Cgriseus');
    if (iS >= 0 && iG >= 0) { const m1 = f1[iS] > 0 && f1[iG] === 0, m2 = f2[iS] > 0 && f2[iG] === 0; if (m1) sokOnlyMine++; if (m2) sokOnlyMac++; if (m1 && m2) both++; }
    fs.appendFileSync(outPath, `${id}\t${inp[0].seq.length}\t${ms}\t${agree.toFixed(4)}\t${f1.join(',')}\t${f2.join(',')}\n`);
}
const srt = [...ag].sort((x, y) => x - y);
console.log(`genes ${n} (errors ${errs}); total ${((Date.now() - t0) / 1000).toFixed(0)} s; slowest ${maxId} ${maxMs} ms`);
console.log(`agreement mean ${(ag.reduce((s, v) => s + v, 0) / n).toFixed(4)} median ${srt[Math.floor(n / 2)].toFixed(4)} q05 ${srt[Math.floor(n * 0.05)].toFixed(4)} min ${srt[0].toFixed(4)}; genes <0.95: ${ag.filter(v => v < 0.95).length}`);
console.log(`identical fs counts ${same}/${n}; total frameshift codons mine ${fsMine} vs MACSE ${fsMac}`);
console.log(`sokolovi-fs & griseus-clean: mine ${sokOnlyMine}, MACSE ${sokOnlyMac}, both ${both}`);
