// Runs the staged validation sweep described in VALIDATION_PLAN.md against
// directly-constructed matrices with known ground truth (no MAFFT - the
// point here is validating the biclustering LOGIC, not alignment quality).
// Appends a results table + conclusion per stage into VALIDATION_PLAN.md.
'use strict';
const fs = require('fs');
const path = require('path');
const BC = require('../../block-bicluster.js');

const BASES = 'ACGT';
let seedState = 12345;
function rnd() { // deterministic PRNG (mulberry32), reproducible sweeps
  seedState |= 0; seedState = (seedState + 0x6D2B79F5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function seed(n) { seedState = n; }
function randSeq(n) { let s = ''; for (let i = 0; i < n; i++) s += BASES[Math.floor(rnd() * 4)]; return s; }
function mutate(seq, rate) {
  let s = seq.split('');
  for (let i = 0; i < s.length; i++) if (rnd() < rate) s[i] = BASES[Math.floor(rnd() * 4)];
  return s.join('');
}
function toFasta(rows) { return rows.map(r => '>' + r[0] + '\n' + r[1]).join('\n') + '\n'; }

// ---- Stage 0: pure column separation, uniform rows ----------------------
function toy0(nRows, coreLen, flankLen, coreMutRate, sd) {
  seed(sd);
  const core = randSeq(coreLen);
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const el = mutate(core, coreMutRate);
    const fl = randSeq(flankLen); // independent random per row
    rows.push(['r' + i, el + fl]);
  }
  return { fasta: toFasta(rows), trueBoundary: coreLen };
}

// ---- Stage 1: single row-subset tail block, uniform length --------------
function toy1(nRows, coreLen, tailLen, subsetSize, subsetMutRate, sd) {
  seed(sd);
  const core = randSeq(coreLen);
  const tailShared = randSeq(tailLen);
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const el = mutate(core, 0.04);
    const tail = i < subsetSize ? mutate(tailShared, subsetMutRate) : randSeq(tailLen);
    rows.push(['r' + i, el + tail]);
  }
  return { fasta: toFasta(rows), coreLen, tailLen, plantedRows: Array.from({ length: subsetSize }, (_, i) => i) };
}

// ---- Stage 1b: subset + independent trailing-gap length variation -------
function toy1b(nRows, coreLen, tailLen, subsetSize, subsetMutRate, trimFrac, sd) {
  seed(sd);
  const core = randSeq(coreLen);
  const tailShared = randSeq(tailLen);
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const el = mutate(core, 0.04);
    let tail = i < subsetSize ? mutate(tailShared, subsetMutRate) : randSeq(tailLen);
    const cut = Math.floor(rnd() * trimFrac * tailLen);
    tail = tail.slice(0, tailLen - cut) + '-'.repeat(cut); // trailing gap = terminal, excluded properly
    rows.push(['r' + i, el + tail]);
  }
  return { fasta: toFasta(rows), coreLen, tailLen, plantedRows: Array.from({ length: subsetSize }, (_, i) => i) };
}

// ---- Stage 2a: 3 groups (2 distinct subsets + background) in one zone ---
function toy2a(nRows, coreLen, tailLen, sizeA, sizeB, sd) {
  seed(sd);
  const core = randSeq(coreLen);
  const typeA = randSeq(tailLen), typeB = randSeq(tailLen);
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const el = mutate(core, 0.04);
    let tail;
    if (i < sizeA) tail = mutate(typeA, 0.03);
    else if (i < sizeA + sizeB) tail = mutate(typeB, 0.03);
    else tail = randSeq(tailLen);
    rows.push(['r' + i, el + tail]);
  }
  return { fasta: toFasta(rows), coreLen, groupA: Array.from({ length: sizeA }, (_, i) => i),
           groupB: Array.from({ length: sizeB }, (_, i) => sizeA + i) };
}

// ---- Stage 2b: two independent zones, non-overlapping row subsets -------
function toy2b(nRows, coreLen, earlyLen, midLen, lateLen, subsetX, subsetY, sd) {
  seed(sd);
  const core = randSeq(coreLen);
  const earlyShared = randSeq(earlyLen), lateShared = randSeq(lateLen);
  const rows = [];
  for (let i = 0; i < nRows; i++) {
    const el = mutate(core, 0.04);
    const early = subsetX.includes(i) ? mutate(earlyShared, 0.03) : randSeq(earlyLen);
    const mid = randSeq(midLen); // divergent background between the two zones
    const late = subsetY.includes(i) ? mutate(lateShared, 0.03) : randSeq(lateLen);
    rows.push(['r' + i, el + early + mid + late]);
  }
  return { fasta: toFasta(rows), coreLen, earlyLen, midLen, subsetX, subsetY };
}

// ---- ground-truth comparison helpers -------------------------------------
function setEq(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}
function findRowSplitMatching(mask, planted) {
  const splits = mask.blocks.filter(b => b.rows !== 'all');
  for (const b of splits) if (setEq(b.rows, planted)) return b;
  // partial credit: best overlap
  let best = null, bestOverlap = 0;
  for (const b of splits) {
    const ov = b.rows.filter(r => planted.includes(r)).length;
    if (ov > bestOverlap) { bestOverlap = ov; best = b; }
  }
  return best ? Object.assign({ partial: true, overlap: bestOverlap, size: best.rows.length }, best) : null;
}

const rows_out = { s0: [], s1: [], s1b: [], s2a: [], s2b: [] };

// === Stage 0 sweep ===
for (const nRows of [5, 10, 30]) {
  for (const len of [20, 60, 150]) {
    for (const mut of [0.0, 0.05, 0.15, 0.30, 0.50]) {
      const t = toy0(nRows, len, len, mut, 1000 + nRows * 7 + len * 3);
      const m = BC.computeBiclusterMask(t.fasta, {});
      const colSplits = m.blocks.filter(b => b.rows === 'all').map(b => b.col_start);
      const nearBoundary = colSplits.some(c => Math.abs(c - t.trueBoundary) <= 3 || Math.abs(c - (t.trueBoundary - 1)) <= 3);
      const nBlocks = m.blocks.length;
      rows_out.s0.push({ nRows, len, mut, detected: nearBoundary, nBlocks });
    }
  }
}

// === Stage 1 sweep ===
for (const nRows of [10, 20, 50]) {
  for (const subsetSize of [2, 3, 5, 10]) {
    if (subsetSize >= nRows / 2) continue;
    for (const tailLen of [20, 60, 150]) {
      for (const mut of [0.0, 0.05, 0.15, 0.30]) {
        const t = toy1(nRows, 100, tailLen, subsetSize, mut, 2000 + nRows + subsetSize * 11 + tailLen);
        const m = BC.computeBiclusterMask(t.fasta, {});
        const found = findRowSplitMatching(m, t.plantedRows);
        rows_out.s1.push({
          nRows, subsetSize, tailLen, mut,
          exact: !!(found && !found.partial),
          partialOverlap: found && found.partial ? found.overlap + '/' + t.plantedRows.length : (found ? 'exact' : '0')
        });
      }
    }
  }
}

// === Stage 1b sweep (subset of Stage 1 params + trim severity) ===
for (const nRows of [10, 20]) {
  for (const subsetSize of [3, 5]) {
    for (const trim of [0.0, 0.15, 0.30]) {
      const t = toy1b(nRows, 100, 60, subsetSize, 0.05, trim, 3000 + nRows + subsetSize * 13 + Math.round(trim * 100));
      const m = BC.computeBiclusterMask(t.fasta, {});
      const found = findRowSplitMatching(m, t.plantedRows);
      rows_out.s1b.push({
        nRows, subsetSize, trim,
        exact: !!(found && !found.partial),
        partialOverlap: found && found.partial ? found.overlap + '/' + t.plantedRows.length : (found ? 'exact' : '0')
      });
    }
  }
}

// === Stage 2a sweep: 3-group detection ===
for (const [sizeA, sizeB] of [[5, 5], [3, 8], [8, 8]]) {
  const nRows = 30;
  const t = toy2a(nRows, 100, 70, sizeA, sizeB, 4000 + sizeA * 17 + sizeB * 19);
  const m = BC.computeBiclusterMask(t.fasta, {});
  const foundA = findRowSplitMatching(m, t.groupA);
  const foundB = findRowSplitMatching(m, t.groupB);
  rows_out.s2a.push({
    sizeA, sizeB,
    groupA: foundA ? (foundA.partial ? 'partial ' + foundA.overlap + '/' + sizeA : 'exact') : 'missed',
    groupB: foundB ? (foundB.partial ? 'partial ' + foundB.overlap + '/' + sizeB : 'exact') : 'missed'
  });
}

// === Stage 2b sweep: two independent zones ===
{
  const nRows = 20;
  const subsetX = [0, 1, 2, 3, 4], subsetY = [10, 11, 12, 13, 14];
  const t = toy2b(nRows, 80, 50, 60, 50, subsetX, subsetY, 5000);
  const m = BC.computeBiclusterMask(t.fasta, {});
  const foundX = findRowSplitMatching(m, subsetX);
  const foundY = findRowSplitMatching(m, subsetY);
  // check X and Y blocks land at different, non-overlapping column ranges
  const xCols = foundX ? [foundX.col_start, foundX.col_end] : null;
  const yCols = foundY ? [foundY.col_start, foundY.col_end] : null;
  const distinctZones = xCols && yCols && (xCols[1] < yCols[0] || yCols[1] < xCols[0]);
  rows_out.s2b.push({
    zoneX: foundX ? (foundX.partial ? 'partial ' + foundX.overlap + '/5' : 'exact') : 'missed',
    zoneY: foundY ? (foundY.partial ? 'partial ' + foundY.overlap + '/5' : 'exact') : 'missed',
    distinctZones: distinctZones === null ? 'n/a' : distinctZones
  });
}

// ---- write results into VALIDATION_PLAN.md -------------------------------
function table(rows, cols) {
  const header = '| ' + cols.join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n';
  return header + rows.map(r => '| ' + cols.map(c => r[c]).join(' | ') + ' |').join('\n');
}

let out = '\n\n---\n\n# Results (run ' + new Date().toISOString() + ')\n\n';

out += '## Results — Stage 0\n\n' + table(rows_out.s0, ['nRows', 'len', 'mut', 'detected', 'nBlocks']) + '\n\n';
const s0fails = rows_out.s0.filter(r => !r.detected);
out += '### Conclusion\n\n';
out += s0fails.length
  ? 'Column separation fails at: ' + s0fails.map(r => `nRows=${r.nRows},len=${r.len},mut=${r.mut}`).join('; ') + '.\n'
  : 'Column separation (core vs. independent flank) detected correctly across the whole swept range (mutation up to 50%, as few as 5 rows, region length down to 20bp).\n';

out += '\n## Results — Stage 1\n\n' + table(rows_out.s1, ['nRows', 'subsetSize', 'tailLen', 'mut', 'exact', 'partialOverlap']) + '\n\n';
const s1exact = rows_out.s1.filter(r => r.exact).length;
out += `### Conclusion\n\n${s1exact}/${rows_out.s1.length} exact recoveries. `;
const bySize = {};
rows_out.s1.forEach(r => { bySize[r.subsetSize] = bySize[r.subsetSize] || [0, 0]; bySize[r.subsetSize][1]++; if (r.exact) bySize[r.subsetSize][0]++; });
out += 'By subset size: ' + Object.entries(bySize).map(([k, v]) => `size=${k}: ${v[0]}/${v[1]}`).join(', ') + '.\n';

out += '\n## Results — Stage 1b (length variation)\n\n' + table(rows_out.s1b, ['nRows', 'subsetSize', 'trim', 'exact', 'partialOverlap']) + '\n\n';
const s1bExact = rows_out.s1b.filter(r => r.exact).length;
out += `### Conclusion\n\n${s1bExact}/${rows_out.s1b.length} exact recoveries under independent trailing-gap trimming. `;
out += 'Compare against Stage 1 baseline (trim=0.0 rows above) to isolate the effect of length variation alone.\n';

out += '\n## Results — Stage 2a (3 groups in one zone)\n\n' + table(rows_out.s2a, ['sizeA', 'sizeB', 'groupA', 'groupB']) + '\n\n';
out += '### Conclusion\n\n' + (rows_out.s2a.every(r => r.groupA === 'exact' && r.groupB === 'exact')
  ? 'Both planted groups recovered exactly in every tested size combination — the algorithm is not limited to a single binary split.\n'
  : 'At least one configuration failed to cleanly separate both groups — see table for which.\n');

out += '\n## Results — Stage 2b (two independent zones)\n\n' + table(rows_out.s2b, ['zoneX', 'zoneY', 'distinctZones']) + '\n\n';
out += '### Conclusion\n\n' + (rows_out.s2b[0].distinctZones === true
  ? 'Both independent row-subset zones recovered, at distinct non-overlapping column ranges as designed.\n'
  : 'Zones were not both found at distinct column ranges — see table.\n');

fs.appendFileSync(path.join(__dirname, 'VALIDATION_PLAN.md'), out);
console.log('Validation sweep complete. Summary:');
console.log('Stage 0: ' + (rows_out.s0.length - s0fails.length) + '/' + rows_out.s0.length + ' detected');
console.log('Stage 1: ' + s1exact + '/' + rows_out.s1.length + ' exact');
console.log('Stage 1b: ' + s1bExact + '/' + rows_out.s1b.length + ' exact');
console.log('Stage 2a: ' + JSON.stringify(rows_out.s2a));
console.log('Stage 2b: ' + JSON.stringify(rows_out.s2b));
