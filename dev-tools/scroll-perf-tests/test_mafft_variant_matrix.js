/**
 * MAFFT alignment variant matrix — correctness, timing, UI responsiveness.
 *
 * Run (server on 3013):
 *   $env:NODE_PATH='C:\work\MSAviewer_github\node_modules'
 *   $env:VIEWALIGN_BASE_URL='http://localhost:3013'
 *   $env:MAFFT_FIXTURE='C:\work\Raks_COI\Assembly\blast\lcl_Query_5072343 and 261 other sequences.aln'
 *   node dev-tools/scroll-perf-tests/test_mafft_variant_matrix.js
 *
 * Writes: dev-tools/scroll-perf-tests/mafft_variant_matrix.json
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const baseUrl = process.env.VIEWALIGN_BASE_URL || 'http://localhost:3013';
const fixturePath = process.env.MAFFT_FIXTURE || '';
const outPath = path.join(__dirname, 'mafft_variant_matrix.json');

function syntheticFasta(nSeq, seqLen, seed = 0) {
  let fasta = '';
  for (let i = 0; i < nSeq; i++) {
    const chars = [];
    for (let j = 0; j < seqLen; j++) chars.push('ACGT'[(i * 7 + j + seed) % 4]);
    fasta += `>syn_${i}\n${chars.join('')}\n`;
  }
  return fasta;
}

function subsampleFastaFile(filePath, nSeq, maxLen = 0) {
  const text = fs.readFileSync(filePath, 'utf8');
  const out = [];
  let curHeader = null;
  let curSeq = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (curHeader) {
        out.push({ header: curHeader, seq: maxLen > 0 ? curSeq.slice(0, maxLen) : curSeq });
        if (out.length >= nSeq) break;
      }
      curHeader = line.slice(1);
      curSeq = '';
    } else if (curHeader) curSeq += line.replace(/[-.]/g, '');
  }
  if (curHeader && out.length < nSeq) {
    out.push({ header: curHeader, seq: maxLen > 0 ? curSeq.slice(0, maxLen) : curSeq });
  }
  return out.map(s => `>${s.header}\n${s.seq}`).join('\n');
}

function parseFasta(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      if (cur) out.push(cur);
      cur = { name: line.slice(1).trim(), seq: '' };
    } else if (cur) cur.seq += line;
  }
  if (cur) out.push(cur);
  return out;
}

function buildMatrix() {
  const sizes = [
    { label: '5x200', fasta: syntheticFasta(5, 200), minSeqs: 5, maxMs: 60000 },
    { label: '20x500', fasta: syntheticFasta(20, 500), minSeqs: 20, maxMs: 180000 },
    { label: '50x500', fasta: syntheticFasta(50, 500), minSeqs: 50, maxMs: 600000 }
  ];
  const cycles = ['0', '1', '2'];
  const matrix = [];
  for (const size of sizes) {
    for (const c of cycles) {
      matrix.push({
        id: `C${c}-${size.label}`,
        fasta: size.fasta,
        extraArgs: ['-C', c],
        minSeqs: size.minSeqs,
        maxMs: size.maxMs,
        checkResponsive: size.label === '20x500' && c === '1'
      });
    }
  }
  if (fixturePath && fs.existsSync(fixturePath)) {
    for (const c of cycles) {
      matrix.push({
        id: `C${c}-fixture-10`,
        fasta: subsampleFastaFile(fixturePath, 10),
        extraArgs: ['-C', c],
        minSeqs: 10,
        maxMs: 900000,
        checkResponsive: false
      });
      matrix.push({
        id: `C${c}-fixture-30x2k`,
        fasta: subsampleFastaFile(fixturePath, 30, 2000),
        extraArgs: ['-C', c],
        minSeqs: 30,
        maxMs: 600000,
        checkResponsive: false
      });
    }
  }
  return matrix;
}

(async () => {
  const matrix = buildMatrix();
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  const rows = [];

  await page.goto(`${baseUrl}/?title=mafft-matrix`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof _runMafftInWorker === 'function', null, { timeout: 30000 });

  for (const case_ of matrix) {
    const row = { id: case_.id, extraArgs: case_.extraArgs, ok: false };
    const t0 = Date.now();
    try {
      const result = await page.evaluate(async ({ fasta, extraArgs }) => {
        const t0 = performance.now();
        const result = await _runMafftInWorker(fasta, extraArgs);
        return { result, workerMs: performance.now() - t0 };
      }, { fasta: case_.fasta, extraArgs: case_.extraArgs });

      const seqs = parseFasta(result.result);
      const alignedLen = seqs[0]?.seq.length || 0;
      const sameWidth = seqs.length > 0 && seqs.every(s => s.seq.length === alignedLen);
      row.workerMs = Math.round(result.workerMs);
      row.wallMs = Date.now() - t0;
      row.seqCount = seqs.length;
      row.alignedLen = alignedLen;
      row.sameWidth = sameWidth;

      if (case_.checkResponsive) {
        const resp = await page.evaluate(async ({ fasta, extraArgs }) => {
          const start = performance.now();
          let rafOk = false;
          const job = _runMafftInWorker(fasta, extraArgs);
          while (performance.now() - start < 2000) {
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            rafOk = true;
            if (await Promise.race([job.then(() => true), new Promise(r => setTimeout(() => r(false), 0))])) break;
          }
          await job;
          return { rafOk };
        }, { fasta: case_.fasta, extraArgs: case_.extraArgs });
        row.uiResponsive = resp.rafOk;
      }

      const failures = [];
      if (seqs.length < case_.minSeqs) failures.push(`seqs ${seqs.length}<${case_.minSeqs}`);
      if (!sameWidth) failures.push('uneven width');
      if (row.wallMs > case_.maxMs) failures.push(`slow ${row.wallMs}>${case_.maxMs}`);
      if (case_.checkResponsive && !row.uiResponsive) failures.push('ui frozen');
      row.ok = failures.length === 0;
      row.failures = failures;
    } catch (e) {
      row.wallMs = Date.now() - t0;
      row.error = e.message;
      row.failures = [e.message];
    }
    rows.push(row);
    console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.id}  ${row.workerMs ?? '?'}ms worker  ${row.wallMs}ms wall`);
  }

  // UI: Realign All on 5×200 via real button path (mafftSpeed=C1)
  try {
    const fasta5 = syntheticFasta(5, 200, 1);
    const t0 = Date.now();
    await page.evaluate(async (fasta) => {
      document.getElementById('fastaInput').value = fasta;
      await parseAndRender(false);
    }, fasta5);
    await page.waitForFunction(() => typeof state !== 'undefined' && state.seqs?.length === 5, null, { timeout: 120000 });
    await page.evaluate(() => {
      document.getElementById('mafftSpeed').value = '1';
      realignAll();
    });
    await page.waitForFunction(
      () => {
        const box = document.getElementById('busyOverlay');
        return box && box.hidden;
      },
      null,
      { timeout: 120000 }
    );
    const realignCheck = await page.evaluate(() => {
      const lens = state.seqs.map(s => s.seq.length);
      return { seqCount: state.seqs.length, lens, sameWidth: lens.length > 0 && lens.every(l => l === lens[0]) };
    });
    const failures = [];
    if (realignCheck.seqCount !== 5) failures.push(`seqCount ${realignCheck.seqCount}`);
    if (!realignCheck.sameWidth) failures.push('uneven after realign');
    rows.push({
      id: 'ui-realign-all-5x200',
      ok: failures.length === 0,
      wallMs: Date.now() - t0,
      ...realignCheck,
      failures
    });
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ui-realign-all-5x200  ${Date.now() - t0}ms wall`);
  } catch (e) {
    rows.push({ id: 'ui-realign-all-5x200', ok: false, error: e.message, failures: [e.message] });
    console.log(`FAIL ui-realign-all-5x200  ${e.message}`);
  }

  // UI: cancel mid-run via Stop button on 50×500 C2
  try {
    const fasta50 = syntheticFasta(50, 500, 2);
    const t0 = Date.now();
    await page.evaluate(async (fasta) => {
      document.getElementById('fastaInput').value = fasta;
      await parseAndRender(false);
    }, fasta50);
    await page.waitForFunction(() => state.seqs?.length === 50, null, { timeout: 120000 });
    await page.evaluate(() => {
      document.getElementById('mafftSpeed').value = '2';
      realignAll();
    });
    await page.waitForSelector('#busyOverlay:not([hidden])', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.click('#busyStop');
    await page.waitForFunction(
      () => document.getElementById('busyOverlay')?.hidden,
      null,
      { timeout: 10000 }
    );
    const rafOk = await page.evaluate(async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return true;
    });
    rows.push({
      id: 'ui-cancel-mid-run',
      ok: rafOk,
      wallMs: Date.now() - t0,
      uiResponsive: rafOk,
      failures: rafOk ? [] : ['ui frozen after cancel']
    });
    console.log(`${rafOk ? 'PASS' : 'FAIL'} ui-cancel-mid-run  ${Date.now() - t0}ms wall`);
  } catch (e) {
    rows.push({ id: 'ui-cancel-mid-run', ok: false, error: e.message, failures: [e.message] });
    console.log(`FAIL ui-cancel-mid-run  ${e.message}`);
  }

  // UI path: load small alignment, set speed preset, invoke getMafftExtraArgs mapping
  try {
    const ui = await page.evaluate(() => {
      const speed = document.getElementById('mafftSpeed');
      if (!speed) return { ok: false, error: 'no mafftSpeed' };
      const results = {};
      for (const v of ['0', '1', '2']) {
        speed.value = v;
        const args = getMafftExtraArgs().args;
        const idx = args.indexOf('-C');
        results[v] = idx >= 0 ? args[idx + 1] : null;
      }
      return { ok: true, mapping: results };
    });
    rows.push({ id: 'ui-speed-preset', ok: ui.ok && ui.mapping['0'] === '0' && ui.mapping['2'] === '2', ...ui });
  } catch (e) {
    rows.push({ id: 'ui-speed-preset', ok: false, error: e.message });
  }

  await browser.close();

  const summary = {
    at: new Date().toISOString(),
    baseUrl,
    fixturePath: fixturePath || null,
    passed: rows.filter(r => r.ok).length,
    failed: rows.filter(r => !r.ok).length,
    rows
  };
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed`);
  if (summary.failed) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
