'use strict';
// Benchmark + invariants for codon-align.js against MACSE v2.07 alignments of real BUSCO genes (4 hamster species).
// Fixtures: <id>.in.fna (unaligned CDS), <id>.macse_NT.fna, <id>.macse_AA.faa produced on DRAGEN 2026-10-03.
// Run: node tests/codon-align/run.js
const fs = require('fs'), path = require('path');
const CodonAlign = require(path.join(__dirname, '..', '..', 'codon-align.js'));

function parse(p) { return CodonAlign.parseFasta(fs.readFileSync(p, 'utf8')); }
function degap(s) { return s.replace(/[-!]/g, ''); }
// homologous nucleotide pairs (i in seq x, j in seq y) implied by an alignment
function pairSet(ax, ay) {
    const set = new Set(); let i = 0, j = 0;
    for (let c = 0; c < ax.length; c++) {
        const cx = ax[c], cy = ay[c];
        const rx = cx !== '-' && cx !== '!', ry = cy !== '-' && cy !== '!';
        if (rx && ry) set.add(i * 1000003 + j);
        if (rx) i++;
        if (ry) j++;
    }
    return set;
}
function fsCount(s) { return (s.match(/.{3}/g) || []).filter(c => c.includes('!')).length; }

let fail = 0;
function assert(cond, msg) { if (!cond) { fail++; console.log('  FAIL:', msg); } }

// 1. toy: one sequence with a 1 nt deletion
{
    const toy = [
        { name: 'A', seq: 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA' },
        { name: 'B', seq: 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA' },
        { name: 'C', seq: 'ATGGCTGAGAAGCTGGATACCGTTGAATGCCAGGTCTGAAACGTTAA' },
        { name: 'D', seq: 'ATGGCTGAAAAACTGGATACCGTTGGCATGCCAGGTCTAAAACGTTAA' }
    ];
    const r = CodonAlign.alignMultiple(toy, { ref: 0 });
    console.log('toy:', r.nt.map(x => x.name + ' ' + x.seq).join('\n     '));
    console.log('     ' + r.aa.map(x => x.seq).join(' | '));
    assert(fsCount(r.nt[2].seq) === 1, 'toy: C should carry exactly one frameshift codon');
    assert(fsCount(r.nt[0].seq) + fsCount(r.nt[1].seq) + fsCount(r.nt[3].seq) === 0, 'toy: A, B, D should have none');
    assert(r.nt.every(x => x.seq.length === r.nt[0].seq.length && x.seq.length % 3 === 0), 'toy: equal length, multiple of 3');
    assert(r.aa[2].seq.includes('!') && !r.aa[2].seq.slice(0, -1).includes('*'), 'toy: C translation shows ! and no internal stop');
}


// 1b. edge cases found in the v227 review (2026-10-04); every one of these was a real bug or a guarded failure mode
{
    const A = 'ATGGCTGAAAAGCTGGATACCGTTGGAATGCCAGGTCTGAAACGTTAA';
    const del1 = A.slice(0, 25) + A.slice(26);
    const fsOf = (r, name) => r.stats.frameshifts.find(x => x.name === name).n;
    const stOf = (r, name) => r.stats.internalStops.find(x => x.name === name).n;
    const residuesKept = (r, recs) => r.nt.every((x, i) => x.seq.replace(/[-!]/g, '') === recs[i].seq.replace(/[-.!\s]/g, ''));
    const equalLen = r => r.nt.every(x => x.seq.length === r.nt[0].seq.length) && r.nt[0].seq.length % 3 === 0;
    const al = (recs, o) => { const r = CodonAlign.alignMultiple(recs, o || {}); assert(equalLen(r), 'edge: unequal length / not mod 3'); assert(residuesKept(r, recs), 'edge: residues changed'); return r; };
    let recs, r;

    recs = [{ name: 'A', seq: A }, { name: 'B', seq: del1 }];
    r = al(recs);
    assert(fsOf(r, 'A') === 0 && fsOf(r, 'B') === 1, 'edge: two sequences, deletion in B -> one frameshift in B');

    recs = [{ name: 'B', seq: del1 }, { name: 'A', seq: A }];
    r = al(recs);
    assert(fsOf(r, 'A') + fsOf(r, 'B') === 1, 'edge: two sequences, deletion in reference -> exactly one frameshift in total');
    assert(stOf(r, 'A') + stOf(r, 'B') === 0, 'edge: two sequences, deletion in reference -> no internal stops');

    // stop codon inside the reference: was re-framed with 2 frameshifts in every sequence (start-of-reference vote)
    recs = [{ name: 'A', seq: A.slice(0, 12) + 'TAA' + A.slice(15) }, { name: 'B', seq: A }, { name: 'C', seq: A }];
    r = al(recs);
    assert(fsOf(r, 'A') + fsOf(r, 'B') + fsOf(r, 'C') === 0, 'edge: internal stop in reference must not cause frameshifts');
    assert(stOf(r, 'A') === 1 && stOf(r, 'B') === 0, 'edge: internal stop counted in the reference only');

    let threw = '';
    try { CodonAlign.alignMultiple([{ name: 'p1', seq: 'MKVLAAGIVGLLLAQPAMA' }, { name: 'p2', seq: 'MKVLAAGIVALLLAQPAMA' }]); } catch (e) { threw = e.message; }
    assert(/nucleotide/.test(threw), 'edge: protein input must be refused, got: ' + threw);

    recs = [{ name: 'A', seq: A.replace(/T/g, 'U') }, { name: 'B', seq: del1.replace(/T/g, 'U') }];
    r = al(recs);
    assert(r.aa[0].seq === 'MAEKLDTVGMPGLKR*', 'edge: RNA must translate (U read as T), got ' + r.aa[0].seq);
    assert(fsOf(r, 'B') === 1, 'edge: RNA deletion found');

    recs = [{ name: 'A', seq: A.toLowerCase() }, { name: 'B', seq: del1.slice(0, 20) + del1.slice(20).toLowerCase() }];
    r = al(recs); // residuesKept checks exact case

    recs = [{ name: 'A', seq: A }, { name: 'E', seq: '' }, { name: 'B', seq: A }];
    r = al(recs);
    recs = [{ name: 'E', seq: '' }, { name: 'A', seq: A }];
    r = al(recs);

    recs = [{ name: 'A', seq: A + 'GC' }, { name: 'B', seq: A }];
    r = al(recs);
    assert(stOf(r, 'A') === 0 && stOf(r, 'B') === 0, 'edge: final stop followed by a partial codon is not internal');

    recs = [{ name: 'a', seq: A }, { name: 'b', seq: A }, { name: 'c', seq: A }];
    r = al(recs);
    assert(r.nt.every(x => !x.seq.includes('-') && !x.seq.includes('!')), 'edge: identical sequences need no gaps');

    r = al([{ name: 'A', seq: A }, { name: 'B', seq: del1 }], { ref: 'nope' });
    assert(r.stats.refFound === false && r.stats.ref === 'A', 'edge: unknown reference name reported, first sequence used');

    threw = '';
    try { CodonAlign.alignMultiple([{ name: 'L', seq: A.repeat(40) }, { name: 'S', seq: A.repeat(4) }], { maxCells: 5000 }); } catch (e) { threw = e.message; }
    assert(/working memory/.test(threw), 'edge: memory guard must refuse with a clear message, got: ' + threw);
    console.log('edge cases: done');
}

// 2. fixtures vs MACSE
const dir = path.join(__dirname, 'fixtures');
const ids = fs.readdirSync(dir).filter(f => f.endsWith('.in.fna')).map(f => f.replace('.in.fna', '')).sort();
const agreeAll = [], fsAgree = [];
let totalMs = 0;
console.log(`\n${ids.length} fixture genes (ref = Cgriseus when present, else first sequence)`);
console.log('gene            len  species  ms   pairAgree  fs(mine)      fs(MACSE)');
for (const id of ids) {
    const inp = parse(path.join(dir, id + '.in.fna'));
    const mac = parse(path.join(dir, id + '.macse_NT.fna'));
    const refName = inp.some(r => r.name === 'Cgriseus') ? 'Cgriseus' : inp[0].name;
    const t0 = Date.now();
    const r = CodonAlign.alignMultiple(inp, { ref: refName });
    const ms = Date.now() - t0; totalMs += ms;
    const byName = Object.fromEntries(r.nt.map(x => [x.name, x.seq]));
    const macBy = Object.fromEntries(mac.map(x => [x.name, x.seq]));
    // invariants
    assert(r.nt.every(x => x.seq.length === r.nt[0].seq.length), id + ': unequal lengths');
    assert(r.nt[0].seq.length % 3 === 0, id + ': length not multiple of 3');
    for (const x of inp) {
        const macStripped = (macBy[x.name] || '').replace(/[-!]/g, '').toUpperCase();
        const mine = degap(byName[x.name]).toUpperCase();
        // MACSE input had the terminal stop stripped by macse_stage.py; our fixture .in.fna is that same input
        assert(mine === x.seq.toUpperCase(), id + ': ' + x.name + ' residues changed');
        if (macStripped && macStripped !== mine) assert(false, id + ': ' + x.name + ' MACSE fixture residues differ from input');
    }
    // pairwise column agreement vs MACSE
    let agree = 0, tot = 0;
    const names = inp.map(x => x.name);
    for (let p = 0; p < names.length; p++) for (let q = p + 1; q < names.length; q++) {
        if (!macBy[names[p]] || !macBy[names[q]]) continue;
        const A = pairSet(byName[names[p]], byName[names[q]]), B = pairSet(macBy[names[p]], macBy[names[q]]);
        for (const v of B) if (A.has(v)) agree++;
        tot += B.size;
    }
    const ag = tot ? agree / tot : NaN;
    agreeAll.push(ag);
    const fsMine = names.map(n => fsCount(byName[n])), fsMac = names.map(n => fsCount(macBy[n] || ''));
    fsAgree.push(fsMine.every((v, k) => v === fsMac[k]) ? 1 : 0);
    console.log(`${id.padEnd(15)} ${String(inp[0].seq.length).padStart(4)}  ${names.length}        ${String(ms).padStart(4)}  ${ag.toFixed(4)}     ${fsMine.join(',').padEnd(12)}  ${fsMac.join(',')}`);
}
const mean = agreeAll.reduce((a, b) => a + b, 0) / agreeAll.length;
console.log(`\nmean pairwise agreement with MACSE: ${mean.toFixed(4)}; genes with identical frameshift counts: ${fsAgree.reduce((a, b) => a + b, 0)}/${ids.length}; total ${totalMs} ms`);
assert(mean >= 0.85, 'mean agreement with MACSE below 0.85');
assert(totalMs < 60000, 'too slow');
console.log(fail ? `\n${fail} FAILURE(S)` : '\nALL OK');
process.exit(fail ? 1 : 0);
