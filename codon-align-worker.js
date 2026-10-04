'use strict';
// Codon alignment off the main thread, same message protocol as mafft-worker.js.
//   opts.engine 'macse' (default): macse-align.js, a port of MACSE v2.07 alignSequences (identical alignments).
//   opts.engine 'fast': codon-align.js, the reference-based approximation (much faster on long or many sequences).
// The worker URL carries ?v=<build>; pass it on so the scripts are not served from a stale cache.
const _v = self.location && self.location.search ? self.location.search : '';
importScripts('codon-align.js' + _v, 'macse-align.js' + _v);

// Codons carrying frameshift padding, and internal stop codons, per sequence (for the summary message).
function _codonStats(nt, aa) {
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

function _alignMacse(records, opts, post) {
    // Internal names: MACSE splits clade labels on ',' and '(' ')' and drops duplicate names; the alignment does not
    // depend on the names otherwise. MACSE reads U and IUPAC letters other than R/Y/N as N; U is aligned as T and
    // the output gets the user's own letters back.
    const ids = records.map((r, i) => 's' + i);
    const input = records.map((r, i) => ({ name: ids[i], seq: r.seq.replace(/[Uu]/g, c => (c === 'U' ? 'T' : 't')) }));
    const o = { gc: opts.gc || 1, maxTracebackCells: opts.maxTracebackCells || 2.5e8, onProgress: post };
    if (opts.fs != null) o.fs = opts.fs;
    if (opts.stop != null) o.stop = opts.stop;
    const res = MacseAlign.alignSequences(input, o);
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
    const st = _codonStats(nt, aa);
    const outNt = opts.frameRestored === false ? nt : nt.map(r => ({ name: r.name, seq: r.seq.replace(/!/g, '-') }));
    return {
        nt: outNt, aa,
        stats: {
            engine: 'macse', columns: nt.length ? nt[0].seq.length / 3 : 0, frameshifts: st.frameshifts, internalStops: st.internalStops,
            refineIterations: res.stats.refineIterations, ms: res.stats.ms
        }
    };
}

self.onmessage = (ev) => {
    const { id, type, fasta, opts } = ev.data || {};
    if (type !== 'align') return;
    try {
        const records = CodonAlign.parseFasta(fasta).map(r => ({ name: r.name, seq: r.seq.replace(/[-.!\s]/g, '') }));
        if (records.length < 2) throw new Error('Codon alignment needs at least 2 sequences');
        const o = opts || {};
        if (o.engine === 'fast') {
            const res = CodonAlign.alignMultiple(records, o);
            self.postMessage({ id, ok: true, result: CodonAlign.toFasta(res.nt), aa: CodonAlign.toFasta(res.aa), stats: Object.assign({ engine: 'fast' }, res.stats) });
            return;
        }
        // Refuse protein-like input with the same message as the fast engine (MACSE would read it as N's).
        CodonAlign.checkNucleotide(records.map(r => ({ name: r.name, orig: r.seq })));
        let last = 0;
        const res = _alignMacse(records, o, (stage, done, total, iter) => {
            const now = Date.now();
            if (now - last > 200 || done === total) { last = now; self.postMessage({ id, progress: { stage, done, total, iter } }); }
        });
        self.postMessage({ id, ok: true, result: CodonAlign.toFasta(res.nt), aa: CodonAlign.toFasta(res.aa), stats: res.stats });
    } catch (err) {
        self.postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
