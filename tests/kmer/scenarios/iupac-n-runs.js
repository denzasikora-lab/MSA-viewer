// Scenario module per tests/kmer/SCENARIO_CONTRACT.md: one synthetic ALIGNMENT with KNOWN labels.
//
// iupac-n-runs: a real phylogeny underneath, dirty sequencing on top.
//   * 5 groups x 10 sequences, 600 columns. Group consensuses are evolved 4% per branch from a
//     shared founder (=> ~8% between consensuses), members 1% from their consensus, which
//     realises ~2% divergence WITHIN a group and ~10% BETWEEN groups.
//   * Then, per sequence and independently of group, two artefacts are written ON TOP of the
//     true bases by overwriting characters in place (never inserting or deleting, so every row
//     keeps the same length):
//       - heterozygote-style IUPAC calls (R,Y,S,W,K,M) at 1% of columns, drawn from the codes
//         whose set CONTAINS the true base, so an ambiguity never contradicts the truth;
//       - with probability 0.25, one contiguous run of N, length uniform 5..40.
//   * labels[i] is the group sequence i was bred from: ground truth by construction. The
//     artefacts carry NO group signal, and the headers are deliberately neutral.
//
// Why it is hard (the point of the scenario, and it is method-specific): kmer-tree.js's
// profile() DROPS every non-ACGT/U character and keeps reading, so a k-mer BRIDGES over a
// single R/Y/... and over a whole N run. A substitution covered by an ambiguity code therefore
// vanishes from the k-mer signal instead of distinguishing two sequences, and an N run deletes
// 5..40 informative columns while emitting bridging k-mers essentially unique to the carrier,
// inflating its distance to its own group. Expect the five groups to stay easy (10% vs 2% is a
// large margin) while the ~25% of rows carrying an N run wander onto long branches: per-sequence
// recall on exactly those rows is the sensitive metric.

const BASES = 'ACGT';
// Codes grouped by the bases they alias, so each call stays consistent with the truth.
const DIPLOID = { A: ['R', 'W', 'M'], C: ['Y', 'S', 'M'], G: ['R', 'S', 'K'], T: ['Y', 'W', 'K'] };

module.exports = {
    id: 'iupac-n-runs',
    title: 'IUPAC ambiguity calls and runs of N over a 5-group family',
    describe: 'Five real groups of 10 sequences (600 columns) ~10% apart pairwise and ~2% within, '
        + 'then every sequence is dirtied independently of its group: IUPAC ambiguity codes '
        + '(R,Y,S,W,K,M) at 1% of columns and, in 25% of the sequences, one contiguous run of N '
        + '5-40 columns long. The hard part is not the family structure but the interaction of the '
        + 'artefacts with a k-mer profile: non-ACGT characters are skipped and bridged, so ambiguous '
        + 'columns hold no information, and an N run deletes informative columns while adding '
        + 'carrier-unique bridging k-mers that push the sequence onto a long branch away from its '
        + 'true group.',
    generate,
};

// mulberry32: small, seedable, no Math.random (a contract rule). generate is deterministic in seed.
function mulberry32(a) {
    a = (a >>> 0) || 1;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generate(seed) {
    const GROUPS = 5, PER_GROUP = 10, LEN = 600;
    const P_CONSENSUS = 0.040;   // founder -> consensus (realises ~10% BETWEEN group members)
    const P_MEMBER = 0.010;      // consensus -> member (realises ~2% WITHIN a group)
    const P_DIPLOID = 0.01;      // 1% of columns get an IUPAC code
    const P_RUN = 0.25;          // 25% of sequences get one N run
    const R = mulberry32(Number(seed) || 1);
    const pick = () => BASES[(R() * 4) | 0];

    // Substitutions along a branch; a hit always replaces the base with a DIFFERENT one.
    function evolve(chars, rate) {
        const o = chars.slice();
        for (let i = 0; i < o.length; i++) {
            if (R() >= rate) continue;
            const c = o[i];
            let n = pick();
            while (n === c) n = pick();
            o[i] = n;
        }
        return o;
    }

    // The ambiguity artefacts, applied after the phylogeny so they correlate with nothing.
    function dirty(chars) {
        for (let i = 0; i < chars.length; i++) if (R() < P_DIPLOID) chars[i] = DIPLOID[chars[i]][(R() * 3) | 0];
        if (R() < P_RUN) {
            const len = 5 + ((R() * 36) | 0);                 // 5..40 columns, inclusive
            const from = (R() * (chars.length - len)) | 0;     // anywhere, independent of group
            for (let i = from; i < from + len; i++) chars[i] = 'N';
        }
        return chars;
    }

    const founder = Array.from({ length: LEN }, pick);
    const seqs = [], labels = [];
    for (let g = 0; g < GROUPS; g++) {
        const consensus = evolve(founder, P_CONSENSUS);
        for (let m = 0; m < PER_GROUP; m++) {
            seqs.push(dirty(evolve(consensus, P_MEMBER)));
            labels.push(g);
        }
    }
    if (seqs.some(s => s.length !== LEN)) throw new Error('unaligned row');

    // Shuffle the rows (file order must not matter), keeping labels in step.
    const order = seqs.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = (R() * (i + 1)) | 0;
        const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    const rows = order.map((old, pos) => ({ header: 'seq_' + (pos + 1), seq: seqs[old].join('') }));
    const lab = order.map(old => labels[old]);

    // Measured facts, so the notes below are honest for THIS seed rather than aspirational.
    const nRows = rows.filter(r => r.seq.includes('N')).length;
    const nN = rows.reduce((t, r) => t + (r.seq.match(/N/g) || []).length, 0);
    const nCodes = rows.reduce((t, r) => t + (r.seq.match(/[RYSWKM]/g) || []).length, 0);
    const plain = c => c === 'A' || c === 'C' || c === 'G' || c === 'T';
    let wDiff = 0, wN = 0, bDiff = 0, bN = 0;
    for (let i = 0; i < rows.length; i++) {
        const a = rows[i].seq;
        for (let j = i + 1; j < rows.length; j++) {
            const b = rows[j].seq;
            let d = 0, n = 0;
            for (let t = 0; t < LEN; t++) {
                const x = a[t], y = b[t];
                if (plain(x) && plain(y)) { n++; if (x !== y) d++; }   // ambiguous columns ignored here
            }
            if (lab[i] === lab[j]) { wDiff += d; wN += n; } else { bDiff += d; bN += n; }
        }
    }
    const pct = x => (100 * x).toFixed(1) + '%';
    const within = wN ? wDiff / wN : 0, between = bN ? bDiff / bN : 0;

    const notes =
        'Ground truth: ' + GROUPS + ' groups x ' + PER_GROUP + ' sequences, ' + LEN + ' columns, no gaps; '
        + 'labels[i] is the group sequence i was generated from, so the labels are correct by '
        + 'construction and the headers carry no information. Measured on columns where both '
        + 'sequences are plain ACGT, this seed: ' + pct(within) + ' divergence within a group vs '
        + pct(between) + ' between groups, so the five groups themselves should stay recoverable; '
        + 'that margin is what the artefacts have to erode. Artefacts actually placed here: '
        + nCodes + ' IUPAC calls (~1% of columns, each consistent with the base beneath it) and '
        + nRows + '/' + rows.length + ' rows carrying an N run (' + nN + ' N columns in total, one '
        + 'run per affected sequence, never longer than 40). Expected difficulty: moderate and '
        + 'concentrated - a k-mer profile like the one in kmer-tree.js drops non-ACGT characters '
        + 'and bridges straight over them, so differences hidden under an ambiguity code disappear '
        + 'from the signal and each N run both deletes 5-40 informative columns and emits bridging '
        + 'k-mers essentially unique to the carrier; the failure mode to watch is therefore '
        + 'per-sequence recall on exactly those ' + nRows + ' rows (long branches, late or wrong '
        + 'attachment), not the group-level split. Known limits: labels remain the TRUE group even '
        + 'for the dirtiest rows, so a method that legitimately quarantines heavily ambiguous rows '
        + 'will disagree with the labels on those rows - score the run-free rows separately if you '
        + 'want that disagreement removed; runs are independent of group and never shared between '
        + 'two sequences, so bridging k-mers cannot manufacture false within-group signal.';

    return { seqs: rows, labels: lab, minSize: 3, notes };
}
