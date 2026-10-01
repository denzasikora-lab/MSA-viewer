// Scenario 'indel-rich': families separated mainly by group-specific insertions/deletions.
// In an ALIGNED matrix the indels appear as blocks of 5-60 gap columns that are shared
// (with jitter) by every member of one family and absent from the others; substitutions
// are mild (2-4%). Gaps carry the signal here, so methods that count only match/mismatch
// columns mostly see near-identical nucleotides.

function mulberry32(a) {
    a = a >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const B = 'ACGT';
const TR = { A: 'G', G: 'A', C: 'T', T: 'C' };

function substitution(ch, r, p) {
    // p = per-site substitution probability ~= (2-4)% ; slight transition bias
    if (r() >= p) return ch;
    return r() < 0.55 ? TR[ch] : B[(B.indexOf(ch) + 1 + Math.floor(r() * 3)) % 4];
}

`
module.exports` placeholder removed below; see full source.

// --- begin real body ---
(function () {})();
