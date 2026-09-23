'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'examples', 'synthetic');
const src = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const lines = src.split(/\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

const code = [
    'const state = {};',
    slice(1354, 1354), // const el
    slice(2091, 2102),
    slice(3048, 3095),
    slice(3102, 4879)
].join('\n');

const context = {
    document: { getElementById() { return null; } },
    console,
    state: {}
};
context.global = context;
vm.createContext(context);
vm.runInContext(code, context, { filename: 'parsers.js' });

function read(name) {
    return fs.readFileSync(path.join(dir, name), 'utf8');
}

const fasta = context.parseFasta(read('synth_msa.fa'));
const expected = new Map(fasta.map(s => [s.header, s.seq]));
if (expected.size !== 6) throw new Error('fasta count ' + expected.size);

function same(label, parsed) {
    if (!parsed || parsed.length !== expected.size) {
        throw new Error(label + ' count ' + (parsed && parsed.length));
    }
    for (const s of parsed) {
        const want = expected.get(s.header);
        if (want !== s.seq) {
            throw new Error(label + ' mismatch ' + s.header + '\n got ' + s.seq + '\n want ' + want);
        }
    }
    console.log('PASS', label, parsed.length, 'x', parsed[0].seq.length);
}

same('clustal', context.parseClustal(read('synth_msa.aln')));
same('phylip', context.parsePhylip(read('synth_msa.phy')));
same('phylip-interleaved', context.parsePhylip(read('synth_msa.interleaved.phy')));
same('nexus', context.parseNexus(read('synth_msa.nex')));
same('stockholm', context.parseStockholm(read('synth_msa.sto')));
same('msf', context.parseMsf(read('synth_msa.msf')));

const gb = context.parseGenBank(read('synth_ref.gb'));
if (!gb || gb.length !== 1) throw new Error('genbank count');
const refUngapped = expected.get('alpha_ref');
if (gb[0].seq.toUpperCase() !== refUngapped) throw new Error('genbank sequence mismatch');
if (!/CDS/.test(JSON.stringify(gb[0]._genbank.features))) throw new Error('genbank missing CDS');
console.log('PASS genbank', gb[0].seq.length, gb[0].header);

const sam = context.parseSamToAlignment(read('synth_reads.sam'));
if (!sam || sam.length < 6) throw new Error('sam rows ' + (sam && sam.length));
const names = sam.map(s => s.header);
for (const n of ['read_perfect_a', 'read_mismatch', 'read_deletion', 'read_insertion', 'read_reverse']) {
    if (!names.includes(n)) throw new Error('sam missing ' + n);
}
const deletion = sam.find(s => s.header === 'read_deletion');
if (!deletion.seq.includes('-')) throw new Error('deletion read has no gap in the alignment');
console.log('PASS sam', sam.length, 'rows, deletion gaps', (deletion.seq.match(/-/g) || []).length);

const protein = context.parseFasta(read('synth_protein.fa'));
if (protein.length !== 3) throw new Error('protein count');
if (protein[0].seq !== protein[1].seq) throw new Error('syn protein should match');
if (protein[2].seq[1] !== 'E') throw new Error('mis protein');
console.log('PASS protein', protein.map(s => s.seq).join(' '));

const dots = context.parseFasta(read('synth_dotplot.fa'));
if (dots.length !== 2) throw new Error('dotplot count');
if (dots[0].seq.indexOf('ACGTACGTACGTACGTACGTACGTACGT') === dots[1].seq.indexOf('ACGTACGTACGTACGTACGTACGTACGT')) {
    throw new Error('shared repeat should sit at different offsets');
}
console.log('PASS dotplot offsets', dots[0].seq.indexOf('ACGTACGT'), dots[1].seq.indexOf('ACGTACGT'));

// BAM: gunzip BGZF members and confirm the magic and the six read names.
const bam = fs.readFileSync(path.join(dir, 'synth_reads.bam'));
const parts = [];
let off = 0;
while (off < bam.length) {
    if (bam[off] !== 0x1f || bam[off + 1] !== 0x8b) throw new Error('bad gzip magic at ' + off);
    const xlen = bam.readUInt16LE(off + 10);
    const bsize = bam.readUInt16LE(off + 16) + 1;
    const member = bam.subarray(off, off + bsize);
    parts.push(zlib.gunzipSync(member));
    off += bsize;
}
const raw = Buffer.concat(parts);
if (raw.slice(0, 4).toString() !== 'BAM\x01') throw new Error('BAM magic');
const textLen = raw.readInt32LE(4);
const text = raw.slice(8, 8 + textLen).toString();
if (!text.includes('synth_ref')) throw new Error('BAM header missing reference');
let p = 8 + textLen;
const nRef = raw.readInt32LE(p); p += 4;
if (nRef !== 1) throw new Error('nRef ' + nRef);
const nameLen = raw.readInt32LE(p); p += 4;
p += nameLen + 4;
const found = [];
while (p + 4 <= raw.length) {
    const block = raw.readInt32LE(p); p += 4;
    const start = p;
    p += 8; // refID, pos
    const lName = raw[p];
    const qname = raw.slice(start + 32, start + 32 + lName - 1).toString();
    found.push(qname);
    p = start + block;
}
if (found.join(',') !== 'read_perfect_a,read_perfect_b,read_mismatch,read_deletion,read_insertion,read_reverse') {
    throw new Error('BAM names ' + found.join(','));
}
console.log('PASS bam', found.length, 'reads');
console.log('ALL PASS');
