// Scenario "microvariants": twelve closely related haplotype families in a 300-column alignment whose
// shared consensuses differ by only 1-3 substitutions, with 8-15 identical/near-identical members each.
// Follows tests/kmer/SCENARIO_CONTRACT.md. No require, no Math.random, deterministic in `seed`.

const L = 300;                      // alignment columns
const NFAM = 12;                    // families
const NHOST = 3;                    // hotspot columns carrying ALL between-family signal
const HOT_RANGE = [[40, 100], [130, 176], [210, 262]]; // 0-based inclusive, disjoint -> 3 distinct hotspots
const SIZE_LO = 8, SIZE_HI = 15;    // members per family
const PRIV_P = 0.35;                // fraction of members carrying exactly one private substitution
const MINSIZE = 3;
const BASES = ['A', 'C', 'G', 'T'];

// mulberry32: small seeded PRNG (deterministic, no Math.random)
function mulberry32(s) {
    let a = (s >>> 0) || 1;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

module.exports = {
    id: 'microvariants',
    title: 'Twelve haplotype families 1-3 substitutions apart',
    describe: 'Models closely related haplotypes of one SNP-rich block (viral quasi-species, one recombining locus): ' +
        'twelve families over a 300-column alignment whose consensuses differ at only 1-3 of 300 columns ' +
        '(0.3-1% divergence), each with 8-15 members that are exact copies of the family consensus or carry ' +
        'exactly one private substitution. Hard because the whole between-family signal is 1-3 mutations: ' +
        'for k above ~3 a single substitution still falls inside many shared k-mers, so Jaccard/Mash saturate ' +
        'near 1 and families one hotspot allele apart tend to merge.',
    generate(seed) {
        const R = mulberry32((Math.imul((seed >>> 0) || 1, 0x9E3779B9) ^ 0x85EBCA6B) >>> 0);

        // shared reference sequence (GC 50%)
        const founder = new Array(L);
        for (let i = 0; i < L; i++) founder[i] = R() < 0.5 ? (R() < 0.5 ? 'G' : 'C') : (R() < 0.5 ? 'A' : 'T');

        // three hotspot columns, one per disjoint range; families mutate ONLY here, hence any two family
        // consensuses differ at <= NHOST = 3 columns, and distinct allele patterns keep them >= 1 apart.
        const hot = HOT_RANGE.map((r) => r[0] + Math.floor(R() * (r[1] - r[0] + 1)));
        const alt = hot.map((h) => BASES.filter((b) => b !== founder[h]));   // 3 alternative alleles each
        const hotSet = new Set(hot);
        const freeCols = [];
        for (let i = 0; i < L; i++) if (!hotSet.has(i)) freeCols.push(i);

        // family allele pattern: NHOST entries, -1 = reference allele, 0..2 = index into alt[j]
        const key = (p) => p.join(',');
        const used = new Set();
        const drawPattern = () => {
            for (let t = 0; t < 800; t++) {
                const p = new Array(NHOST).fill(-1);
                const k = 1 + Math.floor(R() * NHOST);            // 1-3 substitutions
                const idx = [];
                for (let j = 0; j < NHOST; j++) idx.push(j);
                for (let i = idx.length - 1; i > 0; i--) {        // pick k distinct hotspots
                    const j = Math.floor(R() * (i + 1));
                    const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
                }
                for (let i = 0; i < k; i++) p[idx[i]] = Math.floor(R() * 3);
                const kk = key(p);
                if (!used.has(kk)) { used.add(kk); return p; }
            }
            // deterministic fallback: first unused pattern of a canonical enumeration (63 non-reference patterns)
            for (let c = 1; c < (1 << (2 * NHOST)); c++) {
                const p = new Array(NHOST);
                let cc = c;
                for (let j = 0; j < NHOST; j++) { const v = cc & 3; cc >>>= 2; p[j] = v === 0 ? -1 : v - 1; }
                const kk = key(p);
                if (!used.has(kk)) { used.add(kk); return p; }
            }
            throw new Error('microvariants: pattern space exhausted');
        };

        const cons = [], sizes = [];
        for (let f = 0; f < NFAM; f++) {
            const p = drawPattern();
            const s = founder.slice();
            for (let j = 0; j < NHOST; j++) if (p[j] >= 0) s[hot[j]] = alt[j][p[j]];
            cons.push(s);
            sizes.push(SIZE_LO + Math.floor(R() * (SIZE_HI - SIZE_LO + 1)));
        }

        // members: identical copies of the family consensus, or one private substitution at a non-hotspot column
        const rows = [];
        for (let f = 0; f < NFAM; f++) {
            for (let m = 0; m < sizes[f]; m++) {
                const s = cons[f].slice();
                const priv = R() < PRIV_P;
                if (priv) {
                    const c = freeCols[Math.floor(R() * freeCols.length)];
                    const o = BASES.filter((b) => b !== s[c]);
                    s[c] = o[Math.floor(R() * o.length)];
                }
                const pad = (v) => String(v).padStart(2, '0');
                rows.push({
                    header: `microvariants|fam${pad(f + 1)}|mem${pad(m + 1)}|${priv ? 'priv1' : 'priv0'}`,
                    seq: s.join(''),
                    label: f,
                });
            }
        }

        // shuffle rows so the file order carries no information
        const idx = rows.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(R() * (i + 1));
            const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
        }
        const seqs = idx.map((i) => ({ header: rows[i].header, seq: rows[i].seq }));
        const labels = idx.map((i) => rows[i].label);
        const n = seqs.length;

        // diagnostics for the notes: family-consensus distance range and realised within/between p-distance
        let minCons = L, maxCons = 0, sumCons = 0, nCons = 0;
        for (let f = 0; f < NFAM; f++) {
            for (let g = f + 1; g < NFAM; g++) {
                let d = 0;
                for (let i = 0; i < L; i++) if (cons[f][i] !== cons[g][i]) d++;
                if (d < minCons) minCons = d;
                if (d > maxCons) maxCons = d;
                sumCons += d; nCons++;
            }
        }
        let win = 0, winN = 0, bet = 0, betN = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let d = 0;
                for (let c = 0; c < L; c++) if (seqs[i].seq[c] !== seqs[j].seq[c]) d++;
                if (labels[i] === labels[j]) { win += d; winN++; } else { bet += d; betN++; }
            }
        }
        const notes = `${n} rows x ${L} columns, ${NFAM} families of ${Math.min(...sizes)}-${Math.max(...sizes)} members (minSize ${MINSIZE}); ` +
            `every family pair differs at ${minCons}- ${maxCons} columns (mean ${(sumCons / nCons).toFixed(1)}); ` +
            `~${Math.round(PRIV_P * 100)}% of members carry exactly one private substitution, so realised within-family p-distance ` +
            `${(win / winN).toFixed(2)} vs between-family ${(bet / betN).toFixed(2)}. Expected difficulty: minSize 2-3 should recover the ` +
            `families, but only barely - the between-family signal is 1-3 substitutions over three hotspot columns, so for larger k a ` +
            `substitution falls inside k-mers shared by both families and Jaccard/Mash saturate near 1; pairs of families one allele ` +
            `apart at a single hotspot merge first. Known limit: ~${Math.round(PRIV_P * 100)}% of members sit one private mutation away ` +
            `from their consensus, so some cross-family pairs are as close as some within-family pairs, and each family contains ` +
            `near-duplicate rows that create zero-distance merges; no distance metric can separate those columns perfectly.`;

        return { seqs, labels, minSize: MINSIZE, notes };
    },
};
