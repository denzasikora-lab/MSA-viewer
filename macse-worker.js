'use strict';
/**
 * macse-worker.js: runs macse-align.js (a port of MACSE v2.07 alignSequences) off the main thread for ViewAlign.
 * Part of the MACSE port, distributed under CeCILL 2.1 (LICENSE-MACSE). Made by Toki-bio for ViewAlign, 2026-10-04.
 *
 * Two roles, chosen by the message type:
 *   'align': the coordinator. Runs MacseAlign.alignSequencesAsync and spreads its profile alignments over a pool of
 *            nested workers (this same file); without nested workers it runs everything in this thread. Same result.
 *   'dp':    a pool member. Runs one task (MacseAlign.runTask: a whole profile alignment, or one tile of a large
 *            one) and posts the result back.
 * Messages to the page use the protocol of mafft-worker.js / codon-align-worker.js: {id, progress} while running,
 * then {id, ok, result, aa, stats} or {id, ok:false, error}.
 */
const _v = self.location && self.location.search ? self.location.search : '';
importScripts('macse-dp-wasm.js' + _v, 'macse-align.js' + _v);

// ---- helpers for the page (input check, letters, statistics)
function parseFasta(text) {
    const out = []; let cur = null;
    for (const raw of String(text).split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        if (line[0] === '>') { cur = { name: line.slice(1).trim(), seq: '' }; out.push(cur); }
        else if (cur) cur.seq += line;
    }
    return out;
}
const toFasta = recs => recs.map(r => '>' + r.name + '\n' + r.seq + '\n').join('');
const NT_OK = /[ACGTUNRYKMSWBDHVacgtunrykmswbdhv]/;
// Same rule and message as the fast aligner: refuse protein-like input (MACSE would read it as N's).
function checkNucleotide(recs) {
    let bad = 0, tot = 0, worst = null, worstFrac = 0;
    for (const r of recs) {
        let b = 0;
        for (const ch of r.seq) if (!NT_OK.test(ch)) b++;
        bad += b; tot += r.seq.length;
        const f = r.seq.length ? b / r.seq.length : 0;
        if (f > worstFrac) { worstFrac = f; worst = r.name; }
    }
    if (tot > 0 && (bad / tot > 0.02 || worstFrac > 0.1)) {
        throw new Error('the input does not look like nucleotide coding sequences (' + (100 * bad / tot).toFixed(1) +
            '% non-nucleotide characters; worst: "' + String(worst).split(/\s+/)[0] + '" ' + (100 * worstFrac).toFixed(0) +
            '%). Codon alignment needs CDS in nucleotides.');
    }
}
// Codons carrying frameshift padding, and internal stop codons, per sequence (for the summary message).
function codonStats(nt, aa) {
    const frameshifts = [], internalStops = [];
    for (const r of nt) {
        let n = 0;
        for (let i = 0; i + 3 <= r.seq.length; i += 3) if (r.seq.slice(i, i + 3).includes('!')) n++;
        if (n) frameshifts.push({ name: r.name, n });
    }
    for (const r of aa) {
        const s = r.seq.replace(/[-!]+$/, '');                  // a final stop followed only by gaps is not internal
        const body = s.endsWith('*') ? s.slice(0, -1) : s;
        const n = (body.match(/\*/g) || []).length;
        if (n) internalStops.push({ name: r.name, n });
    }
    return { frameshifts, internalStops };
}

// ---- pool of nested workers. The next task taken is the one with the lowest priority number (the profile alignment
// the sequential program needs first); queued tasks of a cancelled generation are dropped.
function makePool(size) {
    const workers = [], idle = [], queue = [], pending = new Map();
    let nextId = 1;
    const takeNext = () => {
        let k = 0;
        for (let i = 1; i < queue.length; i++) if (queue[i].prio < queue[k].prio) k = i;
        return queue.splice(k, 1)[0];
    };
    // Tiles: send a DP's sequence sets to a thread only with the first tile of that DP it gets.
    const prepare = (w, job) => {
        const t = job.task;
        if (t.kind !== 'tile') return t;
        if (w.sent.has(t.dpKey) && !job.resend) { const { s1, s2, ...rest } = t; return rest; }
        w.sent.add(t.dpKey);
        if (w.sent.size > 48) w.sent.delete(w.sent.values().next().value);
        return t;
    };
    const pump = () => {
        while (idle.length && queue.length) {
            const w = idle.pop(), job = takeNext();
            pending.set(job.id, job); job.worker = w;
            const task = prepare(w, job);
            w.postMessage({ type: 'dp', id: job.id, task }, job.resend ? [] : job.transfer);
        }
    };
    for (let i = 0; i < size; i++) {
        const w = new Worker(self.location.href);
        w.sent = new Set();
        w.onmessage = (ev) => {
            const { id, ok, result, error } = ev.data || {};
            const job = pending.get(id); pending.delete(id);
            if (job && ok && result && result.needSets) {          // the thread dropped this DP's sets: send them again
                w.sent.delete(job.task.dpKey); job.resend = true; queue.unshift(job);
                idle.push(w); pump(); return;
            }
            idle.push(w); pump();
            if (!job) return;
            if (ok) job.resolve(result); else job.reject(new Error(error));
        };
        w.onerror = (e) => { for (const job of pending.values()) if (job.worker === w) job.reject(new Error(e.message || 'worker error')); };
        workers.push(w); idle.push(w);
    }
    return {
        size,
        run(task, gen, prio) {
            return new Promise((resolve, reject) => {
                // task inputs are copied, not moved (a tile may have to be sent again with its sequence sets)
                queue.push({ id: nextId++, task, gen, prio: prio || 0, resolve, reject, transfer: [] });
                pump();
            });
        },
        cancel(gen) { for (let i = queue.length - 1; i >= 0; i--) if (queue[i].gen === gen) { queue[i].reject(new Error('cancelled')); queue.splice(i, 1); } },
        close() { for (const w of workers) w.terminate(); }
    };
}
function poolSize(requested) {
    if (typeof Worker === 'undefined') return 0;                     // no nested workers in this browser
    const hw = (self.navigator && self.navigator.hardwareConcurrency) || 2;
    return Math.max(0, Math.min(requested || 8, hw - 1));
}

let sharedPool = null;
async function alignMacse(records, opts, post) {
    // Internal names: MACSE splits clade labels on ',' and '(' ')' and drops repeated names; the alignment does not
    // depend on the names otherwise. MACSE reads U and IUPAC letters other than R/Y/N as N; U is aligned as T and
    // the output gets the user's own letters back.
    const ids = records.map((r, i) => 's' + i);
    const input = records.map((r, i) => ({ name: ids[i], seq: r.seq.replace(/[Uu]/g, c => (c === 'U' ? 'T' : 't')) }));
    const o = { gc: opts.gc || 1, maxTracebackCells: opts.maxTracebackCells || 2.5e8, onProgress: post };
    if (opts.fs != null) o.fs = opts.fs;
    if (opts.stop != null) o.stop = opts.stop;
    // The pool is kept for the next alignment (the page keeps this worker for a while and terminates it, with its
    // nested workers, on cancel); a pool that saw an error is replaced.
    const n = poolSize(opts.threads);
    if (!sharedPool && n >= 2) { try { sharedPool = makePool(n); } catch (e) { sharedPool = null; } }
    const pool = sharedPool;
    let res;
    try { res = await MacseAlign.alignSequencesAsync(input, o, pool || MacseAlign.localRunner()); }
    catch (e) { if (pool) { pool.close(); sharedPool = null; } throw e; }
    const ntById = new Map(res.nt.map(r => [r.name, r.seq]));
    const aaById = new Map(res.aa.map(r => [r.name, r.seq]));
    const nt = [], aa = [];
    records.forEach((r, i) => {
        const aln = ntById.get(ids[i]);
        if (aln === undefined) throw new Error(`sequence ${r.name} was dropped by the aligner`);
        const orig = r.seq; let k = 0; const out = [];
        for (let p = 0; p < aln.length; p++) {
            const c = aln[p];
            out.push(c === '-' || c === '!' ? c : orig[k++]);
        }
        if (k !== orig.length) throw new Error(`internal: residue count changed for ${r.name}`);
        nt.push({ name: r.name, seq: out.join('') });
        aa.push({ name: r.name, seq: aaById.get(ids[i]) || '' });
    });
    const st = codonStats(nt, aa);
    const outNt = opts.frameRestored === false ? nt : nt.map(r => ({ name: r.name, seq: r.seq.replace(/!/g, '-') }));
    return {
        nt: outNt, aa,
        stats: {
            engine: 'macse', columns: nt.length ? nt[0].seq.length / 3 : 0, frameshifts: st.frameshifts, internalStops: st.internalStops,
            refineIterations: res.stats.refineIterations, threads: pool ? pool.size : 1, wasm: MacseAlign.wasmAvailable(), ms: res.stats.ms
        }
    };
}

self.onmessage = async (ev) => {
    const data = ev.data || {};
    if (data.type === 'dp') {                                        // pool member
        try { const result = MacseAlign.runTask(data.task); self.postMessage({ id: data.id, ok: true, result }, MacseAlign.transferables(result)); }
        catch (err) { self.postMessage({ id: data.id, ok: false, error: err?.message || String(err) }); }
        return;
    }
    if (data.type !== 'align') return;
    const { id, fasta, opts } = data;
    try {
        const records = parseFasta(fasta).map(r => ({ name: r.name, seq: r.seq.replace(/[-.!\s]/g, '') })).filter(r => r.seq.length);
        if (records.length < 2) throw new Error('Codon alignment needs at least 2 sequences');
        checkNucleotide(records);
        let last = 0;
        const res = await alignMacse(records, opts || {}, (stage, done, total, iter) => {
            const now = Date.now();
            if (now - last > 200 || done === total) { last = now; self.postMessage({ id, progress: { stage, done, total, iter } }); }
        });
        self.postMessage({ id, ok: true, result: toFasta(res.nt), aa: toFasta(res.aa), stats: res.stats });
    } catch (err) {
        self.postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
