/**
 * bam-parser.js — Zero-dependency BAM file parser for the browser.
 *
 * Uses the browser's built-in DecompressionStream to handle BGZF (concatenated
 * gzip), then parses the BAM binary format per the SAM/BAM specification
 * (https://samtools.github.io/hts-specs/SAMv1.pdf, §4.2).
 *
 * No npm dependencies. No build step. No server required.
 *
 * Reference:
 *   Li H, Handsaker B, Wysoker A, et al. (2009) The Sequence Alignment/Map
 *   format and SAMtools. Bioinformatics 25(16):2078-2079.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const BAM_MAGIC = 0x014D4142; // "BAM\1" as read by getUint32(0, /*littleEndian=*/true)
const MAX_READS = 1000;
const SEQ_DECODE = '=ACMGRSVTWYHKDBN'; // 4-bit → IUPAC base (0==, 1=A, 2=C, 4=G, 8=T...)
const CIGAR_OPS = 'MIDNSHP=X';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Decompress a BAM file (BGZF = concatenated gzip) into a Uint8Array.
 * Uses the browser's built-in DecompressionStream — no external libraries.
 */
async function decompressBAM(file) {
    const ds = new DecompressionStream('gzip');
    const stream = file.stream().pipeThrough(ds);
    const response = new Response(stream);
    const buf = await response.arrayBuffer();
    return new Uint8Array(buf);
}

/**
 * Parse a BAM header from a decompressed buffer.
 * Returns { headerText, refNames[], refLengths[], headerEndOffset }.
 */
function parseBAMHeader(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    if (dv.getUint32(0, true) !== BAM_MAGIC) {
        throw new Error('Not a valid BAM file (bad magic number)');
    }

    const l_text = dv.getUint32(4, true);
    const headerText = new TextDecoder().decode(buf.subarray(8, 8 + l_text));

    let off = 8 + l_text;
    const n_ref = dv.getUint32(off, true);
    off += 4;

    const refNames = [];
    const refLengths = [];

    for (let i = 0; i < n_ref; i++) {
        const nameLen = dv.getUint32(off, true);
        off += 4;
        const name = new TextDecoder().decode(buf.subarray(off, off + nameLen - 1)); // -1 for null terminator
        off += nameLen;
        const refLen = dv.getUint32(off, true);
        off += 4;
        refNames.push(name);
        refLengths.push(refLen);
    }

    return { headerText, refNames, refLengths, headerEndOffset: off };
}

/**
 * Parse a single BAM alignment record from a decompressed buffer at a given offset.
 * Returns { record, nextOffset } or null if at end.
 *
 * Each record (BAM spec §4.2):
 *   block_size (int32) — total size of this record's data (excluding this field)
 *   refID, pos, l_read_name, mapq, bin, n_cigar_op, flag, l_seq (core fields)
 *   next_refID, next_pos, tlen
 *   read_name, cigar, seq, qual, tags
 */
function parseBAMRecord(buf, offset) {
    if (offset + 4 > buf.length) return null;

    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const blockSize = dv.getUint32(offset, true);
    if (blockSize === 0 || offset + 4 + blockSize > buf.length) return null;

    let pos = offset + 4;
    const refID   = dv.getInt32(pos, true);  pos += 4;
    const rpos    = dv.getInt32(pos, true);  pos += 4;
    const lName   = dv.getUint8(pos);        pos += 1;
    const mapq    = dv.getUint8(pos);        pos += 1;
    const bin     = dv.getUint16(pos, true); pos += 2; // eslint-disable-line
    const nCigar  = dv.getUint16(pos, true); pos += 2;
    const flag    = dv.getUint16(pos, true); pos += 2;
    const lSeq    = dv.getUint32(pos, true); pos += 4;
    const nextRef = dv.getInt32(pos, true);  pos += 4;
    const nextPos = dv.getInt32(pos, true);  pos += 4;
    const tlen    = dv.getInt32(pos, true);  pos += 4;

    // Read name
    const name = new TextDecoder().decode(buf.subarray(pos, pos + lName - 1)); // -1 for null
    pos += lName;

    // CIGAR
    const cigarOps = [];
    for (let i = 0; i < nCigar; i++) {
        const cigRaw = dv.getUint32(pos, true); pos += 4;
        cigarOps.push({ len: cigRaw >> 4, op: CIGAR_OPS[cigRaw & 0xF] });
    }

    // Sequence (4-bit encoded: 2 bases per byte, high nibble first)
    let seq = '';
    const seqBytes = (lSeq + 1) >> 1;
    for (let i = 0; i < lSeq; i++) {
        const byte = buf[pos + (i >> 1)];
        const nibble = (i & 1) ? (byte & 0x0F) : (byte >> 4);
        seq += SEQ_DECODE[nibble] || 'N';
    }
    pos += seqBytes;

    // Quality scores (Phred + 33 offset)
    let qual = '';
    if (lSeq > 0 && buf[pos] !== 0xFF) {
        // '*' in SAM means missing quality; BAM encodes this as 0xFF
        // If the first byte is 0xFF, omit qual string
        for (let i = 0; i < lSeq; i++) {
            qual += String.fromCharCode(buf[pos + i] + 33);
        }
    }
    pos += lSeq;

    // Optional tags (remaining bytes in block)
    const tags = {};
    const tagEnd = offset + 4 + blockSize;
    while (pos + 2 < tagEnd) {
        const tag = String.fromCharCode(buf[pos], buf[pos + 1]);
        pos += 2;
        const type = String.fromCharCode(buf[pos]); pos += 1;

        switch (type) {
            case 'A': tags[tag] = String.fromCharCode(buf[pos]); pos += 1; break;
            case 'i': case 'I': {
                let val = 0;
                if (type === 'i') {
                    val = dv.getInt32(pos, true); pos += 4;
                } else {
                    val = dv.getUint32(pos, true); pos += 4;
                }
                tags[tag] = val;
                break;
            }
            case 'f': tags[tag] = dv.getFloat32(pos, true); pos += 4; break;
            case 'Z': case 'H': {
                let end = pos;
                while (end < tagEnd && buf[end] !== 0) end++;
                tags[tag] = new TextDecoder().decode(buf.subarray(pos, end));
                pos = end + 1;
                break;
            }
            case 'B': {
                const btype = String.fromCharCode(buf[pos]); pos += 1;
                const count = dv.getUint32(pos, true); pos += 4;
                const arr = [];
                for (let j = 0; j < count; j++) {
                    switch (btype) {
                        case 'c': arr.push(dv.getInt8(pos)); pos += 1; break;
                        case 'C': arr.push(dv.getUint8(pos)); pos += 1; break;
                        case 's': arr.push(dv.getInt16(pos, true)); pos += 2; break;
                        case 'S': arr.push(dv.getUint16(pos, true)); pos += 2; break;
                        case 'i': arr.push(dv.getInt32(pos, true)); pos += 4; break;
                        case 'I': arr.push(dv.getUint32(pos, true)); pos += 4; break;
                        case 'f': arr.push(dv.getFloat32(pos, true)); pos += 4; break;
                        default: pos += count * 4; break;
                    }
                }
                tags[tag] = arr;
                break;
            }
            default:
                // Unknown tag type — skip the rest of the block to be safe
                pos = tagEnd;
                break;
        }
    }

    return {
        record: {
            name,
            refID,
            pos: rpos,         // 0-based leftmost coordinate
            mapq,
            flag,
            seq,
            qual,
            cigar: cigarOps,
            tlen,
            next_refID: nextRef,
            next_pos: nextPos,
            tags,
        },
        nextOffset: tagEnd,
    };
}

/**
 * Parse all alignment records from a decompressed BAM buffer.
 * Stops at MAX_READS + 1 to enforce the read limit.
 *
 * Returns { records[], exceededLimit: bool, totalReads: number }
 */
function parseBAMRecords(buf, headerEndOffset) {
    const records = [];
    let offset = headerEndOffset;
    let totalReads = 0;
    let exceededLimit = false;

    while (offset < buf.length) {
        totalReads++;
        if (totalReads > MAX_READS) {
            exceededLimit = true;
            break;
        }

        const result = parseBAMRecord(buf, offset);
        if (!result) break;

        records.push(result.record);
        offset = result.nextOffset;
    }

    return { records, exceededLimit, totalReads };
}

/**
 * Expand a CIGAR array into a display string showing how the read aligns
 * to the reference. Returns an array of { type, base, refBase } triples.
 *
 * readPos is the index into the read sequence.
 * The returned array represents aligned columns ready for rendering.
 */
function expandCigar(read, refBaseFn) {
    const columns = [];
    let readPos = 0;
    let refPos = read.pos;

    for (const op of read.cigar) {
        switch (op.op) {
            case 'M':
            case '=':
            case 'X':
                // Match/mismatch: read base vs reference base
                for (let i = 0; i < op.len; i++) {
                    const base = read.seq[readPos + i] || 'N';
                    const refBase = refBaseFn(refPos + i);
                    columns.push({
                        type: (op.op === '=') ? 'match' : (op.op === 'X') ? 'mismatch' : (base === refBase ? 'match' : 'mismatch'),
                        base,
                        refBase,
                        readPos: readPos + i,
                    });
                }
                readPos += op.len;
                refPos += op.len;
                break;

            case 'I':
                // Insertion: bases in read, no reference counterpart
                for (let i = 0; i < op.len; i++) {
                    columns.push({
                        type: 'insertion',
                        base: read.seq[readPos + i] || 'N',
                        refBase: null,
                        readPos: readPos + i,
                    });
                }
                readPos += op.len;
                break;

            case 'D':
                // Deletion: bases in reference, gap in read
                for (let i = 0; i < op.len; i++) {
                    columns.push({
                        type: 'deletion',
                        base: '-',
                        refBase: refBaseFn(refPos + i),
                        readPos: -1,
                    });
                }
                refPos += op.len;
                break;

            case 'N':
                // Splice junction / intron: skip in both
                for (let i = 0; i < op.len; i++) {
                    columns.push({
                        type: 'intron',
                        base: '\u2026', // …
                        refBase: refBaseFn(refPos + i),
                        readPos: -1,
                    });
                }
                refPos += op.len;
                break;

            case 'S':
                // Soft clip: bases in read, before/after alignment
                for (let i = 0; i < op.len; i++) {
                    columns.push({
                        type: 'softclip',
                        base: read.seq[readPos + i] || 'N',
                        refBase: null,
                        readPos: readPos + i,
                    });
                }
                readPos += op.len;
                break;

            case 'H':
                // Hard clip: not present in SEQ
                break;

            case 'P':
                // Padding: silent deletion from padded SAM
                break;
        }
    }
    return columns;
}

/**
 * CIGAR to compact string (e.g., "150M").
 */
function cigarToString(cigar) {
    return cigar.map(op => op.len + op.op).join('');
}

/**
 * Check if BAM references match loaded sequences.
 * Returns { matchedRef: string|null, warnings: string[] }
 */
function checkRefMatch(bamRefNames, bamRefLengths, loadedSeqs) {
    const loadedNames = new Set(loadedSeqs.map(s => s.name));
    const warnings = [];
    let matchedRef = null;

    for (let i = 0; i < bamRefNames.length; i++) {
        const name = bamRefNames[i];
        if (loadedNames.has(name)) {
            matchedRef = name;
            // Check length
            const loadedSeq = loadedSeqs.find(s => s.name === name);
            if (loadedSeq && bamRefLengths[i] !== loadedSeq.seq.length) {
                warnings.push(
                    `Reference length mismatch for "${name}": ` +
                    `BAM header says ${bamRefLengths[i].toLocaleString()} bp, ` +
                    `loaded FASTA is ${loadedSeq.seq.length.toLocaleString()} bp.`
                );
            }
            break;
        }
    }

    if (!matchedRef) {
        warnings.push(
            `No matching reference found. BAM references: [${bamRefNames.join(', ')}]. ` +
            `Loaded sequences: [${loadedSeqs.map(s => s.name).join(', ')}].`
        );
    }

    return { matchedRef, warnings };
}

// ── Export for use in script.js (global scope) ───────────────────────────────

window.BamParser = {
    decompressBAM,
    parseBAMHeader,
    parseBAMRecord,
    parseBAMRecords,
    expandCigar,
    cigarToString,
    checkRefMatch,
    MAX_READS,
};
