'use strict';
// Fast frameshift-aware codon alignment (codon-align.js) off the main thread, same message protocol as mafft-worker.js.
// The MACSE engine runs in its own worker, macse-worker.js (CeCILL 2.1); this file and codon-align.js are MIT.
// The worker URL carries ?v=<build>; pass it on so codon-align.js is not served from a stale cache.
importScripts('codon-align.js' + (self.location && self.location.search ? self.location.search : ''));

self.onmessage = (ev) => {
    const { id, type, fasta, opts } = ev.data || {};
    if (type !== 'align') return;
    try {
        const records = CodonAlign.parseFasta(fasta).map(r => ({ name: r.name, seq: r.seq.replace(/[-.!]/g, '') }));
        if (records.length < 2) throw new Error('Codon alignment needs at least 2 sequences');
        const res = CodonAlign.alignMultiple(records, opts || {});
        self.postMessage({ id, ok: true, result: CodonAlign.toFasta(res.nt), aa: CodonAlign.toFasta(res.aa), stats: Object.assign({ engine: 'fast' }, res.stats) });
    } catch (err) {
        self.postMessage({ id, ok: false, error: err?.message || String(err) });
    }
};
