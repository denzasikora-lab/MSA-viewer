'use strict';
/**
 * Synthetic ViewAlign test alignments.
 * One coding MSA written in every text format the viewer detects,
 * a pairwise dot-plot pair, a protein translation, and SAM/BAM reads.
 *
 * Run: node scratch/build_synthetic_examples.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'examples', 'synthetic');

const CODE = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',
    TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
    CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',
    CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',
    AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
    GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',
    GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
};

// 20 codons, 60 bp. Standard code. Ends in an in-frame stop.
const REF_CDS = 'ATGGCACTGAAAGAGTTCGGCATGCCGTACGACATCTGGAAGCAGGTGAGCTTTCGATAG';
const DIAG_ALPHA = 'AAAAAACCCCCC';
const DIAG_BETA = 'GGGGGGTTTTTT';
// GATTACA twice (tandem), TGTAATC is its reverse complement, then EcoRI and BamHI.
const TAIL = 'GATTACATTTGATTACATGTAATCGAATTCGGATCCCAA';

function translate(nt) {
    const letters = nt.replace(/-/g, '');
    let aa = '';
    for (let i = 0; i + 3 <= letters.length; i += 3) {
        aa += CODE[letters.slice(i, i + 3)] || 'X';
    }
    return aa;
}

function setBase(seq, index, base) {
    return seq.slice(0, index) + base + seq.slice(index + 1);
}

function setRange(seq, index, bases) {
    return seq.slice(0, index) + bases + seq.slice(index + bases.length);
}

if (REF_CDS.length !== 60) throw new Error('CDS length ' + REF_CDS.length);
if ((REF_CDS.length + DIAG_ALPHA.length + TAIL.length) % 3 !== 0) {
    throw new Error('alignment length must be divisible by 3');
}

const cds = {
    alpha_ref: REF_CDS,
    alpha_syn: setRange(REF_CDS, 6, 'TTG'),          // CTG Leu -> TTG Leu
    alpha_mis: setBase(REF_CDS, 4, 'A'),             // GCA Ala -> GAA Glu
    beta_stop: setBase(REF_CDS, 29, 'A'),            // TAC Tyr -> TAA stop
    beta_fs: setBase(REF_CDS, 4, '-'),               // 1-base gap, frameshift
    beta_del: setRange(REF_CDS, 18, '---')           // GGC deleted, in frame
};

const rows = [
    ['alpha_ref', cds.alpha_ref + DIAG_ALPHA + TAIL],
    ['alpha_syn', cds.alpha_syn + DIAG_ALPHA + TAIL],
    ['alpha_mis', cds.alpha_mis + DIAG_ALPHA + TAIL],
    ['beta_stop', cds.beta_stop + DIAG_BETA + TAIL],
    ['beta_fs', cds.beta_fs + DIAG_BETA + TAIL],
    ['beta_del', cds.beta_del + DIAG_BETA + TAIL]
];

const alnLen = rows[0][1].length;
for (const [name, seq] of rows) {
    if (name.length > 10) throw new Error('PHYLIP name too long: ' + name);
    if (seq.length !== alnLen) throw new Error(name + ' length ' + seq.length);
}

const ref = rows[0][1];
const eco = ref.indexOf('GAATTC');
const bamhi = ref.indexOf('GGATCC');
const gattaca = [];
for (let i = 0; i <= ref.length - 7; i++) if (ref.slice(i, i + 7) === 'GATTACA') gattaca.push(i);
const revGattaca = ref.indexOf('TGTAATC');
if (eco < 0 || bamhi < 0 || gattaca.length !== 2 || revGattaca < 0) {
    throw new Error('motif placement failed ' + JSON.stringify({ eco, bamhi, gattaca, revGattaca }));
}

const protein = [
    ['alpha_ref', translate(cds.alpha_ref)],
    ['alpha_syn', translate(cds.alpha_syn)],
    ['alpha_mis', translate(cds.alpha_mis)]
];
if (protein[0][1] !== protein[1][1]) throw new Error('synonymous pair should translate the same');
if (protein[0][1][1] !== 'A' || protein[2][1][1] !== 'E') throw new Error('nonsyn translation ' + protein.map(p => p[1]).join(' '));
if (!protein[0][1].endsWith('*')) throw new Error('reference should end in a stop');

// Pairwise dot plot: the shared 28-mer sits at the start of seq_late and the end of seq_early.
const SHARED = 'ACGTACGTACGTACGTACGTACGTACGT';
const MOTIF = 'GATTACATTTGATTACATGTAATC';
const dotA = 'AAAAAAAAAA' + MOTIF + 'CCCCCCCCCC' + SHARED;
const dotB = SHARED + 'GGGGGGGGGG' + MOTIF + 'TTTTTTTTTT';

function fasta(entries) {
    return entries.map(([h, s]) => '>' + h + '\n' + s + '\n').join('');
}

function wrap(seq, width) {
    const lines = [];
    for (let i = 0; i < seq.length; i += width) lines.push(seq.slice(i, i + width));
    return lines;
}

function clustal(entries) {
    let out = 'CLUSTAL W (1.83) multiple sequence alignment\n\n';
    const width = 60;
    for (let i = 0; i < alnLen; i += width) {
        for (const [name, seq] of entries) {
            out += name.padEnd(12) + seq.slice(i, i + width) + '\n';
        }
        out += '\n';
    }
    return out;
}

function phylipSequential(entries) {
    let out = entries.length + ' ' + alnLen + '\n';
    for (const [name, seq] of entries) {
        out += name.padEnd(10) + seq + '\n';
    }
    return out;
}

function phylipInterleaved(entries) {
    let out = entries.length + ' ' + alnLen + '\n';
    const width = 60;
    entries.forEach(([name, seq], idx) => {
        out += name.padEnd(10) + seq.slice(0, width) + '\n';
    });
    for (let i = width; i < alnLen; i += width) {
        out += '\n';
        for (const [, seq] of entries) out += seq.slice(i, i + width) + '\n';
    }
    return out;
}

function nexus(entries) {
    let out = '#NEXUS\nBEGIN DATA;\n';
    out += 'DIMENSIONS NTAX=' + entries.length + ' NCHAR=' + alnLen + ';\n';
    out += 'FORMAT DATATYPE=DNA GAP=- MISSING=N;\nMATRIX\n';
    for (const [name, seq] of entries) out += name + ' ' + seq + '\n';
    out += ';\nEND;\n';
    return out;
}

function stockholm(entries) {
    let out = '# STOCKHOLM 1.0\n#=GF ID synth_msa\n#=GF DE Synthetic ViewAlign coding alignment\n\n';
    for (const [name, seq] of entries) out += name.padEnd(12) + seq + '\n';
    out += '//\n';
    return out;
}

function msf(entries) {
    let out = '!!NA_MULTIPLE_ALIGNMENT 1.0\n\n';
    out += ' synth_msa  MSF: ' + alnLen + '  Type: N  23-SEP-2026  Check: 0  ..\n\n';
    for (const [name] of entries) {
        out += ' Name: ' + name + '  Len: ' + alnLen + '  Check: 0  Weight: 1.00\n';
    }
    out += '\n//\n\n';
    const width = 50;
    for (let i = 0; i < alnLen; i += width) {
        for (const [name, seq] of entries) {
            const chunk = seq.slice(i, i + width);
            const grouped = chunk.replace(/(.{10})/g, '$1 ').trim();
            out += name.padEnd(12) + grouped + '\n';
        }
        out += '\n';
    }
    return out;
}

function genbank(seq) {
    const cds = seq.slice(0, 60);
    const aa = translate(cds);
    const locus = 'synth_ref';
    let out = '';
    out += 'LOCUS       ' + locus.padEnd(16) + String(seq.length).padStart(6) + ' bp    DNA     linear   SYN 23-SEP-2026\n';
    out += 'DEFINITION  Synthetic coding sequence for ViewAlign tests.\n';
    out += 'ACCESSION   SYNTHREF\n';
    out += 'VERSION     SYNTHREF.1\n';
    out += 'SOURCE      synthetic\n';
    out += '  ORGANISM  synthetic construct\n';
    out += '            Unclassified.\n';
    out += 'FEATURES             Location/Qualifiers\n';
    out += '     source          1..' + seq.length + '\n';
    out += '                     /organism="synthetic construct"\n';
    out += '     CDS             1..60\n';
    out += '                     /codon_start=1\n';
    out += '                     /translation="' + aa + '"\n';
    out += 'ORIGIN\n';
    const lower = seq.toLowerCase();
    for (let i = 0; i < lower.length; i += 60) {
        const chunk = lower.slice(i, i + 60);
        const groups = chunk.replace(/(.{10})/g, '$1 ').trim();
        out += String(i + 1).padStart(9) + ' ' + groups + '\n';
    }
    out += '//\n';
    return out;
}

function revcomp(s) {
    const c = { A:'T', C:'G', G:'C', T:'A', N:'N' };
    return s.split('').reverse().map(b => c[b] || 'N').join('');
}

function samReads(refSeq) {
    const reads = [];
    function add(qname, pos1, cigar, seq, flag) {
        reads.push({ qname, flag: flag || 0, pos1, cigar, seq });
    }
    add('read_perfect_a', 1, '40M', refSeq.slice(0, 40));
    add('read_perfect_b', 25, '40M', refSeq.slice(24, 64));
    const mis = refSeq.slice(0, 30).split('');
    mis[4] = 'A'; // the nonsyn site, C->A
    add('read_mismatch', 1, '30M', mis.join(''));
    // 10 match, skip 1 reference base, 15 match. Starts at 1-based 20.
    const delSeq = refSeq.slice(19, 29) + refSeq.slice(30, 45);
    add('read_deletion', 20, '10M1D15M', delSeq);
    const insSeq = refSeq.slice(49, 57) + 'AAA' + refSeq.slice(57, 69);
    add('read_insertion', 50, '8M3I12M', insSeq);
    add('read_reverse', 70, '20M', revcomp(refSeq.slice(69, 89)), 16);

    let text = '@HD\tVN:1.6\tSO:coordinate\n';
    text += '@SQ\tSN:synth_ref\tLN:' + refSeq.length + '\n';
    text += '@PG\tID:synthetic\tPN:viewalign-synth\n';
    for (const r of reads) {
        const qual = 'I'.repeat(r.seq.length);
        text += [r.qname, r.flag, 'synth_ref', r.pos1, 60, r.cigar, '*', 0, 0, r.seq, qual].join('\t') + '\n';
    }
    return { text, reads };
}

const BASE_NYBBLE = { '=':0, A:1, C:2, M:3, G:4, R:5, S:6, V:7, T:8, W:9, Y:10, H:11, K:12, D:13, B:14, N:15 };
const CIGAR_OP = { M:0, I:1, D:2, N:3, S:4, H:5, P:6, '=':7, X:8 };

function reg2bin(beg, end) {
    end -= 1;
    if ((beg >> 14) === (end >> 14)) return (((1 << 15) - 1) / 7 | 0) + (beg >> 14);
    if ((beg >> 17) === (end >> 17)) return (((1 << 12) - 1) / 7 | 0) + (beg >> 17);
    if ((beg >> 20) === (end >> 20)) return (((1 << 9) - 1) / 7 | 0) + (beg >> 20);
    if ((beg >> 23) === (end >> 23)) return (((1 << 6) - 1) / 7 | 0) + (beg >> 23);
    if ((beg >> 26) === (end >> 26)) return (((1 << 3) - 1) / 7 | 0) + (beg >> 26);
    return 0;
}

function bamBuffer(headerText, refName, refLen, reads) {
    const chunks = [];
    const u8 = (n) => chunks.push(Buffer.from([n & 255]));
    const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); chunks.push(b); };
    const i32 = (n) => { const b = Buffer.alloc(4); b.writeInt32LE(n); chunks.push(b); };
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); chunks.push(b); };
    const raw = (buf) => chunks.push(buf);

    raw(Buffer.from('BAM\x01'));
    const header = Buffer.from(headerText, 'utf8');
    i32(header.length);
    raw(header);
    i32(1);
    const name = Buffer.from(refName + '\0');
    i32(name.length);
    raw(name);
    i32(refLen);

    for (const r of reads) {
        const qname = Buffer.from(r.qname + '\0');
        const ops = r.cigar.match(/\d+[MIDNSHP=X]/g);
        const cigar = Buffer.alloc(ops.length * 4);
        ops.forEach((op, i) => {
            const len = parseInt(op, 10);
            const code = CIGAR_OP[op[op.length - 1]];
            cigar.writeUInt32LE((len << 4) | code, i * 4);
        });
        const seqBytes = Buffer.alloc(Math.ceil(r.seq.length / 2));
        for (let i = 0; i < r.seq.length; i += 2) {
            const hi = BASE_NYBBLE[r.seq[i]] ?? 15;
            const lo = i + 1 < r.seq.length ? (BASE_NYBBLE[r.seq[i + 1]] ?? 15) : 0;
            seqBytes[i / 2] = (hi << 4) | lo;
        }
        const qual = Buffer.alloc(r.seq.length, 40);
        const pos0 = r.pos1 - 1;
        const refSpan = ops.reduce((n, op) => n + ('MDN=X'.includes(op[op.length - 1]) ? parseInt(op, 10) : 0), 0);
        const bodyLen = 32 + qname.length + cigar.length + seqBytes.length + qual.length;
        // block_size excludes itself
        const coreAndRest = bodyLen;
        i32(coreAndRest);
        i32(0); // refID
        i32(pos0);
        u8(qname.length);
        u8(60); // mapq
        u16(reg2bin(pos0, pos0 + Math.max(refSpan, 1)));
        u16(ops.length);
        u16(r.flag);
        i32(r.seq.length);
        i32(-1); // next ref
        i32(-1); // next pos
        i32(0);  // tlen
        raw(qname);
        raw(cigar);
        raw(seqBytes);
        raw(qual);
    }
    return Buffer.concat(chunks);
}

function bgzf(uncompressed) {
    const members = [];
    const block = (data) => {
        const deflated = zlib.deflateRawSync(data, { level: 6 });
        const headerLen = 18;
        const trailerLen = 8;
        const bsize = headerLen + deflated.length + trailerLen;
        const header = Buffer.alloc(headerLen);
        header.writeUInt16LE(0x8b1f, 0);
        header[2] = 8;
        header[3] = 4; // FEXTRA
        header[8] = 0;
        header[9] = 255;
        header.writeUInt16LE(6, 10); // XLEN
        header[12] = 66; // B
        header[13] = 67; // C
        header.writeUInt16LE(2, 14); // SLEN
        header.writeUInt16LE(bsize - 1, 16);
        const trailer = Buffer.alloc(8);
        trailer.writeUInt32LE(zlib.crc32(data), 0);
        trailer.writeUInt32LE(data.length >>> 0, 4);
        return Buffer.concat([header, deflated, trailer]);
    };
    const MAX = 65000;
    for (let i = 0; i < uncompressed.length; i += MAX) {
        members.push(block(uncompressed.subarray(i, i + MAX)));
    }
    members.push(block(Buffer.alloc(0)));
    return Buffer.concat(members);
}

function write(name, contents) {
    fs.writeFileSync(path.join(OUT, name), contents);
    return name;
}

fs.mkdirSync(OUT, { recursive: true });
const files = [];
files.push(write('synth_msa.fa', fasta(rows)));
files.push(write('synth_msa.aln', clustal(rows)));
files.push(write('synth_msa.phy', phylipSequential(rows)));
files.push(write('synth_msa.interleaved.phy', phylipInterleaved(rows)));
files.push(write('synth_msa.nex', nexus(rows)));
files.push(write('synth_msa.sto', stockholm(rows)));
files.push(write('synth_msa.msf', msf(rows)));
files.push(write('synth_ref.gb', genbank(ref)));
files.push(write('synth_ref.fa', fasta([['synth_ref', ref]])));
files.push(write('synth_protein.fa', fasta(protein)));
files.push(write('synth_dotplot.fa', fasta([['seq_early', dotA], ['seq_late', dotB]])));

const sam = samReads(ref);
files.push(write('synth_reads.sam', sam.text));
const headerText = sam.text.split('\n').filter(l => l.startsWith('@')).join('\n') + '\n';
const bam = bgzf(bamBuffer(headerText, 'synth_ref', ref.length, sam.reads));
files.push(write('synth_reads.bam', bam));

const key = {
    alignmentLength: alnLen,
    sequences: rows.map(([n]) => n),
    cdsColumns: [1, 60],
    referenceTranslation: protein[0][1],
    synonymous: 'alpha_syn codon 3 CTG->TTG, both leucine',
    nonsynonymous: 'alpha_mis codon 2 GCA->GAA, alanine to glutamate',
    prematureStop: 'beta_stop codon 10 TAC->TAA',
    frameshift: 'beta_fs 1-base gap at column 5 (1-based)',
    inFrameGap: 'beta_del deletes codon 7 GGC, a 3-base gap',
    clusterBarcode: 'columns 61-72, alpha AAAAAACCCCCC, beta GGGGGGTTTTTT',
    gattacaColumns0: gattaca,
    invertedRepeatColumn0: revGattaca,
    ecoRIColumn0: eco,
    bamHIColumn0: bamhi,
    dotplot: {
        self: 'GATTACA occurs twice in every MSA row; TGTAATC is its reverse complement',
        pair: 'synth_dotplot.fa seq_early vs seq_late: ACGT repeat is at the end of seq_early and the start of seq_late'
    },
    reads: sam.reads.map(r => ({ name: r.qname, pos: r.pos1, cigar: r.cigar, flag: r.flag }))
};
files.push(write('synth_key.json', JSON.stringify(key, null, 2) + '\n'));

const readme = `# Synthetic test alignments

Small files for checking format detection, codon marks, dot plots, restriction sites, clustering, and read tracks. They are invented sequences, not biological data.

The alignment is ${rows.length} sequences by ${alnLen} columns. Columns 1–60 are a coding sequence (length divisible by 3). Columns 61–72 are a barcode that separates two groups of three. The rest is shared: a tandem \`GATTACA\`, its reverse complement \`TGTAATC\`, an EcoRI site, and a BamHI site.

| File | What to open it for |
|---|---|
| \`synth_msa.fa\` | FASTA. Codons, clustering, motifs, shading |
| \`synth_msa.aln\` | Clustal |
| \`synth_msa.phy\` | PHYLIP, sequential |
| \`synth_msa.interleaved.phy\` | PHYLIP, interleaved |
| \`synth_msa.nex\` | NEXUS |
| \`synth_msa.sto\` | Stockholm |
| \`synth_msa.msf\` | MSF |
| \`synth_ref.gb\` | GenBank flatfile of the reference, with a CDS feature on 1..60 |
| \`synth_protein.fa\` | The first three translations. \`alpha_syn\` matches \`alpha_ref\`. \`alpha_mis\` is glutamate where the others are alanine |
| \`synth_dotplot.fa\` | Two sequences. Compare them in the dot plot |
| \`synth_reads.sam\` | Drop this in. The viewer builds a pileup reference from the reads |
| \`synth_reads.bam\` | Same reads as BAM. Open \`synth_ref.fa\` (or \`synth_ref.gb\`) first, then the BAM; the reads pile onto that reference |
| \`synth_ref.fa\` | Ungapped reference. Open it before \`synth_reads.bam\`, or use it to build a CRAM |

## What you should see

Codon analysis, standard genetic code, frame 0 (the reference starts with ATG):

- \`alpha_syn\`: codon 3 is TTG instead of CTG. Both are leucine (synonymous).
- \`alpha_mis\`: codon 2 is GAA instead of GCA. Alanine to glutamate (non-synonymous).
- \`beta_stop\`: codon 10 is TAA, an in-frame stop. The reference codon there is TAC.
- \`beta_fs\`: a one-base gap at column 5. That is a frameshift.
- \`beta_del\`: codon 7 (GGC) is three gaps. The frame is preserved.

Clustering (Min size 3): \`alpha_ref\`, \`alpha_syn\`, and \`alpha_mis\` share columns 61–72 (\`AAAAAACCCCCC\`). The three \`beta_\` rows share \`GGGGGGTTTTTT\` there.

Dot plot, on any row of the MSA, self comparison, word size 6 or 7: two \`GATTACA\` copies. Both-strand comparison also hits \`TGTAATC\`. In \`synth_dotplot.fa\`, \`seq_early\` against \`seq_late\` puts the \`ACGT\` repeat on an off-diagonal.

Motif search: EcoRI \`GAATTC\` starts at column ${eco + 1}. BamHI \`GGATCC\` starts at column ${bamhi + 1}.

Reads in \`synth_reads.sam\`: two overlapping perfect reads, one mismatch at the non-synonymous site, one single-base deletion, one three-base insertion, and one reverse-strand read.

## CRAM

samtools is not required to read the SAM file. To make a CRAM for the server path:

\`\`\`
samtools view -C -T synth_ref.fa -o synth_reads.cram synth_reads.bam
\`\`\`
`;
files.push(write('README.md', readme));

console.log('wrote', files.join(', '));
console.log('length', alnLen, 'translation', protein[0][1]);
console.log('EcoRI', eco + 1, 'BamHI', bamhi + 1, 'GATTACA', gattaca.map(i => i + 1).join(','));

module.exports = { OUT, rows, ref, alnLen, sam };
