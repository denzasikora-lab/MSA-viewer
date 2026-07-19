const express = require('express');
const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    const origin = req.get('origin') || '';
    const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost', 'http://127.0.0.1'];
    const extraOrigin = process.env.CORS_ORIGIN;
    if (extraOrigin) allowed.push(extraOrigin);
    if (allowed.includes(origin) || !origin) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.static('.')); // Serve static files from current directory

app.get('/api/viewer-info', (req, res) => {
    let scriptVersion = '?';
    let buildTag = '?';
    try {
        const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        const m = html.match(/script\.js\?v=(\d+)/);
        if (m) scriptVersion = m[1];
    } catch (_) {}
    try {
        const js = fs.readFileSync(path.join(__dirname, 'script.js'), 'utf8');
        const m = js.match(/const BUILD_TAG = '(v\d+)'/);
        if (m) buildTag = m[1];
    } catch (_) {}
    res.json({ root: __dirname, scriptVersion, buildTag });
});

const PORT = 3000;

// ============ BLAST DATABASE REGISTRY ============
const DB_REGISTRY_FILE = path.join(__dirname, 'blast_dbs.json');

// Load persistent registry (survives server restarts)
function loadDbRegistry() {
    try {
        if (fs.existsSync(DB_REGISTRY_FILE)) {
            return JSON.parse(fs.readFileSync(DB_REGISTRY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load DB registry:', e.message);
    }
    // Default databases bundled with the viewer
    return {
        'SINEBase.nr95': { path: path.join(__dirname, 'SINEBase.nr95.fa'), desc: 'SINEBase non-redundant (95%)' },
        'RepBase_filtered': { path: path.join(__dirname, 'RepBase_filtered.bnk'), desc: 'RepBase filtered' },
        'snake_gekko_SINEs': { path: path.join(__dirname, 'snake_gekko_SINEs_cons.fas'), desc: 'Snake & Gekko SINEs' },
        'tua_DL_ASuh_JGrau_repeat': { path: path.join(__dirname, 'tua_DL_ASuh_JGrau_repeat.fa'), desc: 'Tuatara repeats' }
    };
}

function saveDbRegistry(registry) {
    try {
        fs.writeFileSync(DB_REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save DB registry:', e.message);
    }
}

function dbPublicUrl(dbPath) {
    const rel = path.relative(__dirname, dbPath).split(path.sep).join('/');
    return '/' + rel.replace(/^\.?\//, '');
}

function blastDbStatus(name, info) {
    const exists = !!(info?.path && fs.existsSync(info.path));
    const dbDir = exists ? path.dirname(info.path) : '';
    const indexByName = exists && fs.existsSync(path.join(dbDir, name + '.nhr'));
    const stem = exists ? path.basename(info.path, path.extname(info.path)) : '';
    const indexByStem = exists && fs.existsSync(path.join(dbDir, stem + '.nhr'));
    const formatted = indexByName || indexByStem;
    const loaded = !!(DB_CACHE[name]?.length);
    return {
        description: info.desc || name,
        url: exists ? dbPublicUrl(info.path) : null,
        exists,
        formatted,
        loaded,
        // Browser worker only needs the FASTA file; blastn indices are optional
        available: exists,
    };
}

let DATABASES = loadDbRegistry();

// Reload registry (hot-reload)
function reloadDbRegistry() {
    DATABASES = loadDbRegistry();
}

function runMakeBlastDb(args) {
    const result = spawnSync('makeblastdb', args, { stdio: 'ignore', timeout: 120000 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`makeblastdb exited with code ${result.status}`);
    }
}

function runBlastn(args, options = {}) {
    const result = spawnSync('blastn', args, {
        encoding: 'utf8',
        timeout: options.timeout ?? 60000,
        stdio: options.stdio ?? 'pipe',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(result.stderr || `blastn exited with code ${result.status}`);
    }
    return result;
}

// Format a FASTA database for BLAST
function formatDatabase(dbPath, dbName) {
    if (!fs.existsSync(dbPath)) {
        console.warn(`Database file not found: ${dbPath}`);
        return false;
    }

    try {
        const dbDir = path.dirname(dbPath);
        const outBase = path.join(dbDir, dbName);
        // Check if already formatted (.nhr is the sequence header index)
        if (fs.existsSync(outBase + '.nhr')) {
            return true;
        }

        // Try makeblastdb
        console.log(`Formatting database: ${dbName}`);
        runMakeBlastDb(['-in', dbPath, '-dbtype', 'nucl', '-title', dbName, '-out', outBase]);
        return true;
    } catch (err) {
        console.error(`Failed to format database ${dbName}:`, err.message);
        return false;
    }
}

// Initialize and format databases on startup
function initializeDatabases() {
    console.log('Initializing BLAST databases...');
    const results = {};
    for (const [name, info] of Object.entries(DATABASES)) {
        results[name] = {
            description: info.desc || name,
            exists: fs.existsSync(info.path),
            formatted: formatDatabase(info.path, name)
        };
    }
    return results;
}

// ============ IN-MEMORY DATABASE CACHE ============
const DB_CACHE = {};
const DB_INDEX = {};

function parseFasta(content) {
    const seqs = [];
    const blocks = content.split('>');
    for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        const header = lines[0].trim();
        const seq = lines.slice(1).join('').replace(/\s/g, '').toUpperCase().replace(/[^ACGTUN]/g, 'N');
        if (!seq || seq.length < 20) continue;
        const spaceIdx = header.indexOf(' ');
        const id = spaceIdx > 0 ? header.substring(0, spaceIdx) : header;
        seqs.push({ id, def: header, seq, length: seq.length });
    }
    return seqs;
}

function loadDbCache() {
    for (const [name, dbInfo] of Object.entries(DATABASES)) {
        if (fs.existsSync(dbInfo.path)) {
            console.log(`Loading ${name} into memory...`);
            const t0 = Date.now();
            DB_CACHE[name] = parseFasta(fs.readFileSync(dbInfo.path, 'utf8'));
            // Pre-encode and build inverted kmer index
            for (const e of DB_CACHE[name]) e._enc = encodeSeq(e.seq, 600);
            DB_INDEX[name] = buildInvertedIndex(DB_CACHE[name]);
            console.log(`  ${DB_CACHE[name].length} sequences loaded + indexed in ${Date.now() - t0} ms`);
        } else {
            console.warn(`  Not found: ${dbInfo.path}`);
            DB_CACHE[name] = [];
        }
    }
}

// ============ SMITH-WATERMAN WITH TRACEBACK ============
function smithWaterman(query, subject) {
    // Cap sequences to keep it fast
    const q = query.substring(0, 600);
    const s = subject.substring(0, 600);
    const m = q.length, n = s.length;

    const MATCH = 2, MISMATCH = -3, GAP_EXT = -2;
    // Use flat typed arrays for speed
    const H  = new Int32Array((m + 1) * (n + 1));
    const TB = new Uint8Array((m + 1) * (n + 1)); // 1=diag 2=up 3=left

    let maxScore = 0, maxI = 0, maxJ = 0;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const base = i * (n + 1) + j;
            const d = q[i - 1] === s[j - 1] ? MATCH : MISMATCH;
            const diag = H[(i - 1) * (n + 1) + (j - 1)] + d;
            const up   = H[(i - 1) * (n + 1) + j] + GAP_EXT;
            const left = H[i * (n + 1) + (j - 1)] + GAP_EXT;
            const best = Math.max(0, diag, up, left);
            H[base] = best;
            TB[base] = best === 0 ? 0 : best === diag ? 1 : best === up ? 2 : 3;
            if (best > maxScore) { maxScore = best; maxI = i; maxJ = j; }
        }
    }

    if (maxScore === 0) return null;

    // Traceback
    let alignQ = '', alignS = '';
    let i = maxI, j = maxJ;
    while (i > 0 && j > 0 && H[i * (n + 1) + j] > 0) {
        const dir = TB[i * (n + 1) + j];
        if (dir === 1) { alignQ = q[i - 1] + alignQ; alignS = s[j - 1] + alignS; i--; j--; }
        else if (dir === 2) { alignQ = q[i - 1] + alignQ; alignS = '-' + alignS; i--; }
        else { alignQ = '-' + alignQ; alignS = s[j - 1] + alignS; j--; }
    }
    const qStart = i + 1, sStart = j + 1;

    let identity = 0;
    let midline = '';
    for (let k = 0; k < alignQ.length; k++) {
        if (alignQ[k] !== '-' && alignQ[k] === alignS[k]) { identity++; midline += '|'; }
        else if (alignQ[k] === '-' || alignS[k] === '-') midline += ' ';
        else midline += '.';
    }

    const alignLen = alignQ.length;
    const percent  = alignLen > 0 ? ((identity / alignLen) * 100).toFixed(1) : '0.0';
    const bitScore = parseFloat(Math.max(0, (maxScore * 0.625 - Math.log(0.41)) / Math.log(2)).toFixed(1));

    return { score: maxScore, bitScore, identity, alignLen, percent,
             queryStart: qStart, queryEnd: maxI,
             hitStart: sStart,   hitEnd: maxJ,
             querySeq: alignQ, hitSeq: alignS, midline };
}

// ============ KMER ENCODING & INVERTED INDEX SEARCH ============
const BASE_MAP = new Uint8Array(128);
BASE_MAP['A'.charCodeAt(0)] = 0; BASE_MAP['C'.charCodeAt(0)] = 1;
BASE_MAP['G'.charCodeAt(0)] = 2; BASE_MAP['T'.charCodeAt(0)] = 3;
BASE_MAP['a'.charCodeAt(0)] = 0; BASE_MAP['c'.charCodeAt(0)] = 1;
BASE_MAP['g'.charCodeAt(0)] = 2; BASE_MAP['t'.charCodeAt(0)] = 3;

function encodeSeq(s, maxLen) {
    const len = Math.min(s.length, maxLen);
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = BASE_MAP[s.charCodeAt(i)] || 0;
    return arr;
}

const KMER     = 9;
const KMER_MASK = (1 << (KMER * 2)) - 1; // 0x3FFFF  (18 bits)
const BS_SIZE   = ((1 << (KMER * 2)) >>> 5); // 8192 uint32 words for dedup bitset

// Build inverted index: kmer_hash -> Int32Array of sequence indices
// Paid once at load time; each search then does O(query_kmers) lookups instead of O(N * db_seq_len)
function buildInvertedIndex(dbSeqs) {
    const SCAN_CAP = 600;
    // Accumulate posting lists as plain arrays first
    const posting = new Map();
    const seqBs = new Uint32Array(BS_SIZE); // reuse per seq for dedup

    for (let i = 0; i < dbSeqs.length; i++) {
        const enc = dbSeqs[i]._enc;
        if (!enc || enc.length < KMER) continue;
        // reset dedup bitset
        seqBs.fill(0);
        let h = 0;
        for (let j = 0; j < KMER - 1; j++) h = ((h << 2) | enc[j]) & KMER_MASK;
        for (let j = KMER - 1; j < enc.length; j++) {
            h = ((h << 2) | enc[j]) & KMER_MASK;
            // deduplicate: only add each kmer once per sequence
            if (seqBs[h >>> 5] & (1 << (h & 31))) continue;
            seqBs[h >>> 5] |= (1 << (h & 31));
            let list = posting.get(h);
            if (!list) { list = []; posting.set(h, list); }
            list.push(i);
        }
    }
    // Convert to typed arrays for cache-friendly iteration
    const index = new Map();
    for (const [k, v] of posting) index.set(k, new Int32Array(v));
    return index;
}

function searchDatabase(querySeq, dbSeqs, index, maxHits = 10) {
    const MIN_HITS = 3;   // require 3 shared unique 9-mers before running SW
    const MAX_SW   = 400; // cap SW candidates to keep latency bounded

    const qEnc = encodeSeq(querySeq, 600);
    if (qEnc.length < KMER) return [];

    // Tally kmer hits per DB sequence using the inverted index
    // O(unique_query_kmers * avg_posting_size) — far cheaper than scanning all seqs
    const counts = new Uint16Array(dbSeqs.length); // max 65535 hits/seq
    const qBs    = new Uint32Array(BS_SIZE);         // dedup query kmers
    let h = 0;
    for (let i = 0; i < KMER - 1; i++) h = ((h << 2) | qEnc[i]) & KMER_MASK;
    for (let i = KMER - 1; i < qEnc.length; i++) {
        h = ((h << 2) | qEnc[i]) & KMER_MASK;
        if (qBs[h >>> 5] & (1 << (h & 31))) continue; // skip duplicate query kmer
        qBs[h >>> 5] |= (1 << (h & 31));
        const list = index ? index.get(h) : null;
        if (list) for (let j = 0; j < list.length; j++) counts[list[j]]++;
    }

    // Collect candidates with enough shared kmers
    const candidates = [];
    for (let i = 0; i < dbSeqs.length; i++) {
        if (counts[i] >= MIN_HITS) candidates.push({ entry: dbSeqs[i], hits: counts[i] });
    }
    candidates.sort((a, b) => b.hits - a.hits);
    const top = candidates.slice(0, MAX_SW);

    // Smith-Waterman on top candidates only
    const scored = [];
    for (const { entry } of top) {
        const sw = smithWaterman(querySeq, entry.seq);
        if (sw && sw.score > 0 && sw.identity > 0) {
            scored.push({ id: entry.id, def: entry.def, length: entry.length,
                          hsps: [{ ...sw, evalue: 0 }] });
        }
    }
    scored.sort((a, b) => b.hsps[0].bitScore - a.hsps[0].bitScore);
    return scored.slice(0, maxHits);
}

// ============ BLAST XML PARSER (for when real BLAST is available) ============
function parseBlastResults(xmlOutput) {
    const results = [];
    
    // Simple XML parsing - extract Hit elements
    const hitMatches = xmlOutput.match(/<Hit>[\s\S]*?<\/Hit>/g) || [];
    
    let hitNum = 0;
    for (const hitXml of hitMatches) {
        hitNum++;
        
        // Extract Hit_id, Hit_def, Hit_len
        const idMatch = hitXml.match(/<Hit_id>([^<]+)<\/Hit_id>/);
        const defMatch = hitXml.match(/<Hit_def>([^<]+)<\/Hit_def>/);
        const lenMatch = hitXml.match(/<Hit_len>(\d+)<\/Hit_len>/);
        
        if (!idMatch) continue;

        const hit = {
            hitNum,
            id: idMatch[1],
            def: defMatch ? defMatch[1] : 'Unknown',
            length: lenMatch ? parseInt(lenMatch[1]) : 0,
            hsps: []
        };

        // Extract HSPs (High Scoring Pairs)
        const hspMatches = hitXml.match(/<Hsp>[\s\S]*?<\/Hsp>/g) || [];
        
        for (const hspXml of hspMatches) {
            // Extract HSP data
            const eMatch = hspXml.match(/<Hsp_evalue>([^<]+)<\/Hsp_evalue>/);
            const scoreMatch = hspXml.match(/<Hsp_bit_score>([^<]+)<\/Hsp_bit_score>/);
            const identityMatch = hspXml.match(/<Hsp_identity>(\d+)<\/Hsp_identity>/);
            const alignMatch = hspXml.match(/<Hsp_align_len>(\d+)<\/Hsp_align_len>/);
            const queryFromMatch = hspXml.match(/<Hsp_query_from>(\d+)<\/Hsp_query_from>/);
            const queryToMatch = hspXml.match(/<Hsp_query_to>(\d+)<\/Hsp_query_to>/);
            const hitFromMatch = hspXml.match(/<Hsp_hit_from>(\d+)<\/Hsp_hit_from>/);
            const hitToMatch = hspXml.match(/<Hsp_hit_to>(\d+)<\/Hsp_hit_to>/);
            const querySeqMatch = hspXml.match(/<Hsp_qseq>([^<]+)<\/Hsp_qseq>/);
            const hitSeqMatch = hspXml.match(/<Hsp_hseq>([^<]+)<\/Hsp_hseq>/);
            const midlineMatch = hspXml.match(/<Hsp_midline>([^<]+)<\/Hsp_midline>/);

            if (eMatch) {
                const identity = identityMatch ? parseInt(identityMatch[1]) : 0;
                const alignLen = alignMatch ? parseInt(alignMatch[1]) : 0;
                const percent = alignLen > 0 ? ((identity / alignLen) * 100).toFixed(2) : 0;

                hit.hsps.push({
                    score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
                    evalue: parseFloat(eMatch[1]),
                    identity: identity,
                    alignLen: alignLen,
                    percent: percent,
                    queryStart: queryFromMatch ? parseInt(queryFromMatch[1]) : 0,
                    queryEnd: queryToMatch ? parseInt(queryToMatch[1]) : 0,
                    hitStart: hitFromMatch ? parseInt(hitFromMatch[1]) : 0,
                    hitEnd: hitToMatch ? parseInt(hitToMatch[1]) : 0,
                    querySeq: querySeqMatch ? querySeqMatch[1] : '',
                    hitSeq: hitSeqMatch ? hitSeqMatch[1] : '',
                    midline: midlineMatch ? midlineMatch[1] : ''
                });
            }
        }

        if (hit.hsps.length > 0) {
            results.push(hit);
        }
    }
    
    return results.slice(0, 10); // Return top 10 hits
}



// Run BLASTN
app.post('/api/blast', (req, res) => {
    const { query, dbName, evalue: rawEvalue = '1e-5', maxHits: rawMaxHits = 10 } = req.body;
    // Sanitize user-supplied numeric parameters
    const evalue = parseFloat(rawEvalue) || 1e-5;
    const maxHits = Math.max(1, Math.min(50, parseInt(rawMaxHits) || 10));

    if (!query || !dbName) {
        return res.status(400).json({ error: 'Query sequence and database name required' });
    }

    if (!DATABASES[dbName]) {
        return res.status(400).json({ error: `Unknown database: ${dbName}` });
    }

    const dbInfo = DATABASES[dbName];
    const dbPath = dbInfo.path;
    if (!fs.existsSync(dbPath)) {
        return res.status(400).json({ error: `Database file not found: ${dbPath}` });
    }

    try {
        // Create temporary FASTA file for query
        const tmpDir = os.tmpdir();
        const queryFile = path.join(tmpDir, `query_${Date.now()}.fasta`);
        const outputFile = path.join(tmpDir, `blast_${Date.now()}.xml`);

        // Write query to file
        fs.writeFileSync(queryFile, query);

        // Format database name for blastn
        const dbBaseName = path.join(path.dirname(dbPath), path.basename(dbPath, path.extname(dbPath)));

        // Check if running on ARM64 (no BLAST available) or if blastn not in PATH
        let blastAvailable = false;
        try { execSync('blastn -version', { stdio: 'ignore' }); blastAvailable = true; } catch (_) {}

        if (process.arch === 'arm64' || !blastAvailable) {
            console.log('Using local SW search for: ' + dbName);
            const querySeq = fs.readFileSync(queryFile, 'utf8').split('\n').filter(l => !l.startsWith('>')).join('').toUpperCase();
            fs.unlinkSync(queryFile);
            const cached = DB_CACHE[dbName];
            if (!cached || cached.length === 0) {
                return res.status(400).json({ error: `Database ${dbName} not loaded` });
            }
            const t0 = Date.now();
            const hits = searchDatabase(querySeq, cached, DB_INDEX[dbName], parseInt(maxHits) || 10);
            console.log(`  ${hits.length} hits in ${Date.now() - t0} ms`);
            return res.json({ success: true, database: dbName, numHits: hits.length, hits });
        }

        // Run BLAST with XML output (for x64 systems)
        runBlastn([
            '-query', queryFile,
            '-db', dbBaseName,
            '-evalue', String(evalue),
            '-outfmt', '5',
            '-max_target_seqs', String(maxHits),
            '-out', outputFile,
        ]);

        // Read and parse results
        const xmlOutput = fs.readFileSync(outputFile, 'utf8');
        const results = parseBlastResults(xmlOutput);

        // Cleanup
        fs.unlinkSync(queryFile);
        fs.unlinkSync(outputFile);

        res.json({
            success: true,
            database: dbName,
            numHits: results.length,
            hits: results
        });

    } catch (err) {
        console.error('BLAST error:', err);
        res.status(500).json({ 
            error: 'BLAST search failed',
            details: err.message
        });
    }
});

// Batch BLAST search against all databases
app.post('/api/blast-all', (req, res) => {
    const { query, evalue: rawEvalue = '1e-5' } = req.body;
    const evalue = parseFloat(rawEvalue) || 1e-5;

    if (!query) {
        return res.status(400).json({ error: 'Query sequence required' });
    }

    try {
        const allResults = {};
        
        for (const [dbName, dbInfo] of Object.entries(DATABASES)) {
            const dbPath = dbInfo.path;
            if (!fs.existsSync(dbPath)) {
                allResults[dbName] = { error: 'Database file not found' };
                continue;
            }

            try {
                // Create temporary files
                const tmpDir = os.tmpdir();
                const queryFile = path.join(tmpDir, `query_${Date.now()}_${dbName}.fasta`);
                const outputFile = path.join(tmpDir, `blast_${Date.now()}_${dbName}.xml`);

                fs.writeFileSync(queryFile, query);

                const dbBaseName = path.join(path.dirname(dbPath), path.basename(dbPath, path.extname(dbPath)));
                runBlastn([
                    '-query', queryFile,
                    '-db', dbBaseName,
                    '-evalue', String(evalue),
                    '-outfmt', '5',
                    '-max_target_seqs', '5',
                    '-out', outputFile,
                ], { stdio: 'ignore' });

                const xmlOutput = fs.readFileSync(outputFile, 'utf8');
                const results = parseBlastResults(xmlOutput);

                allResults[dbName] = {
                    success: true,
                    numHits: results.length,
                    hits: results
                };

                // Cleanup
                fs.unlinkSync(queryFile);
                fs.unlinkSync(outputFile);

            } catch (err) {
                console.error(`BLAST error for ${dbName}:`, err.message);
                allResults[dbName] = { error: err.message };
            }
        }

        res.json({
            success: true,
            results: allResults
        });

    } catch (err) {
        console.error('Batch BLAST error:', err);
        res.status(500).json({ 
            error: 'Batch BLAST search failed',
            details: err.message
        });
    }
});

// ============ BLAST DATABASE MANAGEMENT ============

// GET /api/blast-db — list all databases
app.get('/api/blast-db', (req, res) => {
    reloadDbRegistry();
    const dbs = {};
    for (const [name, info] of Object.entries(DATABASES)) {
        dbs[name] = blastDbStatus(name, info);
    }
    res.json({ databases: dbs });
});

// POST /api/blast-db — add a new database from FASTA content
app.post('/api/blast-db', (req, res) => {
    const { name, description, fasta } = req.body;
    if (!name || !fasta) {
        return res.status(400).json({ error: 'Name and FASTA content required' });
    }
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeName || safeName.length > 100) {
        return res.status(400).json({ error: 'Invalid database name' });
    }
    reloadDbRegistry();
    if (DATABASES[safeName]) {
        return res.status(409).json({ error: 'Database "' + safeName + '" already exists. Delete it first.' });
    }
    try {
        const dbDir = path.join(__dirname, 'blast_dbs');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        const fastaPath = path.join(dbDir, safeName + '.fa');
        fs.writeFileSync(fastaPath, fasta, 'utf8');
        console.log('Creating BLAST database: ' + safeName);
        const formatted = formatDatabase(fastaPath, safeName);
        if (!formatted) {
            return res.status(500).json({ error: 'makeblastdb failed. Is BLAST+ installed?' });
        }
        DATABASES[safeName] = {
            path: fastaPath,
            desc: (description || '').substring(0, 200)
        };
        saveDbRegistry(DATABASES);
        loadDbCache();
        console.log('Database "' + safeName + '" registered and formatted');
        res.json({ success: true, name: safeName, description: DATABASES[safeName].desc });
    } catch (err) {
        console.error('Failed to create database ' + safeName + ':', err);
        res.status(500).json({ error: 'Failed to create database: ' + err.message });
    }
});

// DELETE /api/blast-db/:name — remove a database and its index files
app.delete('/api/blast-db/:name', async (req, res) => {
    const dbName = req.params.name;
    reloadDbRegistry();
    if (!DATABASES[dbName]) {
        return res.status(404).json({ error: 'Database "' + dbName + '" not found' });
    }
    try {
        const dbInfo = DATABASES[dbName];
        const dbDir = path.dirname(dbInfo.path);
        const basePath = path.join(dbDir, dbName);
        const extensions = ['.nhr','.nin','.nsq','.nog','.nsd','.nsi','.ndb','.not','.ntf','.nto','.njs'];
        for (const ext of extensions) {
            const f = basePath + ext;
            if (fs.existsSync(f)) { try { fs.unlinkSync(f); } catch (_) {} }
        }
        if (fs.existsSync(dbInfo.path)) { try { fs.unlinkSync(dbInfo.path); } catch (_) {} }
        delete DATABASES[dbName];
        delete DB_CACHE[dbName];
        delete DB_INDEX[dbName];
        saveDbRegistry(DATABASES);
        console.log('Database "' + dbName + '" deleted');
        res.json({ success: true, name: dbName });
    } catch (err) {
        console.error('Failed to delete database ' + dbName + ':', err);
        res.status(500).json({ error: 'Failed to delete database: ' + err.message });
    }
});

// ============ MAFFT ALIGNMENT ============
// Path to MAFFT binary - update this if mafft is in a non-standard location
const MAFFT_BIN = process.env.MAFFT_BIN || '/staging/conda/envs/bioinfo/bin/mafft';

// Whitelist of allowed MAFFT options to prevent command injection
const ALLOWED_MAFFT_OPTS = new Set([
    '--auto', '--add', '--addfragments', '--keeplength',
    '--maxiterate', '--localpair', '--globalpair', '--retree',
    '--quiet', '--thread', '--anysymbol', '--preservecase',
    '--reorder', '--treeout', '--inputorder', '--6merpair',
    '--genafpair', '--fastapair', '--parttree', '--dpparttree',
    '--amino', '--nuc', '--clustalout', '--phylipout'
]);

// Spawn MAFFT as child process to avoid shell injection
function runMafft(args, inputFiles, env, timeout) {
    return new Promise((resolve, reject) => {
        const child = spawn(MAFFT_BIN, args, { env, timeout, maxBuffer: 50 * 1024 * 1024 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('close', code => {
            if (code !== 0) reject(new Error(stderr || `MAFFT exited with code ${code}`));
            else resolve(stdout);
        });
        child.on('error', reject);
    });
}

// Realign all sequences or add new sequences to existing alignment
app.post('/api/mafft', async (req, res) => {
    const { mode = 'align', sequences, existingAlignment, newSequences, options = [] } = req.body;

    if (!sequences && !existingAlignment) {
        return res.status(400).json({ error: 'No sequences provided' });
    }

    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const inputFile = path.join(tmpDir, `mafft_input_${timestamp}.fasta`);
    const addFile = path.join(tmpDir, `mafft_add_${timestamp}.fasta`);
    const outputFile = path.join(tmpDir, `mafft_output_${timestamp}.fasta`);

    try {
        const mafftArgs = [];
        let inputPath;

        if (mode === 'add' && existingAlignment && newSequences) {
            fs.writeFileSync(inputFile, existingAlignment);
            fs.writeFileSync(addFile, newSequences);
            const addMode = options.includes('--addfragments') ? '--addfragments' : '--add';
            mafftArgs.push(addMode, addFile, '--keeplength', inputFile);
            const extraOpts = options.filter(o => o !== '--addfragments' && o !== '--add');
            for (const opt of extraOpts) {
                if (ALLOWED_MAFFT_OPTS.has(opt)) mafftArgs.unshift(opt);
            }
            inputPath = inputFile;
        } else if (mode === 'realign-block') {
            fs.writeFileSync(inputFile, sequences);
            mafftArgs.push('--auto', inputFile);
            inputPath = inputFile;
        } else {
            fs.writeFileSync(inputFile, sequences);
            const mafftOpts = options.length > 0 ? options : ['--auto'];
            for (const opt of mafftOpts) {
                if (ALLOWED_MAFFT_OPTS.has(opt)) mafftArgs.push(opt);
            }
            mafftArgs.push(inputFile);
            inputPath = inputFile;
        }

        console.log(`Running MAFFT: ${MAFFT_BIN} ${mafftArgs.join(' ')}`);
        const mafftEnv = { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/staging/conda/envs/bioinfo/bin:' + (process.env.PATH || '') };
        const result = await runMafft(mafftArgs, [inputPath], mafftEnv, 300000);

        // Clean up temp files
        try { fs.unlinkSync(inputFile); } catch (_) {}
        try { fs.unlinkSync(addFile); } catch (_) {}

        if (!result || result.trim().length === 0) {
            return res.status(500).json({ error: 'MAFFT produced no output' });
        }

        res.json({
            success: true,
            alignment: result,
            mode: mode
        });

    } catch (err) {
        console.error('MAFFT error:', err);
        // Clean up temp files on error
        try { fs.unlinkSync(inputFile); } catch (_) {}
        try { fs.unlinkSync(addFile); } catch (_) {}

        res.status(500).json({
            error: 'MAFFT alignment failed',
            details: err.stderr || err.message
        });
    }
});

// Check database status
app.get('/api/databases', (req, res) => {
    const status = {};
    for (const [name, info] of Object.entries(DATABASES)) {
        status[name] = blastDbStatus(name, info);
    }
    res.json(status);
});

// List local snapshot JSON files for Input menu snapshot picker
app.get('/api/snapshots', (req, res) => {
    const snapDir = path.join(__dirname, 'snapshots');
    if (!fs.existsSync(snapDir)) {
        return res.json({ files: [] });
    }
    try {
        const files = fs.readdirSync(snapDir)
            .filter(name => name.toLowerCase().endsWith('.json'))
            .map(name => {
                const fullPath = path.join(snapDir, name);
                const st = fs.statSync(fullPath);
                return {
                    name,
                    path: `snapshots/${name}`,
                    size: st.size,
                    mtime: st.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message, files: [] });
    }
});

// ============ SSH MULTI-SERVER FILE FETCH ============
// Load server config from external file (not committed to git)
const PPK = process.env.SSH_KEY_PATH || path.join(os.homedir(), '.ssh', process.platform === 'win32' ? 'id_ed25519.ppk' : 'id_ed25519');
let SSH_SERVERS = {};
try {
    const srvPath = path.join(__dirname, 'ssh-servers.json');
    if (fs.existsSync(srvPath)) {
        SSH_SERVERS = JSON.parse(fs.readFileSync(srvPath, 'utf8'));
        console.log(`Loaded ${Object.keys(SSH_SERVERS).length} SSH server(s) from ssh-servers.json`);
    } else {
        console.log('No ssh-servers.json found — SSH features disabled. Copy ssh-servers.example.json to ssh-servers.json to configure.');
    }
} catch (err) {
    console.error('Failed to load ssh-servers.json:', err.message);
}

// Keep backwards compat for old ssh-cat calls without ?server=
const SSH_CONFIG = SSH_SERVERS[Object.keys(SSH_SERVERS)[0]] || null;

// Queue for push-to-load from MC on remote servers
let _queuedFile = null; // { server, file, ts }

function getPlinkBaseArgs(server) {
    const args = ['-batch', '-i', PPK];
    if (server?.hostKey) args.push('-hostkey', server.hostKey);
    return args;
}

// Build ssh arg array for a given server; routes through 'via' server when needed
function buildSshCatArgs(serverKey, filePath) {
    const srv = SSH_SERVERS[serverKey];
    if (!srv) return null;
    const escaped = filePath.replace(/"/g, '\\"');
    const port = srv.port || 22;
    if (!srv.via) {
        const args = getPlinkBaseArgs(srv);
        if (port !== 22) args.push('-P', port.toString());
        args.push(`${srv.user}@${srv.host}`, `cat "${escaped}"`);
        return args;
    }
    // Route through jump server: local → via → target
    const via = SSH_SERVERS[srv.via];
    const innerPortArgs = port !== 22 ? ` -p ${port}` : '';
    const innerCmd = `ssh -T -o BatchMode=yes -o StrictHostKeyChecking=accept-new${innerPortArgs} ${srv.user}@${srv.host} "cat \\"${escaped}\\""`;
    return [...getPlinkBaseArgs(via), `${via.user}@${via.host}`, innerCmd];
}

function stripBanner(stdout) {
    const fastaStart = stdout.indexOf('>');
    const msfStart   = stdout.indexOf('!!');
    if (fastaStart > 0 && (msfStart < 0 || fastaStart < msfStart)) return stdout.substring(fastaStart);
    if (msfStart > 0) return stdout.substring(msfStart);
    return stdout;
}

// List available servers
app.get('/api/ssh-servers', (req, res) => {
    const result = {};
    for (const [key, srv] of Object.entries(SSH_SERVERS)) {
        result[key] = { label: srv.label, pollable: !srv.via };
    }
    res.json(result);
});

// Queue a file to auto-load (called from MC via curl)
app.get('/api/queue-file', (req, res) => {
    const serverKey = req.query.server;
    const filePath  = req.query.file;
    if (!filePath)  return res.status(400).json({ error: 'Missing file' });
    if (!serverKey || !SSH_SERVERS[serverKey]) return res.status(400).json({ error: 'Unknown server' });
    if (/[;|&`$(){}\\]/.test(filePath)) return res.status(400).json({ error: 'Invalid path' });
    if (filePath.includes('..')) return res.status(400).json({ error: 'Path traversal not allowed' });
    _queuedFile = { server: serverKey, file: filePath, ts: Date.now() };
    console.log(`Queued: [${serverKey}] ${filePath}`);
    res.json({ ok: true });
});

// Viewer polls this; returns queued file and clears it
app.get('/api/poll-file', (req, res) => {
    if (!_queuedFile) return res.json({ queued: false });
    const qf = _queuedFile;
    _queuedFile = null;
    res.json({ queued: true, server: qf.server, file: qf.file });
});

// Poll queue file from remote server (MC writes to ~/.msa_viewer_queue)
app.get('/api/ssh-poll-file', (req, res) => {
    const serverKey = req.query.server || 'copilot';
    console.log(`[POLL] Checking queue for server: ${serverKey}`);
    if (!SSH_SERVERS[serverKey]) return res.status(400).json({ error: `Unknown server: ${serverKey}` });

    const srv = SSH_SERVERS[serverKey];
    const baseArgs = getPlinkBaseArgs(srv);
    let sshArgs;

    if (!srv.via) {
        // Direct: read queue and clear it. Use /tmp so any user (root/copilot) can write.
        // Queue file has 2 lines: line 1 = directory, line 2 = filename (from MC %d and %f)
        // Or 1 line with full path (from MC %p)
        const cmd = 'Q=/tmp/.msa_viewer_queue; if [ -s "$Q" ]; then echo "=START_QUEUE="; cat "$Q"; echo "=END_QUEUE="; cp /dev/null "$Q" 2>/dev/null || true; fi';
        const port = srv.port || 22;
        const args = [...baseArgs];
        if (port !== 22) args.push('-P', port.toString());
        args.push(`${srv.user}@${srv.host}`, cmd);
        sshArgs = args;
    } else {
        // Via jump host
        const via = SSH_SERVERS[srv.via];
        const port = srv.port || 22;
        const innerPortArgs = port !== 22 ? ` -p ${port}` : '';
        const innerCmd = `ssh -T -o BatchMode=yes -o StrictHostKeyChecking=accept-new${innerPortArgs} ${srv.user}@${srv.host} "if [ -f /tmp/.msa_viewer_queue ]; then cat /tmp/.msa_viewer_queue && rm /tmp/.msa_viewer_queue; fi"`;
        sshArgs = [...getPlinkBaseArgs(via), `${via.user}@${via.host}`, innerCmd];
    }

    const child = spawn('plink', sshArgs, { timeout: 10000 });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
        if (code !== 0) {
            const message = stderr.trim() || `plink exited with code ${code}`;
            console.error(`[POLL] ${serverKey} failed: ${message}`);
            return res.status(500).json({ error: message });
        }
        // Extract content between markers to avoid MOTD pollution
        const startMarker = '=START_QUEUE=';
        const endMarker = '=END_QUEUE=';
        
        const startIdx = stdout.indexOf(startMarker);
        const endIdx = stdout.indexOf(endMarker);
        
        let filePath = '';
        if (startIdx >= 0 && endIdx > startIdx) {
            const raw = stdout.substring(startIdx + startMarker.length, endIdx).trim();
            // Queue may have 2 lines (dir + filename from MC %d/%f) or 1 line (full path from %p)
            const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length >= 2) {
                // dir + filename
                const dir = lines[0].replace(/\/+$/, '');
                filePath = dir + '/' + lines[1];
            } else if (lines.length === 1) {
                filePath = lines[0];
            }
        }
        
        console.log(`[POLL] Queue check result: filePath="${filePath}", stdout length=${stdout.length}`);
        if (!filePath) return res.json({ queued: false });
        console.log(`[POLL] Returning queued file: ${filePath}`);
        res.json({ queued: true, server: serverKey, file: filePath });
    });
    child.on('error', (err) => res.status(500).json({ error: `SSH failed: ${err.message}` }));
});

app.get('/api/ssh-cat', (req, res) => {
    const filePath  = req.query.file;
    const serverKey = req.query.server || 'copilot';
    console.log(`[SSH-CAT] Fetching file: ${filePath} from ${serverKey}`);
    if (!filePath)  return res.status(400).json({ error: 'Missing "file" query parameter' });
    if (!SSH_SERVERS[serverKey]) return res.status(400).json({ error: `Unknown server: ${serverKey}` });
    if (/[;|&`$(){}\\]/.test(filePath)) return res.status(400).json({ error: 'Invalid characters in file path' });
    if (filePath.includes('..')) return res.status(400).json({ error: 'Path traversal not allowed' });

    const sshArgs = buildSshCatArgs(serverKey, filePath);
    if (!sshArgs) return res.status(400).json({ error: 'Bad server config' });

    const child = spawn('plink', sshArgs, { timeout: 30000 });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: stderr.trim() || `SSH exited with code ${code}` });
        if (!stdout.trim()) return res.status(404).json({ error: 'File is empty or not found' });
        res.json({ content: stripBanner(stdout), file: filePath, server: serverKey });
    });
    child.on('error', (err) => res.status(500).json({ error: `SSH failed: ${err.message}` }));
});

// List remote directory
app.get('/api/ssh-ls', (req, res) => {
    const dirPath   = req.query.dir || '~';
    const serverKey = req.query.server || 'copilot';
    if (/[;|&`$(){}\\]/.test(dirPath)) return res.status(400).json({ error: 'Invalid characters in path' });
    if (dirPath.includes('..')) return res.status(400).json({ error: 'Path traversal not allowed' });
    if (!SSH_SERVERS[serverKey]) return res.status(400).json({ error: `Unknown server: ${serverKey}` });

    const escaped   = dirPath.replace(/"/g, '\\"');
    const srv       = SSH_SERVERS[serverKey];
    const baseArgs  = getPlinkBaseArgs(srv);
    let sshArgs;
    if (!srv.via) {
        const port = srv.port || 22;
        sshArgs = [...baseArgs];
        if (port !== 22) sshArgs.push('-P', port.toString());
        sshArgs.push(`${srv.user}@${srv.host}`, `ls -1p "${escaped}"`);
    } else {
        const via = SSH_SERVERS[srv.via];
        const port = srv.port || 22;
        const innerPortArgs = port !== 22 ? ` -p ${port}` : '';
        const innerCmd = `ssh -T -o BatchMode=yes -o StrictHostKeyChecking=accept-new${innerPortArgs} ${srv.user}@${srv.host} "ls -1p \\"${escaped}\\""`;
        sshArgs = [...getPlinkBaseArgs(via), `${via.user}@${via.host}`, innerCmd];
    }

    const child = spawn('plink', sshArgs, { timeout: 10000 });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: stderr.trim() || `ls failed` });
        const entries = stdout.trim().split('\n').filter(Boolean);
        res.json({ dir: dirPath, entries });
    });
    child.on('error', (err) => res.status(500).json({ error: `SSH failed: ${err.message}` }));
});

// ============ BAM/CRAM → SAM CONVERSION ============
app.post('/api/bam2sam', (req, res) => {
    const { bamPath, region } = req.body;
    if (!bamPath) return res.status(400).json({ error: 'Missing bamPath' });
    // Path traversal guard
    if (/[;|&`$(){}\\]/.test(bamPath)) return res.status(400).json({ error: 'Invalid path' });
    if (bamPath.includes('..')) return res.status(400).json({ error: 'Path traversal not allowed' });

    try {
        const args = ['view', '-h'];
        if (region && /^[\w.-]+:\d+-\d+$/.test(region)) args.push(region);
        args.push(bamPath);

        const child = spawn('samtools', args, { timeout: 30000, maxBuffer: 100 * 1024 * 1024 });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('close', code => {
            if (code !== 0) return res.status(500).json({ error: stderr || 'samtools failed' });
            res.json({ success: true, sam: stdout });
        });
        child.on('error', err => res.status(500).json({ error: err.message }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    const tailscaleIp = process.env.TAILSCALE_IP || '';
    const tailscaleMsg = tailscaleIp ? `  (also on Tailscale ${tailscaleIp}:${PORT})` : '';
    console.log(`ViewAlign server running on http://localhost:${PORT}${tailscaleMsg}`);
    initializeDatabases();
    loadDbCache();
});
