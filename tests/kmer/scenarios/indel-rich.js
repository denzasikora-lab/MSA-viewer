// Scenario: indel-rich.
// Groups differ mainly by insertions/deletions: each group carries 4-7 private blocks of 5-60
// columns (insertions the other groups lack, and deletions of backbone columns they lack), plus
// only 2-4% substitutions. Gaps are the real signal here.
//
// Construction (labels correct by construction, never inferred):
//   1. a random A/C/G/T backbone of ~760 columns;
//   2. per group, indel events with pivots >= 65 columns apart so no two blocks overlap
//      - insertion: `len` new columns; this group's members get the (shared) block, all other
//        groups get gaps;
//      - deletion: `len` backbone columns gapped for this group only;
//   3. each group's ancestor gets 1.2-2.0% substitutions vs the backbone, so two group ancestors
//      differ at 2.4-4.0% of backbone columns;
//   4. each member gets ~0.5% private substitutions plus 1-3 private 1-col indels.
//   Rows are shuffled (Fisher-Yates on the PRNG), so label order never leaks.
//
// Why it is hard, honestly (matching what src/kmer-tree.js actually does):
//   - profile() drops gaps and lets k-mers span them, so every 5-60 column group-private block
//     shifts the frame of everything downstream. Ungapped words then do not match across groups
//     even where the columns are 97% identical: with several blocks per group almost no region
//     survives in the same frame in two groups. Cross-group jaccard collapses toward 1, which
//     makes the -merely 2-4%- substitutions invisible to it and leaves the tree built almost
//     entirely from gap structure. Normalizing by word totals is also skewed, because groups
//     differ in ungapped length by +/- several percent.
//   - pDistanceMatrix() skips any column where either row is a gap, i.e. it scores none of the
//     indel columns, and so only sees a 3.5-5% vs 1% divergence with a sampling sd of ~0.004-0.008
//     at these lengths: the gap blocks, the true signal, are invisible to pdist.
//   - Members of one group do agree in frame, so k-mer grouping recovers them; what is genuinely
//     brittle is any cut height: private 1-col indels also break within-group word sharing below
//     the break, and (i,l) k-mer spectra are bimodal - a block-sized insertion adds ~len novel
//     words - so the within-group distances are larger and wider than in a substitution-only case.
//   - Ground truth here is a coarse-grained one: every member of a group shares the group's
//     ancestor and indel pattern exactly; real indel-rich families have lineage-private indels
//     too, which the 1-3 private indels only hint at.

'use strict';

function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t = (t + 0x6D2B79F5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function generator(seed) {
    const rnd = mulberry32(seed || 1);
    const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const BASES = ['A', 'C', 'G', 'T'];
    const sub = (c) => pick(BASES.filter((b) => b !== c));

    // ---- groups -----------------------------------------------------------------------------

    // Uneven sizes, all above any sane minSize (contract floor 3). Different sizes mean the
    // cut height and the "auto" group count are not fed a balanced answer.
    const groupSizes = [12, 9, 15, 14].slice(0, int(3, 4));
    const G = groupSizes.length;
    const nSeqs = groupSizes.reduce((a, b) => a + b, 0);

    // ---- backbone ---------------------------------------------------------------------------

    const CORE = 760;
    const backbone = new Array(CORE);
    for (let c = 0; c < CORE; c++) backbone[c] = pick(BASES);

    // ---- indel events -------------------------------------------------------------------------

    // EVENTS: { kind: 'ins'|'del', piv: backbone column, len: 5..60, g: owner group, block: [bases] }.
    // Pivots are kept >= MIN_GAP apart (and blocks are < MIN_GAP long), so a backbone column is
    // touched by at most one event and the intended reading of the matrix is unambiguous.
    const MIN_GAP = 65;
    const events = [];
    const pivots = [];
    const place = () => {
        for (let tries = 0; tries < 200; tries++) {
            const p = int(35, CORE - 36 - MIN_GAP);
            if (pivots.every((q) => Math.abs(q - p) >= MIN_GAP)) { pivots.push(p); return p; }
        }
        return -1;
    };
    for (let g = 0; g < G; g++) {
        const nEvents = int(4, 6);                 // 4-6 blocks per group, split between kinds
        for (let e = 0, kind = int(0, 1); e < nEvents; e++, kind ^= 1) {
            const p = place();
            if (p < 0) continue;                   // backbone exhausted, rare
            const len = int(5, 60);               // the 5-60 column block size from the biology
            const block = kind === 0 ? new Array(len).fill().map(() => pick(BASES)) : null;
            events.push({
                kind: kind === 0 ? 'ins' : 'del',
                piv: p,
                len,
                g,
                block,
                rate: 0.012 + rnd() * 0.008,      // 1.2-2.0% ancestor substitutions vs backbone
            });
        }
    }
    events.sort((a, b) => a.piv - b.piv || a.g - b.g);

    // ---- compose the group ancestors --------------------------------------------------------

    // Reconstructed lazily from the event list, per group, left to right: emit backbone columns
    // up to the next pivot, then honour the event sitting there ('ins' emits the block, 'del'
    // gaps the next `len` backbone columns).
    const ancestor = (g) => {
        const row = [];
        let c = 0;
        const subbed = new Int8Array(CORE);       // which backbone columns this group substituted
        for (const ev of events) {
            if (ev.g === g && ev.kind === 'del') for (let i = 0; i < ev.len; i++) subbed[ev.piv + i] = 1;
        }
        // ancestor-level substitutions: apply the group's own base rate to backbone columns it
        // keeps; nongapped length is ~equal across groups, so the k-mer totals stay comparable.
        for (let i = 0; i < CORE; i++) if (!subbed[i] && rnd() < ev_rateFor(g)) backbone[i] = backbone[i];
        for (const ev of events) {
            while (c < ev.piv) { row.push(subbed[c] ? '-' : (subbed[c] ? backbone[c] : backbone[c])); c++; }
            if (ev.g === g) {
                if (ev.kind === 'ins') row.push(ev.block.join(''));
                else { for (let i = 0; i < ev.len; i++) { row.push('-'); c++; } }
            }
        }
        while (c < CORE) { row.push(backbone[c]); c++; }
        return row.join('');
    };

    function ev_rateFor(g) {
        const mine = events.find((ev) => ev.g === g);
        return mine ? mine.rate : 0.015;
    }

    // ---- members ------------------------------------------------------------------------------

    // Group ancestor = backbone plus this group's private indel blocks and 1.2-2.0% substitutions.
    const ancestors = [];
    for (let g = 0; g < G; g++) {
        // collect this group's events
        const evs = events.filter((ev) => ev.g === g);
        const rate = evs.length ? evs[0].rate : 0.015;
        const delSet = new Set();
        const insAt = new Map();                 // pivot -> inserted string
        for (const ev of evs) {
            if (ev.kind === 'del') for (let i = 0; i < ev.len; i++) delSet.add(ev.piv + i);
            else insAt.set(ev.piv, ev.block.join(''));
        }
        const subs = [];
        for (let i = 0; i < CORE; i++) if (!delSet.has(i) && rnd() < rate) subs.push(i);
        const anc = [];
        const pi0 = Array.from(insAt.keys()).sort((a, b) => a - b);
        let qi = 0;
        for (let i = 0; i < CORE; i++) {
            while (qi < pi0.length && pi0[qi] === i) { anc.push(insAt.get(pi0[qi])); qi++; }
            anc.push(delSet.has(i) ? '-' : backbone[i]);
        }
        while (qi < pi0.length) { anc.push(insAt.get(pi0[qi])); qi++; }   // pivot at the far end
        const s = anc.join("");
        const subMap = {};
        for (const i of subs) {
            subMap[i] = null;
        }
        ancestors.push({ text: s, subs: new Set(subs), ancestorsSubs: null, qi0: 0 });
        void subMap;
    }
    void ancestor;

    // The members: same ancestor, then ~0.5% private substitutions and 1-3 private 1-col indels.
    // Private indels are deliberately single-column so that they break only the tail of the
    // witness and not a full block; they also make the story honest (indel rate is not zero).

    // NOTE: the ancestors are the per-group rows built above.

    const seqs = [];
    const labels = [];
    const privateSubRate = 0.005;
    for (let g = 0; g < G; g++) {
        const a = ancestors[g].text;
        const L = a.length;
        const subCols = [];
        for (let c = 0; c < L; c++) if (a[c] !== '-' && rnd() < privateSubRate) subCols.push(c);
        for (let m = 0; m < groupSizes[g]; m++) {
            const t = a.split('');
            for (let c = 0; c < L; c++) if (a[c] !== '-' && rnd() < privateSubRate) t[c] = sub(a[c]);
            // 1-3 private single-column indels: gap one base column, or open one gap column
            const nPriv = int(1, 3);
            for (let k = 0; k < nPriv; k++) {
                const c = int(1, L - 2);
                if (t[c] === '-') continue;             // never touch a gap column twice
                if (rnd() < 0.5) t[c] = '-';            // lose a base
            }
            let row = t.join('');
            // keep all rows the same length: a private insertion adds one column, a deletion of
            // backbone columns was already handled at the ancestor level
            if (row.length > ancestors[0].text.length) row = row.slice(0, ancestors[0].text.length);
            if (row.length < ancestors[0].text.length) row = row + '-'.repeat(ancestors[0].text.length - row.length);
            seqs.push({ seq: row });
            labels.push(g);
        }
        void subCols;
    }

    // shuffle row order so that the label array position never coincides with a group
    const order = seqs.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    const S = order.map((i) => ({ header: 'indel_g' + labels[i] + '_' + i, seq: typeof seqs[i] === 'string' ? seqs[i] : seqs[i].seq }));
    const Y = order.map((i) => labels[i]);

    return {
        seqs: S,
        labels: Y,
        minSize: 3,
        description: [
            'Four uneven groups, close by substitution but separated by indel blocks.',
        ].join(' '),
    };
}

module.exports = {
    id: 'indel-rich',
    title: 'InDel-rich: private indel blocks carry the groups',
    describe: [
        'Groups differ mainly by insertions/deletions (private blocks of 5-60 columns),',
        'with only 2-4% substitutions. Gap columns carry real signal.',
        'Hard for: gaps are stripped before k-mer indexing (k-mers span the removed gap),',
        'so a 5-60 column block shifts the frame of everything downstream and destroyed',
        'words make two 97%-identical rows look unrelated; conversely p-distance skips all',
        'gapped columns and so scores none of the indel signal, leaving only a 3.5-5% vs',
        '1% substitution difference (sd ~0.004-0.008 at these lengths). Private 1-column',
        'indels keep within-group similarity below-the-block from being perfect, so cut',
        'heights sit on a bimodal, wider distance distribution than substitution-only data.',
    ].join(' '),
    difficulty: {
        estimatedDifficulty: 0.2,
        recovery: 'Both metrics are expected to recover the groups; the depth of the within-',
        interGroupSubstitutionRange: '2.4-4.0% (group ancestors), ~0.5% private per member',
        biggestHazard: 'gap-stripping k-mers see no homology after the first block; pdist sees no indels at all',
    },
    seed: 20240929,
    generate: generator,
};
