'use strict';
// Random coding-sequence sets for exact-identity testing of macse-align.js against MACSE (deterministic seed).
// node make_corpus.js <outdir> [count] [seed] [scale]   (scale 2: longer genes, up to 24 sequences)
// Each set: an ancestral CDS evolved along a random tree with substitutions, codon indels, 1-2 nt frameshift
// indels, occasional internal stops, truncated ends, N/R/Y and lower-case stretches; 2 to 16 sequences.
const fs = require('fs'), path = require('path');
const out = process.argv[2], count = +(process.argv[3] || 60), scale = +(process.argv[5] || 1);
fs.mkdirSync(out, { recursive: true });
let seed = +(process.argv[4] || 20261004);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
const pick = a => a[Math.floor(rnd() * a.length)];
const B = 'ACGT';
const sense = [];
for (const a of B) for (const b of B) for (const c of B) { const k = a + b + c; if (!['TAA', 'TAG', 'TGA'].includes(k)) sense.push(k); }
function mutate(s, rate) {
    const a = s.split('');
    for (let i = 0; i < a.length; i++) if (rnd() < rate) a[i] = pick(B);
    let r = a.join('');
    // codon indels
    const nCodonIndel = Math.floor(rnd() * 3);
    for (let k = 0; k < nCodonIndel; k++) {
        const p = 3 * Math.floor(rnd() * (r.length / 3 - 2)) + 3;
        if (rnd() < 0.5) r = r.slice(0, p) + r.slice(p + 3 * (1 + Math.floor(rnd() * 4)));
        else { let ins = ''; for (let j = 0, n = 1 + Math.floor(rnd() * 4); j < n; j++) ins += pick(sense); r = r.slice(0, p) + ins + r.slice(p); }
    }
    return r;
}
function frameshift(s) {
    const p = 10 + Math.floor(rnd() * (s.length - 20));
    if (rnd() < 0.5) return s.slice(0, p) + s.slice(p + 1 + Math.floor(rnd() * 2));
    return s.slice(0, p) + (rnd() < 0.5 ? pick(B) : pick(B) + pick(B)) + s.slice(p);
}
const meta = [];
for (let t = 0; t < count; t++) {
    const n = pick(scale > 1 ? [2, 3, 4, 4, 5, 6, 8, 12, 16, 20, 24] : [2, 2, 3, 3, 4, 5, 6, 8, 10, 12, 16]);
    const L = 40 + Math.floor(rnd() * (n > 8 ? 220 : 380) * scale);      // codons
    let anc = 'ATG';
    for (let i = 0; i < L; i++) anc += pick(sense);
    anc += pick(['TAA', 'TAG', 'TGA']);
    const div = pick([0.02, 0.05, 0.1, 0.2]);
    // random tree by repeated splitting
    let seqs = [anc];
    while (seqs.length < n) {
        const i = Math.floor(rnd() * seqs.length);
        const s = seqs[i];
        seqs.splice(i, 1, mutate(s, div / 2), mutate(s, div / 2));
    }
    seqs = seqs.map(s => mutate(s, div / 4));
    const recs = seqs.map((s, i) => {
        let x = s;
        if (rnd() < 0.3) x = frameshift(x);
        if (rnd() < 0.1) x = frameshift(x);
        if (rnd() < 0.15) { const p = 3 * (5 + Math.floor(rnd() * (x.length / 3 - 10))); x = x.slice(0, p) + pick(['TAA', 'TAG', 'TGA']) + x.slice(p + 3); }
        if (rnd() < 0.2) x = x.slice(Math.floor(rnd() * x.length * 0.3));                 // 5' truncated (any frame)
        if (rnd() < 0.2) x = x.slice(0, x.length - Math.floor(rnd() * x.length * 0.3));   // 3' truncated
        if (rnd() < 0.15) { const p = Math.floor(rnd() * (x.length - 20)); x = x.slice(0, p) + 'NNNNNNNNNN'.slice(0, 1 + Math.floor(rnd() * 9)) + x.slice(p + 5); }
        if (rnd() < 0.1) { const a = x.split(''); for (let k = 0; k < 3; k++) a[Math.floor(rnd() * a.length)] = pick(['R', 'Y']); x = a.join(''); }
        if (rnd() < 0.1) { const p = Math.floor(rnd() * x.length * 0.5); x = x.slice(0, p) + x.slice(p, p + 60).toLowerCase() + x.slice(p + 60); }
        return { name: 'seq' + String(i + 1).padStart(2, '0'), seq: x };
    });
    const id = 'r' + String(t + 1).padStart(3, '0');
    fs.writeFileSync(path.join(out, id + '.fna'), recs.map(r => `>${r.name}\n${r.seq}\n`).join(''));
    meta.push(`${id}\t${n}\t${Math.max(...recs.map(r => r.seq.length))}\t${div}`);
}
fs.writeFileSync(path.join(out, 'corpus.tsv'), 'id\tn_seq\tmax_len\tdivergence\n' + meta.join('\n') + '\n');
console.log(`wrote ${count} sets to ${out}`);
