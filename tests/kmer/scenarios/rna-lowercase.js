// Scenario "rna-lowercase" (tests/kmer/SCENARIO_CONTRACT.md).
//
// RNA reads written with U (no T anywhere), where 30% of the rows carry soft-masked
// (lower-case) stretches of 10-80 bases, drawn from 5 diverged families.
//
// The point of this scenario is ALPHABET and CASE normalisation, not the tree: the
// labels come from the simulation itself, so they are exact by construction.  A k-mer
// implementation that folds case and treats U as T must find this as easy as an
// unmasked DNA alignment; one that does not gets corrupted profiles on 30% of the
// rows and tears families apart.
//
// No require(), no file/network access, no Math.random(): everything is driven by
// mulberry32(seed), so generate(seed) is fully deterministic.

function mulberry32(a) {
    return function () {
        a = (a + 0x6D2B79F5) | 0;                       // keep it 32-bit
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // uniform in [0, 1)
    };
}

// Substitution options per RNA base (no gaps, no N: only A/C/G/U ever appears).
const ALT = { A: ['C', 'G', 'U'], C: ['A', 'G', 'U'], G: ['A', 'C', 'U'], U: ['A', 'C', 'G'] };

// Jukes-Cantor style: `d` = expected substitutions per site in the new branch.
function mutate(row, d, R) {
    const p = 0.75 * (1 - Math.exp(-4 * d / 3));
    const out = row.slice();
    for (let i = 0; i < out.length; i++) {
        if (R() < p) { const alts = ALT[out[i]]; out[i] = alts[Math.floor(R() * 3)]; }
    }
    return out;
}

module.exports = {
    id: 'rna-lowercase',
    title: 'RNA alphabet (U) with soft-masked lower-case stretches, 5 families',
    describe: 'Sixty aligned RNA reads (U instead of T) drawn from 5 diverged families: '
        + 'about 13% consensus divergence between families and 2% within, so the '
        + 'families are genuinely recoverable. 30% of the reads additionally carry '
        + 'soft-masked lower-case stretches of 10-80 bases (1-4 stretches per masked '
        + 'read), as RepeatMasker-style masking does to transcript assemblies. '
        + 'What is hard here is not the tree but normalisation: the k-mer code must '
        + 'fold case and treat U as T, otherwise 30% of the rows get corrupted '
        + 'profiles. There are no gaps or ambiguous characters, so nothing else can '
        + 'be blamed for a wrong answer.',
    generate(seed) {
        const R = mulberry32((seed >>> 0) || 1);
        const LEN = 600, G = 5, PER = 12;               // 60 rows x 600 columns
        const GC = 0.45;                                 // founder GC content

        // founding sequence, then one consensus per family: ~0.15 subs/site apart
        const base = () => (R() < GC ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'U'));
        const founder = Array.from({ length: LEN }, base);
        const cons = Array.from({ length: G }, () => mutate(founder, 0.15, R));

        const rows = [], labels = [];
        for (let g = 0; g < G; g++) {
            for (let m = 0; m < PER; m++) {
                rows.push({ header: 'family' + g + '_read' + m, arr: mutate(cons[g], 0.02, R) }); // within family
                labels.push(g);                          // true label, known by construction
            }
        }

        // soft masking: 30% of the reads get 1-4 random stretches of 10-80 bases
        // lower-cased. Stretches may overlap and may run off the end (clipped).
        let masked = 0;
        rows.forEach(q => {
            if (R() < 0.30) {
                masked++;
                const n = 1 + Math.floor(R() * 4);
                for (let s = 0; s < n; s++) {
                    const start = Math.floor(R() * LEN), span = 10 + Math.floor(R() * 71); // 10..80
                    for (let j = start; j < Math.min(LEN, start + span); j++) q.arr[j] = q.arr[j].toLowerCase();
                }
            }
            q.seq = q.arr.join(''); delete q.arr;
        });

        // shuffle the row order (file order must not matter), keeping labels in step
        const idx = rows.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }

        return {
            seqs: idx.map(i => rows[i]),
            labels: idx.map(i => labels[i]),
            minSize: 3,
            notes: 'Expected difficulty: LOW for a correct implementation - and that is the '
                + 'point. kmer-tree.js maps upper and lower case to the same 2-bit codes and '
                + 'counts U as T, so case and U/T must change NOTHING: the answer must equal '
                + 'the answer for the same data upper-cased with T. The traps: (a) accepting '
                + 'only upper-case A/C/G/T silently deletes the masked stretches and shortens '
                + 'or shifts k-mer windows (up to 320 of 600 columns per masked row); '
                + '(b) treating U as an unknown character does the same for EVERY row. '
                + 'Labels are exact ground truth (12 rows per family, 5 families, 60 rows); '
                + 'use them against guideTree()/cutTree(). This seed soft-masks ' + masked + ' of '
                + rows.length + ' rows. Known limits: no gaps, no N or IUPAC codes, no '
                + 'truncation, all rows 600 columns - gap handling is deliberately NOT '
                + 'exercised here; the families are easy to separate (~13% between, ~2% '
                + 'within), so a failure on this data points at a normalisation bug, not a '
                + 'clustering bug.'
        };
    }
};
