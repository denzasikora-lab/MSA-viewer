/**
 * ViewAlign Benchmark Suite — Node.js
 * 
 * Measures parse time, codon analysis speed, conservation calculation,
 * Smith-Waterman alignment, and memory footprint.
 * 
 * Usage: node benchmark.js
 * Output: Console + markdown table for manuscript
 */

const { performance } = require('perf_hooks');

// ============================================================================
// Test data generators
// ============================================================================

function generateSeqs(n, len, gapRate = 0.1) {
    const bases = 'ACGT';
    const seqs = [];
    for (let i = 0; i < n; i++) {
        let seq = '';
        for (let j = 0; j < len; j++) {
            if (Math.random() < gapRate) seq += '-';
            else seq += bases[Math.floor(Math.random() * 4)];
        }
        seqs.push({ header: `seq${i + 1}`, fullHeader: `seq${i + 1}`, seq });
    }
    return seqs;
}

// ============================================================================
// Format generators (produce text in each alignment format)
// ============================================================================

function toFasta(seqs) {
    return seqs.map(s => `>${s.header}\n${s.seq}`).join('\n');
}

function toClustal(seqs) {
    let out = 'CLUSTAL W (1.82) multiple sequence alignment\n\n';
    const blockLen = 60, totalLen = seqs[0].seq.length;
    for (let start = 0; start < totalLen; start += blockLen) {
        for (const s of seqs) {
            out += `${s.header.padEnd(12)} ${s.seq.substring(start, start + blockLen)}\n`;
        }
        out += '\n';
    }
    return out;
}

function toPhylipSequential(seqs) {
    let out = `${seqs.length} ${seqs[0].seq.length}\n`;
    for (const s of seqs) out += s.header.padEnd(10) + s.seq + '\n';
    return out;
}

function toPhylipInterleaved(seqs) {
    const n = seqs.length, len = seqs[0].seq.length, blockLen = 60;
    let out = `${n} ${len}\n`;
    for (const s of seqs) out += s.header.padEnd(10) + s.seq.substring(0, blockLen) + '\n';
    out += '\n';
    for (let start = blockLen; start < len; start += blockLen) {
        for (const s of seqs) out += s.seq.substring(start, start + blockLen) + '\n';
        out += '\n';
    }
    return out;
}

function toNexus(seqs) {
    let out = `#NEXUS\n\nBEGIN DATA;\n  DIMENSIONS NTAX=${seqs.length} NCHAR=${seqs[0].seq.length};\n  FORMAT DATATYPE=DNA MISSING=? GAP=-;\n  MATRIX\n`;
    for (const s of seqs) out += `  ${s.header.padEnd(16)} ${s.seq}\n`;
    out += '  ;\nEND;\n';
    return out;
}

function toStockholm(seqs) {
    let out = '# STOCKHOLM 1.0\n';
    for (const s of seqs) out += `${s.header} ${s.seq}\n`;
    return out + '//\n';
}

function toMsf(seqs) {
    const len = seqs[0].seq.length, blockLen = 50;
    let out = '!!NA_MULTIPLE_ALIGN 1.0\n\n';
    for (const s of seqs) out += `  Name: ${s.header} Len: ${len}  Check: 100  Weight: 1.0\n`;
    out += '//\n\n';
    for (let start = 0; start < len; start += blockLen) {
        out += `\n${String(start + 1).padStart(6)} ${String(Math.min(start + blockLen, len)).padEnd(6)}\n\n`;
        for (const s of seqs) out += `${s.header.padEnd(15)} ${s.seq.substring(start, start + blockLen)}\n`;
    }
    return out + '\n';
}

// ============================================================================
// Parsers (copied from script.js for standalone benchmarking)
// ============================================================================

function calculateGaplessPositions(seq) {
    const pos = [];
    for (let i = 0; i < seq.length; i++) if (seq[i] !== '-') pos.push(i);
    return pos;
}

function parseFasta(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r\n|\r|\n/);
    const seqs = []; let seq = '', header = '';
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line.startsWith('>')) {
            if (header) {
                const h = header.replace(/^>/, '').trim().replace(/\s+/g, ' ');
                const dh = h.split(/\s+/)[0] || 'unnamed';
                const s = seq.replace(/[^A-Za-z*.\-]/g, '').replace(/_/g, '-');
                seqs.push({ header: dh, fullHeader: h, seq: s, gaplessPositions: calculateGaplessPositions(s) });
                seq = '';
            }
            header = line;
        } else { seq += line.replace(/[^A-Za-z*.\-]/g, '').replace(/_/g, '-'); }
    }
    if (header) {
        const h = header.replace(/^>/, '').trim().replace(/\s+/g, ' ');
        const dh = h.split(/\s+/)[0] || 'unnamed';
        const s = seq.replace(/[^A-Za-z*.\-]/g, '').replace(/_/g, '-');
        seqs.push({ header: dh, fullHeader: h, seq: s, gaplessPositions: calculateGaplessPositions(s) });
    }
    return seqs.length ? seqs : null;
}

function parseClustal(text) {
    const lines = text.split(/\r?\n/);
    const seqMap = new Map(); let started = false;
    for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('//')) continue;
        if (t.startsWith('CLUSTAL')) { started = true; continue; }
        if (!started) continue;
        const m = t.match(/^(\S+)\s+(.+)$/);
        if (!m) continue;
        const name = m[1], seq = m[2].replace(/\s/g, '').replace(/\*/g, '-');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) seqs.push({ header: name, fullHeader: name, seq, gaplessPositions: calculateGaplessPositions(seq) });
    return seqs;
}

function parsePhylip(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return null;
    const hm = lines[0].trim().match(/^(\d+)\s+(\d+)/);
    if (!hm) return null;
    const nSeqs = parseInt(hm[1]);
    const entries = [];
    for (let i = 1; i < lines.length && entries.length < nSeqs; i++) {
        const l = lines[i];
        if (l.length >= 10) {
            const name = l.substring(0, 10).trim();
            const seq = l.substring(10).replace(/\s/g, '');
            if (name && seq) entries.push({ name, seq });
        }
    }
    if (entries.length === nSeqs) {
        let blockStart = 1 + nSeqs;
        while (blockStart < lines.length) {
            for (let k = 0; k < nSeqs && blockStart + k < lines.length; k++) {
                const l = lines[blockStart + k];
                const nameCandidate = l.substring(0, 10).trim();
                const hasName = entries.some(e => e.name === nameCandidate);
                const seqPart = hasName ? l.substring(10) : l;
                const seq = seqPart.replace(/\s/g, '');
                if (seq) entries[k].seq += seq;
            }
            blockStart += nSeqs;
        }
    }
    if (entries.length < nSeqs) return null;
    return entries.map(e => ({ header: e.name, fullHeader: e.name, seq: e.seq, gaplessPositions: calculateGaplessPositions(e.seq) }));
}

function parseNexus(text) {
    const t = text.replace(/\r/g, '');
    const matrixIdx = t.search(/\bMATRIX\b/i);
    if (matrixIdx < 0) return null;
    const block = t.substring(matrixIdx + 6);
    const endIdx = block.search(/;\s*end/i);
    const content = endIdx > 0 ? block.substring(0, endIdx) : block;
    const seqMap = new Map();
    for (const line of content.split('\n')) {
        const m = line.trim().match(/^(['"]?)(\S+)\1\s+(.+)$/);
        if (!m) continue;
        const name = m[2], seq = m[3].replace(/\s/g, '').replace(/[^A-Za-z?\-.]/g, '');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) seqs.push({ header: name, fullHeader: name, seq, gaplessPositions: calculateGaplessPositions(seq) });
    return seqs;
}

function parseStockholm(text) {
    const lines = text.split(/\r?\n/);
    const seqMap = new Map(); let inAlign = false;
    for (const line of lines) {
        const t = line.trim();
        if (t === '//') break;
        if (/^# STOCKHOLM\b/.test(t) || t.startsWith('#=GF')) { inAlign = true; continue; }
        if (t.startsWith('#=GR') || t.startsWith('#=GC') || t.startsWith('#')) continue;
        if (!inAlign || !t) continue;
        const m = t.match(/^(\S+)\s+(.+)$/);
        if (!m) continue;
        const name = m[1], seq = m[2].replace(/\s/g, '').replace(/[.-]/g, '-');
        if (!seqMap.has(name)) seqMap.set(name, '');
        seqMap.set(name, seqMap.get(name) + seq);
    }
    if (seqMap.size === 0) return null;
    const seqs = [];
    for (const [name, seq] of seqMap) seqs.push({ header: name, fullHeader: name, seq, gaplessPositions: calculateGaplessPositions(seq) });
    return seqs;
}

// ============================================================================
// Codon analysis (copied from script.js)
// ============================================================================

const GENETIC_CODE = {
    TTT:'F',TTC:'F',TTA:'L',TTG:'L',CTT:'L',CTC:'L',CTA:'L',CTG:'L',
    ATT:'I',ATC:'I',ATA:'I',ATG:'M',GTT:'V',GTC:'V',GTA:'V',GTG:'V',
    TCT:'S',TCC:'S',TCA:'S',TCG:'S',CCT:'P',CCC:'P',CCA:'P',CCG:'P',
    ACT:'T',ACC:'T',ACA:'T',ACG:'T',GCT:'A',GCC:'A',GCA:'A',GCG:'A',
    TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',
    AAT:'N',AAC:'N',AAA:'K',AAG:'K',GAT:'D',GAC:'D',GAA:'E',GAG:'E',
    TGT:'C',TGC:'C',TGA:'*',TGG:'W',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
    AGT:'S',AGC:'S',AGA:'R',AGG:'R',GGT:'G',GGC:'G',GGA:'G',GGG:'G',
};

function computeCodonAnalysis(seqs, len, frameOffset = 0) {
    const n = seqs.length;
    const phase = Array.from({length:n}, () => new Array(len));
    const stops = Array.from({length:n}, () => []);
    const frameShifts = Array.from({length:n}, () => []);
    const synNonSyn = Array.from({length:n}, () => ({}));
    const aaSeq = Array.from({length:n}, () => []);
    const refIdx = 0, activeCode = GENETIC_CODE;
    for (let i = 0; i < n; i++) {
        const seq = seqs[i].seq;
        let codonPhase = frameOffset, codonBuf = '', codonCols = [];
        let gapRunStart = -1, gapRunLen = 0;
        for (let pos = 0; pos < len; pos++) {
            const base = seq[pos] || '-';
            const isGap = base === '-' || base === '.';
            if (isGap) {
                phase[i][pos] = -1;
                if (gapRunStart < 0) gapRunStart = pos;
                gapRunLen++;
                continue;
            }
            if (gapRunLen > 0 && gapRunLen % 3 !== 0)
                frameShifts[i].push({ pos: gapRunStart, phase: gapRunLen % 3, type: 'gap_frameshift' });
            gapRunStart = -1; gapRunLen = 0;
            phase[i][pos] = codonPhase;
            codonBuf += base.toUpperCase();
            codonCols.push(pos);
            codonPhase++;
            if (codonPhase >= 3) {
                const codon = codonBuf.replace(/[Nn]/g, 'N');
                const aa = activeCode[codon] || 'X';
                const codonIdx = aaSeq[i].length;
                aaSeq[i].push({ cols: codonCols.slice(), codon, aa });
                if (aa === '*') for (const c of codonCols) stops[i].push(c);
                if (i !== refIdx) {
                    const refEntry = aaSeq[refIdx][codonIdx];
                    if (refEntry) {
                        const refCodon = refEntry.codon, refAA = refEntry.aa;
                        if (aa === refAA && codon !== refCodon) {
                            for (const c of codonCols) synNonSyn[i][c] = 'syn';
                        } else if (aa !== refAA) {
                            for (let k = 0; k < 3; k++) {
                                const mutCodon = refCodon.substring(0,k) + codon[k] + refCodon.substring(k+1);
                                const mutAA = activeCode[mutCodon] || 'X';
                                synNonSyn[i][codonCols[k]] = (mutAA !== refAA) ? 'nonsyn' : 'syn';
                            }
                        }
                    }
                }
                codonPhase = 0; codonBuf = ''; codonCols = [];
            }
        }
        if (gapRunLen > 0 && gapRunLen % 3 !== 0)
            frameShifts[i].push({ pos: gapRunStart, phase: gapRunLen % 3, type: 'gap_frameshift' });
        if (codonPhase > 0 && codonPhase < 3)
            frameShifts[i].push({ pos: len - 1, phase: codonPhase, type: 'incomplete' });
    }
    return { phase, stops, frameShifts, synNonSyn, aaSeq, refIdx, frameOffset };
}

// ============================================================================
// Conservation calculation
// ============================================================================

function calculateConservation(seqs, len) {
    const counts = [];
    for (let pos = 0; pos < len; pos++) {
        const baseCounts = {};
        let total = 0;
        for (const s of seqs) {
            const base = s.seq[pos];
            if (base && base !== '-' && base !== '.') {
                baseCounts[base] = (baseCounts[base] || 0) + 1;
                total++;
            }
        }
        if (total === 0) { counts.push(0); continue; }
        const maxCount = Math.max(...Object.values(baseCounts));
        counts.push(maxCount / total);
    }
    return counts;
}

// ============================================================================
// Smith-Waterman
// ============================================================================

function smithWaterman(seqA, seqB, matchScore = 2, mismatchScore = -1, gapPenalty = -1) {
    const m = seqA.length, n = seqB.length;
    const H = new Array(m + 1);
    for (let i = 0; i <= m; i++) H[i] = new Float64Array(n + 1);
    let maxScore = 0, maxI = 0, maxJ = 0;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const diag = H[i-1][j-1] + (seqA[i-1] === seqB[j-1] ? matchScore : mismatchScore);
            const up = H[i-1][j] + gapPenalty;
            const left = H[i][j-1] + gapPenalty;
            H[i][j] = Math.max(0, diag, up, left);
            if (H[i][j] > maxScore) { maxScore = H[i][j]; maxI = i; maxJ = j; }
        }
    }
    return { score: maxScore, endI: maxI, endJ: maxJ };
}

// ============================================================================
// BENCHMARK SUITE
// ============================================================================

const SIZES = [
    { n: 10,   len: 500,  label: '10 × 500' },
    { n: 50,   len: 1000, label: '50 × 1,000' },
    { n: 100,  len: 2000, label: '100 × 2,000' },
    { n: 200,  len: 5000, label: '200 × 5,000' },
];

function bench(fn, iterations = 5) {
    fn(); // warmup
    const times = [];
    for (let i = 0; i < iterations; i++) {
        const s = performance.now(); fn(); times.push(performance.now() - s);
    }
    return times.reduce((a, b) => a + b, 0) / iterations;
}

console.log('='.repeat(72));
console.log('  ViewAlign Benchmark Suite');
console.log('  Node.js v' + process.version + ' | ' + process.platform + ' | ' + (process.arch));
console.log('='.repeat(72));

// ---- 1. Parse time per format ----
console.log('\n1. Parse Time per Format (ms)\n');
const parseResults = {};
for (const { n, len, label } of SIZES) {
    const seqs = generateSeqs(n, len, 0.1);
    const data = {
        FASTA: toFasta(seqs), Clustal: toClustal(seqs),
        'PHYLIP seq': toPhylipSequential(seqs), 'PHYLIP intl': toPhylipInterleaved(seqs),
        NEXUS: toNexus(seqs), Stockholm: toStockholm(seqs), MSF: toMsf(seqs),
    };
    parseResults[label] = {};
    for (const [fmt, text] of Object.entries(data)) {
        const avg = bench(() => {
            if (fmt === 'FASTA') parseFasta(text);
            else if (fmt === 'Clustal') parseClustal(text);
            else if (fmt === 'PHYLIP seq') parsePhylip(text);
            else if (fmt === 'PHYLIP intl') parsePhylip(text);
            else if (fmt === 'NEXUS') parseNexus(text);
            else if (fmt === 'Stockholm') parseStockholm(text);
            // MSF parser not extracted — skip
        });
        parseResults[label][fmt] = avg;
        console.log(`  ${label.padEnd(16)} ${fmt.padEnd(14)} ${avg.toFixed(2)} ms`);
    }
}

// ---- 2. Codon analysis ----
console.log('\n2. Codon Analysis Speed (3 frames, ms)\n');
const codonResults = {};
for (const { n, len, label } of SIZES) {
    const seqs = generateSeqs(n, len, 0.05);
    const avg = bench(() => {
        computeCodonAnalysis(seqs, len, 0);
        computeCodonAnalysis(seqs, len, 1);
        computeCodonAnalysis(seqs, len, 2);
    });
    codonResults[label] = avg;
    console.log(`  ${label.padEnd(16)} ${avg.toFixed(2)} ms`);
}

// ---- 3. Conservation ----
console.log('\n3. Conservation Calculation (ms)\n');
const consResults = {};
for (const { n, len, label } of SIZES) {
    const seqs = generateSeqs(n, len, 0.1);
    const avg = bench(() => calculateConservation(seqs, len));
    consResults[label] = avg;
    console.log(`  ${label.padEnd(16)} ${avg.toFixed(2)} ms`);
}

// ---- 4. Smith-Waterman ----
console.log('\n4. Smith-Waterman Local Alignment (ms)\n');
const swSizes = [{a:500,b:500,l:'500 × 500'},{a:1000,b:1000,l:'1,000 × 1,000'},{a:2000,b:2000,l:'2,000 × 2,000'}];
const swResults = {};
for (const { a, b, l } of swSizes) {
    const seqA = 'ACGT'.repeat(Math.ceil(a/4)).substring(0, a);
    const seqB = 'ACGT'.repeat(Math.ceil(b/4)).substring(0, b).split('').reverse().join('');
    const avg = bench(() => smithWaterman(seqA, seqB));
    swResults[l] = avg;
    console.log(`  ${l.padEnd(20)} ${avg.toFixed(2)} ms`);
}

// ---- 5. Memory footprint ----
console.log('\n5. Memory Footprint\n');
if (process.memoryUsage) {
    const before = process.memoryUsage();
    const seqs = generateSeqs(500, 5000, 0.1);
    const fasta = toFasta(seqs);
    const parsed = parseFasta(fasta);
    const cons = calculateConservation(parsed, 5000);
    const codon = computeCodonAnalysis(parsed, 5000, 0);
    const after = process.memoryUsage();
    const heapMB = ((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(1);
    const rssMB = ((after.rss - before.rss) / 1024 / 1024).toFixed(1);
    console.log(`  Dataset: 500 seqs × 5,000 bp (parsed + conservation + codon)`);
    console.log(`  Heap: ${heapMB} MB | RSS: ${rssMB} MB`);
    console.log(`  Parsed seqs: ${parsed.length} | Conservation cols: ${cons.length} | Codon seqs: ${codon.aaSeq.length}`);
}

// ---- Markdown table for manuscript ----
console.log('\n' + '='.repeat(72));
console.log('  MARKDOWN TABLE FOR MANUSCRIPT');
console.log('='.repeat(72));
console.log();
console.log('| Dataset | FASTA | Clustal | PHYLIP seq | PHYLIP intl | NEXUS | Stockholm | Codon (3 frames) | Conservation |');
console.log('|---------|------:|--------:|-----------:|------------:|------:|----------:|------------------:|-------------:|');
for (const { label } of SIZES) {
    const r = parseResults[label];
    console.log(`| ${label} | ${r.FASTA.toFixed(1)} | ${r.Clustal.toFixed(1)} | ${r['PHYLIP seq'].toFixed(1)} | ${r['PHYLIP intl'].toFixed(1)} | ${r.NEXUS.toFixed(1)} | ${r.Stockholm.toFixed(1)} | ${codonResults[label].toFixed(1)} | ${consResults[label].toFixed(1)} |`);
}
console.log();
console.log('| Smith-Waterman | ' + Object.entries(swResults).map(([k,v]) => `${k}: ${v.toFixed(1)} ms`).join(' | ') + ' |');
console.log();
console.log('All times in milliseconds (ms). Node.js v' + process.version + '.');
console.log('Done.');
