'use strict';
// Parameter sweep of codon-align.js against the MACSE fixtures: mean pairwise agreement, genes with identical
// frameshift counts, total frameshift count difference, time. node tests/codon-align/sweep.js
const fs = require('fs'), path = require('path');
const CodonAlign = require(path.join(__dirname, '..', '..', 'codon-align.js'));
const dir = path.join(__dirname, 'fixtures');
const ids = fs.readdirSync(dir).filter(f => f.endsWith('.in.fna')).map(f => f.replace('.in.fna', '')).sort();
const data = ids.map(id => ({ id, inp: CodonAlign.parseFasta(fs.readFileSync(path.join(dir, id + '.in.fna'), 'utf8')),
    mac: CodonAlign.parseFasta(fs.readFileSync(path.join(dir, id + '.macse_NT.fna'), 'utf8')) }));
function pairSet(ax, ay) { const set = new Set(); let i = 0, j = 0; for (let c = 0; c < ax.length; c++) { const rx = ax[c] !== '-' && ax[c] !== '!', ry = ay[c] !== '-' && ay[c] !== '!'; if (rx && ry) set.add(i * 1000003 + j); if (rx) i++; if (ry) j++; } return set; }
const fsCount = s => (s.match(/.{3}/g) || []).filter(c => c.includes('!')).length;
const sets = (process.argv[2] ? JSON.parse(process.argv[2]) : [
    {}, { stop: -100 }, { stop: -40 }, { stop: -60 }, { frameshift: -25 }, { frameshift: -40 }, { gapOpen: -10, gapExtend: -1 }, { gapOpen: -5 }, { ntBonus: 1 }, { ntBonus: 0 }
]);
console.log('params'.padEnd(40), 'agree  fsSameGenes  |dFs|  ms');
for (const p of sets) {
    const t0 = Date.now(); let agSum = 0, same = 0, dfs = 0;
    for (const { inp, mac } of data) {
        const refName = inp.some(r => r.name === 'Cgriseus') ? 'Cgriseus' : inp[0].name;
        const r = CodonAlign.alignMultiple(inp, Object.assign({ ref: refName }, p));
        const by = Object.fromEntries(r.nt.map(x => [x.name, x.seq])), mb = Object.fromEntries(mac.map(x => [x.name, x.seq]));
        const names = inp.map(x => x.name); let agree = 0, tot = 0;
        for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) {
            const A = pairSet(by[names[a]], by[names[b]]), B = pairSet(mb[names[a]], mb[names[b]]);
            for (const v of B) if (A.has(v)) agree++; tot += B.size;
        }
        agSum += agree / tot;
        const f1 = names.map(n => fsCount(by[n])), f2 = names.map(n => fsCount(mb[n]));
        if (f1.every((v, i) => v === f2[i])) same++;
        dfs += f1.reduce((s, v, i) => s + Math.abs(v - f2[i]), 0);
    }
    console.log(JSON.stringify(p).padEnd(40), (agSum / data.length).toFixed(4), String(same).padStart(6) + '/' + data.length, String(dfs).padStart(6), String(Date.now() - t0).padStart(6));
}
