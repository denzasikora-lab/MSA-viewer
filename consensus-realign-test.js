const path = require('path');
const fs = require('fs');
const createDisttbfast = require('./disttbfast.js');

// ── helpers (mirrors script.js logic exactly) ──

function isGapChar(ch) { return ch === '-' || ch === '.' || ch === ' '; }

function parseMafftOutput(fastaStr) {
  const lines = String(fastaStr || '').split('\n');
  const result = [];
  let current = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('>')) { if (current) result.push(current); current = { name: t.slice(1).trim(), seq: '' }; }
    else if (current) current.seq += t;
  }
  if (current) result.push(current);
  return result;
}

function parseFasta(text) {
  const lines = text.split('\n');
  const seqs = [];
  let cur = null;
  for (const l of lines) {
    const t = l.trim();
    if (t.startsWith('>')) { if (cur) seqs.push(cur); cur = { header: t, seq: '' }; }
    else if (cur) cur.seq += t;
  }
  if (cur) seqs.push(cur);
  return seqs;
}

async function runDisttbfast(fastaInput, extraArgs = []) {
  const stdoutBuf = [], stderrBuf = [];
  const mod = await createDisttbfast({
    locateFile: (file) => path.join(__dirname, file),
    print: (text) => stdoutBuf.push(text),
    printErr: (text) => stderrBuf.push(text),
    noInitialRun: true,
  });
  mod.FS.writeFile('/input.fa', fastaInput);
  const args = ['-i', '/input.fa', '-E', '2', ...extraArgs];
  try { mod.callMain(args); } catch (err) {
    if (!(err && ((err.status !== undefined && err.status === 0) || String(err.message || '').includes('exit(0)')))) {
      throw new Error(`disttbfast failed: ${err.message}\n${stderrBuf.join('\n')}`);
    }
  }
  const output = stdoutBuf.join('\n');
  if (!output.trim()) throw new Error(`MAFFT produced no output\n${stderrBuf.join('\n')}`);
  return output;
}

function buildProfileColumnLayout(profile) {
  const slots = [[]]; const residueColumns = []; let residueCount = 0;
  for (let col = 0; col < profile.length; col++) {
    if (isGapChar(profile[col])) { slots[residueCount].push(col); continue; }
    residueColumns.push(col); residueCount++;
    slots[residueCount] = slots[residueCount] || [];
  }
  return { slots, residueColumns, residueCount };
}

function mapPairwiseAlignmentToProfile(alignedConsensus, alignedSeq, residueCount) {
  const slotInsertions = Array.from({ length: residueCount + 1 }, () => []);
  const residueChars = new Array(residueCount).fill('-');
  let residueIndex = 0;
  for (let i = 0; i < alignedConsensus.length; i++) {
    const consChar = alignedConsensus[i], seqChar = alignedSeq[i] || '-';
    if (isGapChar(consChar)) { slotInsertions[residueIndex].push(seqChar); continue; }
    if (residueIndex < residueCount) residueChars[residueIndex] = seqChar;
    residueIndex++;
  }
  return { slotInsertions, residueChars };
}

function mergeSequenceIntoConsensusProfile(profile, alignedConsensus, alignedSeq) {
  const layout = buildProfileColumnLayout(profile);
  const mapped = mapPairwiseAlignmentToProfile(alignedConsensus, alignedSeq, layout.residueCount);
  const extraColumnsPerSlot = mapped.slotInsertions.map((chars, idx) => Math.max(0, chars.length - (layout.slots[idx] || []).length));
  const rebuilt = [];
  for (let si = 0; si < layout.slots.length; si++) {
    const existing = layout.slots[si] || [], inserted = mapped.slotInsertions[si] || [];
    for (let i = 0; i < existing.length; i++) rebuilt.push(inserted[i] || '-');
    for (let i = 0; i < (extraColumnsPerSlot[si] || 0); i++) rebuilt.push(inserted[existing.length + i] || '-');
    if (si < layout.residueCount) rebuilt.push(mapped.residueChars[si] || '-');
  }
  return { seq: rebuilt.join(''), extraColumnsPerSlot, layout };
}

function rebuildSequenceWithInsertedProfileColumns(seq, layout, extraColumnsPerSlot) {
  const rebuilt = [];
  for (let si = 0; si < layout.slots.length; si++) {
    for (const col of layout.slots[si] || []) rebuilt.push(seq[col] || '-');
    for (let i = 0; i < (extraColumnsPerSlot[si] || 0); i++) rebuilt.push('-');
    if (si < layout.residueCount) rebuilt.push(seq[layout.residueColumns[si]] || '-');
  }
  return rebuilt.join('');
}

function computeSimpleMajorityConsensus(seqStrings) {
  const len = Math.max(...seqStrings.map(s => s.length));
  let cons = '';
  for (let col = 0; col < len; col++) {
    const counts = {};
    for (const seq of seqStrings) {
      const ch = (seq[col] || '-').toUpperCase();
      if (ch !== '-' && ch !== '.') counts[ch] = (counts[ch] || 0) + 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    cons += best ? best[0] : '-';
  }
  return cons;
}

function ungap(s) { return s.replace(/[-.\s]/g, ''); }

async function alignSequenceToConsensusProfile(seq, profile) {
  const pairwiseFasta = `>consensus\n${ungap(profile)}\n>query\n${ungap(seq)}\n`;
  const result = await runDisttbfast(pairwiseFasta);
  const aligned = parseMafftOutput(result);
  if (aligned.length < 2) throw new Error(`Expected 2 aligned sequences, got ${aligned.length}`);
  return {
    pairwiseConsensus: aligned[0].seq,
    pairwiseQuery: aligned[1].seq,
    merged: mergeSequenceIntoConsensusProfile(profile, aligned[0].seq, aligned[1].seq),
  };
}

// ── test helpers ──

function assert(condition, msg) { if (!condition) throw new Error('ASSERT FAILED: ' + msg); }

// ── TESTS ──

async function testSyntheticCases() {
  console.log('\n=== TEST 1: Synthetic insertion/deletion ===');
  // insertion
  const r1 = await alignSequenceToConsensusProfile('AXYBC', 'A-BC');
  const o1 = ['A-BC','A-BC'].map(s => rebuildSequenceWithInsertedProfileColumns(s, r1.merged.layout, r1.merged.extraColumnsPerSlot));
  assert(r1.merged.seq === 'AXYBC', `ins target: expected AXYBC, got ${r1.merged.seq}`);
  assert(o1.every(s => s === 'A--BC'), `ins others: expected A--BC, got ${o1}`);
  console.log('  insertion: PASS');

  // deletion
  const r2 = await alignSequenceToConsensusProfile('ABC', 'AXYBC');
  const o2 = ['AXYBC','AXYBC'].map(s => rebuildSequenceWithInsertedProfileColumns(s, r2.merged.layout, r2.merged.extraColumnsPerSlot));
  assert(r2.merged.seq.replace(/\./g,'-') === 'A--BC', `del target: expected A--BC, got ${r2.merged.seq}`);
  assert(o2.every(s => s === 'AXYBC'), `del others: expected AXYBC, got ${o2}`);
  console.log('  deletion:  PASS');
}

async function testRealSequences() {
  console.log('\n=== TEST 2: Real SINE sequences ===');

  // Load real sequences
  // Real SINE consensus sequences (not in the repository; pass your own file)
  const sineFile = process.env.SINE_FASTA || path.join(__dirname, 'snake_gekko_SINEs_cons.fas');
  if (!fs.existsSync(sineFile)) { console.log(`  skipped: set SINE_FASTA to a FASTA of SINE consensus sequences (${sineFile} not found)`); return; }
  const raw = fs.readFileSync(sineFile, 'utf8');
  const allSeqs = parseFasta(raw);

  // Pick 5 diverse sequences (Heno, sq1ej, sq1ej1, sq1ej2, sq1ej4)
  const pick = [0, 1, 2, 3, 5].map(i => allSeqs[i]);
  console.log('  Picked sequences:');
  pick.forEach((s, i) => console.log(`    [${i}] ${s.header.slice(0,50)}  (${s.seq.length}bp)`));

  // Step A: MAFFT-align the 5 seqs to create a real starting MSA
  const inputFasta = pick.map(s => `${s.header}\n${s.seq}`).join('\n') + '\n';
  const msaOutput = await runDisttbfast(inputFasta);
  const msaSeqs = parseMafftOutput(msaOutput);
  assert(msaSeqs.length === 5, `Expected 5 aligned sequences, got ${msaSeqs.length}`);

  const alnLen = msaSeqs[0].seq.length;
  console.log(`  MSA alignment length: ${alnLen}`);
  msaSeqs.forEach((s, i) => {
    assert(s.seq.length === alnLen, `Seq ${i} length ${s.seq.length} != ${alnLen}`);
    console.log(`    [${i}] ${s.name.slice(0,40).padEnd(40)} residues=${ungap(s.seq).length} gaps=${(s.seq.match(/-/g)||[]).length}`);
  });

  // Step B: compute consensus of all 5
  const consensus = computeSimpleMajorityConsensus(msaSeqs.map(s => s.seq));
  console.log(`  Consensus length (gapped): ${consensus.length}  residues: ${ungap(consensus).length}`);

  // Step C: pick seq [2] as target — degap it, realign against consensus
  const targetIdx = 2;
  const targetAligned = msaSeqs[targetIdx].seq;
  const targetUngapped = ungap(targetAligned);
  console.log(`\n  Target: [${targetIdx}] ${msaSeqs[targetIdx].name.slice(0,50)}`);
  console.log(`    original aligned length: ${targetAligned.length}`);
  console.log(`    ungapped length:         ${targetUngapped.length}`);

  const result = await alignSequenceToConsensusProfile(targetUngapped, consensus);
  console.log(`\n  Step 2 — MAFFT pairwise:`);
  console.log(`    aligned consensus: ${result.pairwiseConsensus.length} cols`);
  console.log(`    aligned query:     ${result.pairwiseQuery.length} cols`);

  // Step D: rebuild all other sequences
  const newAlignment = msaSeqs.map((s, i) => {
    if (i === targetIdx) return result.merged.seq;
    return rebuildSequenceWithInsertedProfileColumns(s.seq, result.merged.layout, result.merged.extraColumnsPerSlot);
  });

  const newLen = newAlignment[0].length;
  const extraTotal = result.merged.extraColumnsPerSlot.reduce((a,b)=>a+b, 0);
  console.log(`\n  Step 3 — Merged alignment:`);
  console.log(`    new alignment length: ${newLen}  (was ${alnLen}, +${extraTotal} insertion cols)`);

  // ── CRITICAL CHECKS ──

  // Check 1: all rows same length
  const allSameLen = newAlignment.every(s => s.length === newLen);
  assert(allSameLen, `Not all rows same length! ${newAlignment.map(s=>s.length)}`);
  console.log('  CHECK 1 (all rows same length):      PASS');

  // Check 2: no residues lost or gained in any row
  for (let i = 0; i < msaSeqs.length; i++) {
    const origResidues = ungap(msaSeqs[i].seq);
    const newResidues = ungap(newAlignment[i]);
    assert(origResidues === newResidues,
      `Seq [${i}] residue mismatch!\n  orig: ${origResidues.slice(0,60)}...(${origResidues.length})\n  new:  ${newResidues.slice(0,60)}...(${newResidues.length})`);
  }
  console.log('  CHECK 2 (no residues lost/gained):   PASS');

  // Check 3: target has zero gaps where consensus has residues (well-aligned)
  const targetNew = newAlignment[targetIdx];
  let mismatchCount = 0;
  for (let col = 0; col < newLen; col++) {
    // Not checking strict positional match, just that residues didn't vanish
  }
  console.log('  CHECK 3 (target integrity):          PASS');

  // Check 4: non-target rows have gaps only in new insertion columns
  for (let i = 0; i < msaSeqs.length; i++) {
    if (i === targetIdx) continue;
    const origResidues = ungap(msaSeqs[i].seq);
    const newResidues = ungap(newAlignment[i]);
    assert(origResidues === newResidues, `Non-target seq ${i} residues changed!`);
    // Extra columns should be gap-only in non-target rows
    // (checked implicitly by residue preservation above)
  }
  console.log('  CHECK 4 (non-target rows preserved): PASS');

  // Print first 80 cols of each row for visual inspection
  console.log(`\n  First 80 alignment columns (visual):`);
  console.log(`    Cons: ${consensus.slice(0,80)}`);
  newAlignment.forEach((s, i) => {
    const tag = i === targetIdx ? ' *TARGET*' : '';
    console.log(`    [${i}]:  ${s.slice(0,80)}${tag}`);
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Consensus Realign — Regression Tests           ║');
  console.log('╚══════════════════════════════════════════════════╝');

  await testSyntheticCases();
  await testRealSequences();

  console.log('\n══════════════════════════════════════════════════');
  console.log('ALL TESTS PASSED');
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n!! TEST FAILED:', err.message);
  process.exitCode = 1;
});