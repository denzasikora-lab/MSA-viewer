/**
 * Regression test: "Realign sequence against consensus" using real SINE sequences
 * and the actual MAFFT WASM binary from this repo.
 *
 * Three-step logic under test:
 *   1) Extract ungapped sequence + ungapped consensus
 *   2) Pairwise MAFFT align them
 *   3) Map the pairwise result back into the existing gapped profile,
 *      inserting shared columns for all other rows when needed
 */
const path = require('path');
const fs   = require('fs');
const createDisttbfast = require('./disttbfast.js');

// ── helpers (same logic as script.js) ──────────────────────────────

function isGap(ch) { return ch === '-' || ch === '.' || ch === ' '; }

function parseFasta(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line[0] === '>') {
      if (cur) out.push(cur);
      cur = { name: line.slice(1).trim(), seq: '' };
    } else if (cur) {
      cur.seq += line;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function ungap(s) { return s.replace(/[-.\s]/g, ''); }

async function mafftAlign(fastaStr, extra = []) {
  const stdout = [], stderr = [];
  const mod = await createDisttbfast({
    locateFile: f => path.join(__dirname, f),
    print:    t => stdout.push(t),
    printErr: t => stderr.push(t),
    noInitialRun: true,
  });
  mod.FS.writeFile('/input.fa', fastaStr);
  try { mod.callMain(['-i', '/input.fa', '-E', '2', ...extra]); }
  catch (e) {
    if (!(e && ((e.status !== undefined && e.status === 0) ||
                String(e.message||'').includes('exit(0)')))) {
      throw new Error('disttbfast failed: ' + e.message + '\n' + stderr.join('\n'));
    }
  }
  const out = stdout.join('\n');
  if (!out.trim()) throw new Error('MAFFT empty output\n' + stderr.join('\n'));
  return out;
}

// consensus identical to computeConsensusForSequences in script.js (majority rule, 50%)
function majorityConsensus(seqs) {
  const len = Math.max(...seqs.map(s => s.length));
  let cons = '';
  for (let col = 0; col < len; col++) {
    const counts = {};
    let total = 0;
    for (const s of seqs) {
      const ch = (s[col] || '-').toUpperCase();
      if (isGap(ch)) continue;
      counts[ch] = (counts[ch] || 0) + 1;
      total++;
    }
    if (total === 0) { cons += '-'; continue; }
    let best = '-', bestN = 0;
    for (const [ch, n] of Object.entries(counts)) {
      if (n > bestN) { bestN = n; best = ch; }
    }
    cons += (bestN / total >= 0.5) ? best : '-';
  }
  return cons;
}

// ── profile rebuild helpers (mirror of script.js) ──────────────────

function buildProfileLayout(profile) {
  const slots = [[]], resCols = [];
  let rc = 0;
  for (let c = 0; c < profile.length; c++) {
    if (isGap(profile[c])) { slots[rc].push(c); continue; }
    resCols.push(c); rc++; slots[rc] = slots[rc] || [];
  }
  return { slots, residueColumns: resCols, residueCount: rc };
}

function mapPairwise(alnCons, alnSeq, rc) {
  const ins = Array.from({ length: rc + 1 }, () => []);
  const res = new Array(rc).fill('-');
  let ri = 0;
  for (let i = 0; i < alnCons.length; i++) {
    const cc = alnCons[i], sc = alnSeq[i] || '-';
    if (isGap(cc)) { ins[ri].push(sc); continue; }
    if (ri < rc) res[ri] = sc;
    ri++;
  }
  return { ins, res };
}

function mergeIntoProfile(profile, alnCons, alnSeq) {
  const lay = buildProfileLayout(profile);
  const map = mapPairwise(alnCons, alnSeq, lay.residueCount);
  const extra = map.ins.map((ch, i) =>
    Math.max(0, ch.length - (lay.slots[i] || []).length));
  const out = [];
  for (let si = 0; si < lay.slots.length; si++) {
    const ec = lay.slots[si] || [], ic = map.ins[si] || [];
    for (let i = 0; i < ec.length; i++) out.push(ic[i] || '-');
    for (let i = 0; i < (extra[si]||0); i++) out.push(ic[ec.length+i] || '-');
    if (si < lay.residueCount) out.push(map.res[si] || '-');
  }
  return { seq: out.join(''), extra, layout: lay };
}

function rebuildOtherRow(seq, lay, extra) {
  const out = [];
  for (let si = 0; si < lay.slots.length; si++) {
    for (const c of (lay.slots[si]||[])) out.push(seq[c] || '-');
    for (let i = 0; i < (extra[si]||0); i++) out.push('-');
    if (si < lay.residueCount) out.push(seq[lay.residueColumns[si]] || '-');
  }
  return out.join('');
}

// ── main test ──────────────────────────────────────────────────────

async function main() {
  // ---------- load first 5 real SINE consensus sequences from repo ----------
  // Real SINE consensus sequences (not in the repository; pass your own file)
  const sineFile = process.env.SINE_FASTA || path.join(__dirname, 'snake_gekko_SINEs_cons.fas');
  if (!fs.existsSync(sineFile)) { console.log(`  skipped: set SINE_FASTA to a FASTA of SINE consensus sequences (${sineFile} not found)`); return; }
  const raw = fs.readFileSync(sineFile, 'utf8');
  const allSeqs = parseFasta(raw);
  const seqs = allSeqs.slice(0, 5);
  console.log(`Loaded ${seqs.length} real SINE sequences: ${seqs.map(s=>s.name.split(/\s/)[0]).join(', ')}`);

  // ---------- Step 0: MAFFT-align them to create a starting MSA ----------
  const inputFasta = seqs.map(s => `>${s.name}\n${ungap(s.seq)}`).join('\n') + '\n';
  const msaRaw = await mafftAlign(inputFasta);
  const msa = parseFasta(msaRaw);
  const alnLen = Math.max(...msa.map(s => s.seq.length));
  // pad all to same length
  for (const s of msa) s.seq = s.seq.padEnd(alnLen, '-');

  console.log(`Initial MSA: ${msa.length} seqs × ${alnLen} cols`);
  for (const s of msa) console.log(`  ${s.name.split(/\s/)[0].padEnd(10)} ${s.seq.length} cols, ${ungap(s.seq).length} residues`);

  // remember original ungapped content
  const origUngapped = msa.map(s => ungap(s.seq));

  // ---------- Step 1: Pick seq index 2, extract ungapped seq + consensus ----------
  const targetIdx = 2;
  const targetUngapped = ungap(msa[targetIdx].seq);
  const gappedCons = majorityConsensus(msa.map(s => s.seq));
  const consUngapped = ungap(gappedCons);

  console.log(`\n--- Realigning seq #${targetIdx} (${msa[targetIdx].name.split(/\s/)[0]}) against consensus ---`);
  console.log(`Step 1 — Extract:`);
  console.log(`  Sequence residues: ${targetUngapped.length}`);
  console.log(`  Consensus residues: ${consUngapped.length}`);
  console.log(`  Gapped consensus length: ${gappedCons.length}`);

  // ---------- Step 2: Pairwise MAFFT align seq vs consensus ----------
  const pairFasta = `>consensus\n${consUngapped}\n>query\n${targetUngapped}\n`;
  const pairRaw = await mafftAlign(pairFasta);
  const pair = parseFasta(pairRaw);
  console.log(`Step 2 — MAFFT pairwise:`);
  console.log(`  Aligned consensus: ${pair[0].seq.length} cols`);
  console.log(`  Aligned query:     ${pair[1].seq.length} cols`);

  // ---------- Step 3: Merge back into profile ----------
  const merged = mergeIntoProfile(gappedCons, pair[0].seq, pair[1].seq);
  const newRows = msa.map((s, i) =>
    i === targetIdx
      ? merged.seq
      : rebuildOtherRow(s.seq, merged.layout, merged.extra)
  );
  const newLen = Math.max(...newRows.map(r => r.length));
  const totalExtra = merged.extra.reduce((a,b) => a+b, 0);

  console.log(`Step 3 — Merge back:`);
  console.log(`  New alignment width: ${newLen} (was ${alnLen}, inserted ${totalExtra} new column(s))`);
  for (let i = 0; i < newRows.length; i++) {
    console.log(`  ${msa[i].name.split(/\s/)[0].padEnd(10)} ${newRows[i].length} cols, ${ungap(newRows[i]).length} residues`);
  }

  // ---------- Assertions ----------
  let pass = true;
  const fail = (msg) => { console.error(`FAIL: ${msg}`); pass = false; };

  // A1: all rows same length
  for (let i = 0; i < newRows.length; i++) {
    if (newRows[i].length !== newLen) fail(`Row ${i} length ${newRows[i].length} != ${newLen}`);
  }

  // A2: ungapped content preserved for EVERY row
  for (let i = 0; i < newRows.length; i++) {
    const got = ungap(newRows[i]);
    if (got !== origUngapped[i]) {
      fail(`Row ${i} residues changed!\n  was:    ${origUngapped[i].slice(0,60)}…\n  now:    ${got.slice(0,60)}…`);
    }
  }

  // A3: target row ungapped matches its original
  if (ungap(newRows[targetIdx]) !== targetUngapped) {
    fail(`Target row residues changed after realign!`);
  }

  // A4: non-target rows only differ from originals by inserted gap columns
  for (let i = 0; i < newRows.length; i++) {
    if (i === targetIdx) continue;
    // after stripping the extra gap columns we should get back the original row
    // the extra columns are purely '-' in non-target rows, so ungapped must match
    if (ungap(newRows[i]) !== origUngapped[i]) {
      fail(`Non-target row ${i} residues corrupted!`);
    }
  }

  console.log(`\n${ pass ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗' }`);
  if (!pass) process.exitCode = 1;
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});
