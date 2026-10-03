'use strict';
// Show, for one fixture gene, where our alignment and MACSE's differ. node tests/codon-align/debug_gene.js <busco_id> [species]
const fs = require('fs'), path = require('path');
const CodonAlign = require(path.join(__dirname, '..', '..', 'codon-align.js'));
const id = process.argv[2], only = process.argv[3];
const dir = path.join(__dirname, 'fixtures');
const inp = CodonAlign.parseFasta(fs.readFileSync(path.join(dir, id + '.in.fna'), 'utf8'));
const mac = CodonAlign.parseFasta(fs.readFileSync(path.join(dir, id + '.macse_NT.fna'), 'utf8'));
const refName = inp.some(r => r.name === 'Cgriseus') ? 'Cgriseus' : inp[0].name;
const r = CodonAlign.alignMultiple(inp, { ref: refName });
console.log('lengths:', inp.map(x => `${x.name}=${x.seq.length} (mod3=${x.seq.length % 3})`).join('  '));
console.log('MACSE fs per species:', mac.map(x => `${x.name}=${(x.seq.match(/.{3}/g) || []).filter(c => c.includes('!')).length}`).join(' '));
console.log('mine  fs per species:', r.stats.frameshifts.map(x => `${x.name}=${x.n}`).join(' '), ' ref=', r.stats.ref);
const macBy = Object.fromEntries(mac.map(x => [x.name, x.seq]));
const mineBy = Object.fromEntries(r.nt.map(x => [x.name, x.seq]));
function codonsOf(seq) { return seq.match(/.{3}/g) || []; }
function show(name) {
    const m1 = codonsOf(mineBy[name]), m2 = codonsOf(macBy[name]);
    const ref1 = codonsOf(mineBy[refName]), ref2 = codonsOf(macBy[refName]);
    console.log(`\n== ${name}: columns with a frameshift codon (mine | MACSE), with the ${refName} codon in the same column`);
    const fsCols = (cods) => cods.map((c, i) => c.includes('!') ? i : -1).filter(i => i >= 0);
    const show1 = fsCols(m1), show2 = fsCols(m2);
    const ctx = (cods, refc, i) => cods.slice(Math.max(0, i - 3), i + 4).join(' ') + '   | ref: ' + refc.slice(Math.max(0, i - 3), i + 4).join(' ');
    for (const i of show1) console.log(`mine  col ${String(i).padStart(4)}: ${ctx(m1, ref1, i)}`);
    for (const i of show2) console.log(`MACSE col ${String(i).padStart(4)}: ${ctx(m2, ref2, i)}`);
    // where do the two alignments disagree on homologous pairs with the reference?
    function pairs(x, y) { const s = new Map(); let i = 0, j = 0; for (let c = 0; c < x.length; c++) { const rx = x[c] !== '-' && x[c] !== '!', ry = y[c] !== '-' && y[c] !== '!'; if (rx && ry) s.set(i, j); if (rx) i++; if (ry) j++; } return s; }
    const p1 = pairs(mineBy[refName], mineBy[name]), p2 = pairs(macBy[refName], macBy[name]);
    let diff = 0, first = null, last = null;
    for (const [i, j] of p2) { if (p1.get(i) !== j) { diff++; if (first === null) first = i; last = i; } }
    console.log(`ref-vs-${name}: ${p2.size} MACSE pairs, ${diff} differ (ref nt ${first}..${last})`);
}
for (const x of inp) if (!only || x.name === only) if (x.name !== refName) show(x.name);
