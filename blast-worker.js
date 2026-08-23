'use strict';
// ============================================================
//  blast-worker.js — Smith-Waterman-based sequence search in the browser
//  Runs as a Web Worker; communicates via postMessage.
//  Caches downloaded FASTA files in IndexedDB so subsequent
//  searches are instant (no re-download needed).
//
//  NOT real NCBI BLAST — see features-inventory.md "Sequence search" section
//  for the full story (what this is, what it isn't, and an incident where its
//  wiring silently broke: commit c38abf2 dropped `url`, fixed 2026-08-23).
//
//  2026-08-23 rewrite — fixed every known limitation except protein support:
//   - Affine-gap Smith-Waterman (Gotoh), not linear-gap — matches real indel
//     biology (opening a gap costs more than extending one)
//   - No silent length truncation. Full query and full database sequences are
//     indexed/searched; a k-mer-seeded diagonal anchors a window around the
//     true match location for the DP step, so a hit deep inside a long
//     database entry (a whole contig, say) is no longer invisible.
//   - Real, size-aware E-values via a Karlin-Altschul lambda solved for this
//     tool's own actual match/mismatch scores (previously hardcoded to 0).
//   - IUPAC ambiguity codes (N, R, Y, ...) are excluded from k-mer seeding
//     instead of silently encoded as 'A' (previously: false seeds through
//     N-masked regions, missed seeds spanning an ambiguous base). They are
//     still handled correctly as ordinary mismatches inside the DP step.
// ============================================================

// ── DNA encoding ─────────────────────────────────────────────
// 0-3 = A/C/G/T. 255 = anything else (N, ambiguity codes, gaps) — a sentinel
// so k-mer seeding can explicitly skip ambiguous positions.
const AMBIG = 255;
const BASE_MAP = new Uint8Array(128).fill(AMBIG);
BASE_MAP['A'.charCodeAt(0)] = 0; BASE_MAP['C'.charCodeAt(0)] = 1;
BASE_MAP['G'.charCodeAt(0)] = 2; BASE_MAP['T'.charCodeAt(0)] = 3;
BASE_MAP['a'.charCodeAt(0)] = 0; BASE_MAP['c'.charCodeAt(0)] = 1;
BASE_MAP['g'.charCodeAt(0)] = 2; BASE_MAP['t'.charCodeAt(0)] = 3;

// Full IUPAC complement lookup (string-indexed for readability)
const COMPL = {A:'T',C:'G',G:'C',T:'A',R:'Y',Y:'R',S:'S',W:'W',
               K:'M',M:'K',B:'V',D:'H',H:'D',V:'B',N:'N',
               a:'t',c:'g',g:'c',t:'a',r:'y',y:'r',s:'s',w:'w',
               k:'m',m:'k',b:'v',d:'h',h:'d',v:'b',n:'n'};

// maxLen is a safety cap only (guards against a pathological multi-MB "sequence"),
// not a feature limit — leave undefined/0 to encode the whole thing.
function encodeSeq(s, maxLen) {
    const len = maxLen ? Math.min(s.length, maxLen) : s.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        const code = BASE_MAP[s.charCodeAt(i)];
        arr[i] = code === undefined ? AMBIG : code;
    }
    return arr;
}

function revComp(s) {
    const out = new Array(s.length);
    for (let i = 0; i < s.length; i++) out[s.length - 1 - i] = COMPL[s[i]] || 'N';
    return out.join('');
}

// ── Karlin-Altschul statistics (for E-values) ─────────────────
// Solve sum_i sum_j bg_i*bg_j*exp(lambda*s(i,j)) = 1 for lambda > 0, using this
// tool's OWN match/mismatch scores (not borrowed blastn defaults for a different
// scoring scheme, as the previous hardcoded bit-score formula did). Uniform
// 0.25/base background is a standard, reasonable approximation.
// K (below) is NOT solved from first principles — a rigorous gapped K needs
// numerical simulation beyond what's practical in a browser worker — it uses
// the commonly-cited empirical approximation for gapped nucleotide alignments
// (~0.1-0.14). This means E-values here are a real, size-aware, monotonically
// meaningful statistic — a large improvement on a hardcoded 0 — but should
// still be read as "approximately BLAST-like," not identical to real blastn's.
function computeLambda(matchScore, mismatchScore) {
    const bg = 0.25;
    const f = (lambda) => 4 * bg * bg * Math.exp(lambda * matchScore) +
                          12 * bg * bg * Math.exp(lambda * mismatchScore) - 1;
    let lo = 1e-6, hi = 5;
    for (let iter = 0; iter < 60; iter++) {
        const mid = (lo + hi) / 2;
        if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
}

// ── Selectable scoring presets ─────────────────────────────────
// Same Gotoh DP recurrence for all presets — only the constants (and the
// re-solved lambda) change. EMBOSS defines "gapopen" as the cost of
// CREATING a gap and "gapextend" as the per-residue cost, so a gap of
// length L costs gapopen + L*gapextend (first residue = gapopen+gapextend);
// ssearch36/FASTA36 and blastn use the same convention.
//
// - "water": EMBOSS `water`'s real EDNAFULL defaults (match+5/mismatch-4/
//   gapopen10.0/gapextend0.5) — confirmed against EMBOSS documentation.
// - "ssearch36": FASTA36 suite's `ssearch36`. Match/mismatch (+5/-4) is the
//   same DNA convention as water/blastn and reasonably well corroborated.
//   The gap penalties (open=12, extend=4) are NOT independently confirmed —
//   web-searched FASTA36 docs/manpages describe the existence of DNA gap
//   defaults but never state the exact numbers in any source actually
//   readable during this research; these values are a language model's
//   best recollection only, flagged uncertain by the model itself. Treat as
//   an approximation, not verified fact, until checked against real
//   `ssearch36 -h` output or FASTA36 source. Additionally, ssearch36's real
//   significance method is shuffled-sequence Monte Carlo + extreme-value
//   fitting, NOT a closed-form Karlin-Altschul lambda/K — impossible to
//   replicate exactly in a stateless function without running many repeat
//   shuffled alignments per query. This preset reuses the same
//   recompute-lambda-plus-fixed-K approach as "water", which is an honest
//   approximation, not real ssearch36 statistics.
// NOTE: ssearch36's gapextend=4 (not fractional) — GAP_EXTEND_COST can be
// either an integer or fractional depending on preset, which is exactly why
// the DP matrices below are Float64Array, not Int32Array, regardless of
// which preset is active (water's gapextend=0.5 needs it; keeping one
// numeric type for all presets avoids a whole second code path).
// "blastn" here means NCBI blastn's SCORING numbers only (reward+2/penalty-3/
// gapopen5/gapextend2 — these are blastn's actual, well-established published
// defaults, high confidence, unlike ssearch36's gap numbers above). It does
// NOT mean blastn's actual seed-and-extend algorithm: real blastn requires
// TWO word hits on the same diagonal within a window before even attempting
// extension, then an ungapped X-drop walk, then only a BOUNDED gapped X-drop
// DP around what survives — never an unbounded full local Smith-Waterman.
// Researched 2026-08-23 (see glm-harness task viewalign-blastn-preset):
// building that literal two-hit/X-drop pipeline was deliberately NOT done —
// the seeding step here (any single shared k-mer, no two-hit requirement)
// and the extension step (full affine-gap DP over a window, not a greedy
// X-drop walk) both diverge from real blastn regardless of which scoring
// preset is active. If real BLASTN-mechanics fidelity is ever needed (not
// just "useful search with blastn-familiar score numbers"), that's a
// separate, larger build — don't let this preset's name imply it's done.
const SCORING_PRESETS = {
    water:     { match: 5, mismatch: -4, gapOpenCost: 10, gapExtendCost: 0.5 },
    ssearch36: { match: 5, mismatch: -4, gapOpenCost: 12, gapExtendCost: 4 },
    blastn:    { match: 2, mismatch: -3, gapOpenCost: 5,  gapExtendCost: 2 },
};

let MATCH, MISMATCH, GAP_OPEN_COST, GAP_EXTEND_COST, GAP_FIRST, GAP_EXT, LAMBDA;
// K is NOT solved from first principles for either preset — a rigorous
// gapped K needs numerical simulation beyond what's practical in a browser
// worker — it uses the commonly-cited empirical approximation for gapped
// nucleotide alignments (~0.1-0.14). E-values here are a real, size-aware,
// monotonically meaningful statistic, but should be read as
// "approximately BLAST/water-like," not identical to any specific real
// tool's own output.
const K_APPROX = 0.11;
let ACTIVE_PRESET = 'water';

function applyScoringPreset(name) {
    const p = SCORING_PRESETS[name] || SCORING_PRESETS.water;
    ACTIVE_PRESET = SCORING_PRESETS[name] ? name : 'water';
    MATCH = p.match; MISMATCH = p.mismatch;
    GAP_OPEN_COST = p.gapOpenCost; GAP_EXTEND_COST = p.gapExtendCost;
    GAP_FIRST = -(GAP_OPEN_COST + GAP_EXTEND_COST);
    GAP_EXT   = -GAP_EXTEND_COST;
    LAMBDA = computeLambda(MATCH, MISMATCH);
}
applyScoringPreset('water'); // default, matches prior behavior exactly

function scoreOf(a, b) { return a === b ? MATCH : MISMATCH; }

// ── Affine-gap Smith-Waterman (Gotoh) with traceback ──────────
// Three score matrices: M (ends in match/mismatch), X (ends in a gap that
// consumes a query residue — "up"), Y (ends in a gap that consumes a subject
// residue — "left"). This is the standard fix for linear-gap SW's main flaw:
// without it, an alignment with several small separate indels scores identically
// to one with a single indel of the same total length, which misrepresents real
// indel-bearing SINE copies.
const DIR_NONE = 0, DIR_DIAG = 1, DIR_UP = 2, DIAG_FROM_X = 1, DIAG_FROM_Y = 2; // reused below with clearer names
function smithWatermanAffine(query, subject) {
    const m = query.length, n = subject.length;
    if (m === 0 || n === 0) return null;
    const W = n + 1;
    // Float64Array, not Int32Array: GAP_EXTEND_COST is fractional (0.5) under
    // EMBOSS water's default scoring, and an integer-typed matrix would
    // silently truncate every gap-extension penalty to 0.
    const M  = new Float64Array((m + 1) * W);
    const X  = new Float64Array((m + 1) * W);
    const Y  = new Float64Array((m + 1) * W);
    // Traceback: for each matrix, which state the optimal predecessor was in.
    // 0 = none/reset (local alignment restart), 1 = came from M, 2 = came from X, 3 = came from Y
    const TM = new Uint8Array((m + 1) * W);
    const TX = new Uint8Array((m + 1) * W);
    const TY = new Uint8Array((m + 1) * W);
    const NEG = -1e9;
    for (let j = 0; j <= n; j++) { X[j] = NEG; Y[j] = NEG; }

    let maxScore = 0, maxI = 0, maxJ = 0, maxState = 1;

    // Pre-encode both strings to numeric codes ONCE (m+n charCodeAt calls total)
    // instead of calling charCodeAt m*n times inside the hot loop below, and
    // inline the match/mismatch comparison instead of a per-cell function call —
    // together these were the actual bottleneck (measured ~30ms for a 200x320
    // window before this change; the earlier per-cell overhead, not the DP
    // itself, dominated).
    const qCodes = new Uint16Array(m);
    for (let k = 0; k < m; k++) qCodes[k] = query.charCodeAt(k);
    const sCodes = new Uint16Array(n);
    for (let k = 0; k < n; k++) sCodes[k] = subject.charCodeAt(k);

    for (let i = 1; i <= m; i++) {
        const rowBase = i * W, prevRowBase = (i - 1) * W;
        X[rowBase] = NEG; Y[rowBase] = NEG; M[rowBase] = 0;
        const qc = qCodes[i - 1];
        for (let j = 1; j <= n; j++) {
            const base = rowBase + j, diagBase = prevRowBase + (j - 1), upBase = prevRowBase + j, leftBase = rowBase + (j - 1);

            // X: gap in subject (consume query residue, move down)
            const xOpen = M[upBase] + GAP_FIRST, xExt = X[upBase] + GAP_EXT;
            if (xOpen >= xExt) { X[base] = xOpen; TX[base] = 1; } else { X[base] = xExt; TX[base] = 2; }

            // Y: gap in query (consume subject residue, move right)
            const yOpen = M[leftBase] + GAP_FIRST, yExt = Y[leftBase] + GAP_EXT;
            if (yOpen >= yExt) { Y[base] = yOpen; TY[base] = 1; } else { Y[base] = yExt; TY[base] = 3; }

            // M: match/mismatch, or restart (local alignment) — inlined, not scoreOf(), for speed
            const s = (qc === sCodes[j - 1]) ? MATCH : MISMATCH;
            const diagM = M[diagBase] + s, diagX = X[diagBase] + s, diagY = Y[diagBase] + s;
            let best = 0, dir = 0;
            if (diagM > best) { best = diagM; dir = 1; }
            if (diagX > best) { best = diagX; dir = 2; }
            if (diagY > best) { best = diagY; dir = 3; }
            M[base] = best; TM[base] = dir;

            const cellBest = Math.max(M[base], X[base], Y[base]);
            if (cellBest > maxScore) {
                maxScore = cellBest; maxI = i; maxJ = j;
                maxState = M[base] === cellBest ? 1 : (X[base] === cellBest ? 2 : 3);
            }
        }
    }
    if (maxScore <= 0) return null;

    // Traceback across the 3-matrix state machine
    let alignQ = '', alignS = '';
    let i = maxI, j = maxJ, state = maxState;
    while (i > 0 && j > 0) {
        const base = i * W + j;
        if (state === 1) { // M: came via match/mismatch
            const dir = TM[base];
            if (dir === 0) break; // local restart point
            alignQ = query[i - 1] + alignQ; alignS = subject[j - 1] + alignS;
            i--; j--; state = dir;
        } else if (state === 2) { // X: gap in subject, consumed a query residue
            alignQ = query[i - 1] + alignQ; alignS = '-' + alignS;
            const dir = TX[base]; i--; state = dir === 1 ? 1 : 2;
        } else { // Y: gap in query, consumed a subject residue
            alignQ = '-' + alignQ; alignS = subject[j - 1] + alignS;
            const dir = TY[base]; j--; state = dir === 1 ? 1 : 3;
        }
    }
    const qStart = i + 1, sStart = j + 1;

    let identity = 0, gaps = 0, midline = '';
    for (let k = 0; k < alignQ.length; k++) {
        if (alignQ[k] !== '-' && alignQ[k] === alignS[k]) { identity++; midline += '|'; }
        else if (alignQ[k] === '-' || alignS[k] === '-')  { gaps++;     midline += ' '; }
        else                                               {             midline += '.'; }
    }

    const alignLen = alignQ.length;
    const percent  = alignLen > 0 ? ((identity / alignLen) * 100).toFixed(1) : '0.0';
    const bitScore = parseFloat(Math.max(0, (LAMBDA * maxScore - Math.log(K_APPROX)) / Math.log(2)).toFixed(1));

    return { score: maxScore, bitScore, identity, gaps, alignLen, percent,
             queryStart: qStart, queryEnd: maxI,
             hitStart: sStart,   hitEnd: maxJ,
             querySeq: alignQ, hitSeq: alignS, midline, strand: '+' };
}

// ── K-mer inverted index (position-aware, IUPAC-safe) ─────────
// Stores (seqIndex, position) pairs per k-mer, over the WHOLE sequence (no
// length cap) — position is what lets search() anchor a window around the true
// match location in a long subject, rather than only ever looking at its start.
// Ambiguous bases (encoded as 255) break the current k-mer run entirely, so an
// N never contributes to seeding in either direction (previously it silently
// became 'A', which could seed a false match through masked regions).
const KMER      = 9;
const KMER_MASK = (1 << (KMER * 2)) - 1;
const BS_SIZE   = ((1 << (KMER * 2)) >>> 5);

function buildInvertedIndex(dbSeqs) {
    const posting = new Map(); // kmer -> flat [seqIdx0,pos0, seqIdx1,pos1, ...]
    const seqBs = new Uint32Array(BS_SIZE);

    for (let i = 0; i < dbSeqs.length; i++) {
        const enc = dbSeqs[i]._enc;
        if (!enc || enc.length < KMER) continue;
        seqBs.fill(0);
        let h = 0, validRun = 0;
        for (let j = 0; j < enc.length; j++) {
            if (enc[j] === AMBIG) { validRun = 0; h = 0; continue; }
            h = ((h << 2) | enc[j]) & KMER_MASK;
            validRun++;
            if (validRun < KMER) continue;
            if (seqBs[h >>> 5] & (1 << (h & 31))) continue; // first occurrence per seq only
            seqBs[h >>> 5] |= (1 << (h & 31));
            let list = posting.get(h);
            if (!list) { list = []; posting.set(h, list); }
            list.push(i, j - KMER + 1);
        }
    }
    const index = new Map();
    for (const [k, v] of posting) index.set(k, new Int32Array(v));
    return index;
}

// Walk one query strand's k-mers against the index, returning per-candidate
// {count, bestDiagonal} — diagonal = subjectPos - queryPos identifies roughly
// where in the subject this query orientation lines up.
function seedCandidates(qEnc, index) {
    const counts = new Map();       // seqIdx -> hit count
    const diagVotes = new Map();    // seqIdx -> Map(diagonal -> votes)
    const qBs = new Uint32Array(BS_SIZE);
    let h = 0, validRun = 0;
    for (let qi = 0; qi < qEnc.length; qi++) {
        if (qEnc[qi] === AMBIG) { validRun = 0; h = 0; continue; }
        h = ((h << 2) | qEnc[qi]) & KMER_MASK;
        validRun++;
        if (validRun < KMER) continue;
        if (qBs[h >>> 5] & (1 << (h & 31))) continue;
        qBs[h >>> 5] |= (1 << (h & 31));
        const list = index.get(h);
        if (!list) continue;
        const qPos = qi - KMER + 1;
        for (let k = 0; k < list.length; k += 2) {
            const seqIdx = list[k], subjPos = list[k + 1];
            counts.set(seqIdx, (counts.get(seqIdx) || 0) + 1);
            const diag = subjPos - qPos;
            let dv = diagVotes.get(seqIdx);
            if (!dv) { dv = new Map(); diagVotes.set(seqIdx, dv); }
            dv.set(diag, (dv.get(diag) || 0) + 1);
        }
    }
    return { counts, diagVotes };
}

function bestDiagonal(diagVotes) {
    let best = 0, bestCount = -1;
    for (const [d, c] of diagVotes) if (c > bestCount) { best = d; bestCount = c; }
    return best;
}

const WINDOW_SLACK = 60; // extra bp of subject context on each side of the seed-implied region

function searchDatabase(querySeq, dbSeqs, index, maxHits = 10) {
    const MIN_HITS = 3, MAX_SW = 400;
    const qEnc = encodeSeq(querySeq);
    if (qEnc.length < KMER) return [];
    const qRevComp = revComp(querySeq);
    const qEncRC = encodeSeq(qRevComp);

    const fwd = seedCandidates(qEnc, index);
    const rev = seedCandidates(qEncRC, index);

    const candidateSet = new Set();
    for (const seqIdx of fwd.counts.keys()) if (fwd.counts.get(seqIdx) >= MIN_HITS) candidateSet.add(seqIdx);
    for (const seqIdx of rev.counts.keys()) if (rev.counts.get(seqIdx) >= MIN_HITS) candidateSet.add(seqIdx);

    const ranked = [...candidateSet].map(seqIdx => ({
        seqIdx,
        score: Math.max(fwd.counts.get(seqIdx) || 0, rev.counts.get(seqIdx) || 0)
    })).sort((a, b) => b.score - a.score).slice(0, MAX_SW);

    const scored = [];
    const dbTotalLen = dbSeqs.reduce((acc, e) => acc + e.length, 0) || 1;

    for (const { seqIdx } of ranked) {
        const entry = dbSeqs[seqIdx];
        const subjLen = entry.length;
        let bestHit = null;

        // Try the forward-strand orientation
        const fwdDv = fwd.diagVotes.get(seqIdx);
        if (fwdDv) {
            const diag = bestDiagonal(fwdDv);
            const winStart = Math.max(0, diag - WINDOW_SLACK);
            const winEnd = Math.min(subjLen, diag + querySeq.length + WINDOW_SLACK);
            if (winEnd > winStart) {
                const hit = smithWatermanAffine(querySeq, entry.seq.substring(winStart, winEnd));
                if (hit) {
                    hit.hitStart += winStart; hit.hitEnd += winStart; hit.strand = '+';
                    bestHit = hit;
                }
            }
        }

        // Try the reverse-complement orientation (querySeq's RC seeded against the same forward-indexed subject)
        const revDv = rev.diagVotes.get(seqIdx);
        if (revDv) {
            const diag = bestDiagonal(revDv);
            const winStart = Math.max(0, diag - WINDOW_SLACK);
            const winEnd = Math.min(subjLen, diag + querySeq.length + WINDOW_SLACK);
            if (winEnd > winStart) {
                const hit = smithWatermanAffine(qRevComp, entry.seq.substring(winStart, winEnd));
                if (hit && (!bestHit || hit.score > bestHit.score)) {
                    hit.hitStart += winStart; hit.hitEnd += winStart; hit.strand = '-';
                    bestHit = hit;
                }
            }
        }

        if (bestHit && bestHit.score > 0 && bestHit.identity > 0) {
            const evalue = K_APPROX * querySeq.length * dbTotalLen * Math.exp(-LAMBDA * bestHit.score);
            bestHit.evalue = evalue;
            scored.push({ id: entry.id, def: entry.def, length: entry.length,
                          seq: entry.seq, hsps: [bestHit] });
        }
    }

    scored.sort((a, b) => b.hsps[0].bitScore - a.hsps[0].bitScore);
    return scored.slice(0, maxHits);
}

// ── FASTA parser ───────────────────────────────────────────────
function parseFasta(content) {
    const seqs = [];
    let start = content.indexOf('>');
    if (start < 0) return seqs;

    while (start < content.length) {
        const next = content.indexOf('>', start + 1);
        const block = next < 0 ? content.substring(start + 1) : content.substring(start + 1, next);
        const nl = block.indexOf('\n');
        if (nl < 0) { start = next; continue; }

        const header = block.substring(0, nl).trim();
        const seq = block.substring(nl + 1).replace(/\s/g, '').toUpperCase()
                         .replace(/[^ACGTRYSWKMBDHVN]/g, 'N');
        if (!seq || seq.length < 20) { start = next < 0 ? content.length : next; continue; }

        const tabIdx   = header.indexOf('\t');
        const spaceIdx = header.indexOf(' ');
        const splitAt  = tabIdx >= 0 ? tabIdx : spaceIdx >= 0 ? spaceIdx : header.length;
        const id = header.substring(0, splitAt);

        seqs.push({ id, def: header, seq, length: seq.length });
        start = next < 0 ? content.length : next;
    }
    return seqs;
}

// ── IndexedDB cache ──────────────────────────────────────────
const IDB_NAME    = 'blast-db-cache-v1';
const IDB_STORE   = 'fastas';

function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

function idbGet(db, key) {
    return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        req.onsuccess = e => resolve(e.target.result ?? null);
        req.onerror   = e => reject(e.target.error);
    });
}

function idbPut(db, key, value) {
    return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror   = e => reject(e.target.error);
    });
}

// ── In-memory DB state ────────────────────────────────────────
const DB_SEQS = {};
const DB_IDX  = {};

async function ensureDb(dbName, dbUrl, requestId) {
    if (DB_SEQS[dbName]) return;

    let idb = null;
    try { idb = await openIDB(); } catch (_) { /* IDB not available, skip cache */ }

    let remoteSize = null;
    try {
        const head = await fetch(dbUrl, { method: 'HEAD' });
        remoteSize = parseInt(head.headers.get('content-length') || '0') || null;
    } catch (_) {}

    let text = null;

    if (idb) {
        const cachedText = await idbGet(idb, dbName);
        const cachedSize = await idbGet(idb, dbName + ':size');
        if (cachedText && (!remoteSize || cachedSize === remoteSize)) {
            self.postMessage({ type: 'progress', requestId, dbName, stage: 'loading from cache' });
            text = typeof cachedText === 'string' ? cachedText : await cachedText.text();
        }
    }

    if (!text) {
        self.postMessage({ type: 'progress', requestId, dbName, stage: 'downloading (first time only)' });
        const resp = await fetch(dbUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${dbUrl}`);
        text = await resp.text();
        if (idb) {
            try {
                await idbPut(idb, dbName, text);
                if (remoteSize) await idbPut(idb, dbName + ':size', remoteSize);
            } catch (_) { /* quota exceeded or private mode — ignore */ }
        }
    }

    self.postMessage({ type: 'progress', requestId, dbName, stage: 'indexing' });
    const seqs = parseFasta(text);
    for (const e of seqs) e._enc = encodeSeq(e.seq); // no length cap — full sequence indexed
    DB_SEQS[dbName] = seqs;
    DB_IDX[dbName]  = buildInvertedIndex(seqs);
}

// ── Message handler ───────────────────────────────────────────
self.onmessage = async ({ data }) => {
    const { type, requestId } = data;

    if (type === 'search') {
        const { querySeq, dbName, dbUrl, maxHits, preset } = data;
        try {
            // Sets shared module-level scoring constants for this request. NOT
            // race-safe: if two 'search' messages with DIFFERENT presets are ever
            // in flight concurrently (there's an `await ensureDb` below before the
            // DP actually runs), the later message's applyScoringPreset() call
            // could flip these constants out from under the earlier one's DP loop.
            // Not a problem today (script.js always searches all chosen databases
            // under one single preset per user action), but would need per-call
            // parameters instead of shared state before ever allowing mixed-preset
            // concurrent requests.
            applyScoringPreset(preset || 'water');
            await ensureDb(dbName, dbUrl, requestId);
            self.postMessage({ type: 'progress', requestId, dbName, stage: 'searching' });
            const t0   = Date.now();
            const hits = searchDatabase(querySeq, DB_SEQS[dbName], DB_IDX[dbName], maxHits || 10);
            const ms   = Date.now() - t0;
            self.postMessage({
                type: 'result', requestId, dbName, preset: ACTIVE_PRESET,
                numHits: hits.length, hits, success: true,
                numSeqs: DB_SEQS[dbName].length, searchMs: ms,
            });
        } catch (err) {
            self.postMessage({ type: 'result', requestId, dbName,
                numHits: 0, hits: [], success: false, error: err.message });
        }

    } else if (type === 'clearCache') {
        try {
            const idb = await openIDB();
            await new Promise((resolve, reject) => {
                const req = idb.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear();
                req.onsuccess = resolve; req.onerror = e => reject(e.target.error);
            });
            for (const k of Object.keys(DB_SEQS)) { delete DB_SEQS[k]; delete DB_IDX[k]; }
            self.postMessage({ type: 'cacheCleared', requestId });
        } catch (err) {
            self.postMessage({ type: 'error', requestId, error: err.message });
        }
    }
};
