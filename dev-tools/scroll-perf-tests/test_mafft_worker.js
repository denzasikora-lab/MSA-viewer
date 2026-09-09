/**
 * MAFFT worker responsiveness + correctness tests.
 * Run:
 *   $env:NODE_PATH='C:\work\MSAviewer_github\node_modules'
 *   $env:VIEWALIGN_BASE_URL='http://localhost:3013'
 *   node dev-tools/scroll-perf-tests/test_mafft_worker.js
 *
 * Optional large fixture subsample (do not commit multi-MB files):
 *   $env:MAFFT_FIXTURE='C:\work\Raks_COI\Assembly\blast\lcl_Query_5072343 and 261 other sequences.aln'
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const baseUrl = process.env.VIEWALIGN_BASE_URL || 'http://localhost:3013';
const fixturePath = process.env.MAFFT_FIXTURE || '';

function syntheticFasta(nSeq, seqLen, seed = 0) {
  let fasta = '';
  for (let i = 0; i < nSeq; i++) {
    const chars = [];
    for (let j = 0; j < seqLen; j++) {
      chars.push('ACGT'[(i * 7 + j + seed) % 4]);
    }
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
    } else if (curHeader) {
      curSeq += line.replace(/[-.]/g, '');
    }
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
    } else if (cur) {
      cur.seq += line;
    }
  }
  if (cur) out.push(cur);
  return out;
}

async function loadFastaInPage(page, fasta) {
  await page.evaluate((text) => {
    document.getElementById('fastaInput').value = text;
    return parseAndRender(false);
  }, fasta);
  await page.waitForFunction(
    () => typeof state !== 'undefined' && state.seqs?.length > 0,
    null,
    { timeout: 120000 }
  );
}

async function runWorkerAlign(page, fasta, extraArgs) {
  return page.evaluate(async ({ fastaText, args }) => {
    const t0 = performance.now();
    const result = await _runMafftInWorker(fastaText, args);
    return { result, ms: performance.now() - t0 };
  }, { fastaText: fasta, args: extraArgs });
}

async function probeUiResponsiveDuringJob(page, fasta, extraArgs, budgetMs = 2000) {
  return page.evaluate(async ({ fastaText, args, budget }) => {
    const start = performance.now();
    let rafOk = false;
    const job = _runMafftInWorker(fastaText, args);
    while (performance.now() - start < budget) {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      rafOk = true;
      if (await Promise.race([job.then(() => true), new Promise(r => setTimeout(() => r(false), 0))])) {
        break;
      }
    }
    const result = await job;
    return { rafOk, totalMs: performance.now() - start, alignedLen: result.length };
  }, { fastaText: fasta, args: extraArgs, budget: budgetMs });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  const failures = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${baseUrl}/?title=mafft-worker-test`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof _runMafftInWorker === 'function', null, { timeout: 30000 });

  const cases = [
    { label: 'tiny-5x200', fasta: syntheticFasta(5, 200), extra: ['-C', '1'], maxMs: 30000, minSeqs: 5 },
    { label: 'small-20x500', fasta: syntheticFasta(20, 500), extra: ['-C', '1'], maxMs: 120000, minSeqs: 20 },
    { label: 'medium-50x500', fasta: syntheticFasta(50, 500), extra: ['-C', '1'], maxMs: 300000, minSeqs: 50 }
  ];

  if (fixturePath && fs.existsSync(fixturePath)) {
    cases.push(
      { label: 'fixture-10-full', fasta: subsampleFastaFile(fixturePath, 10), extra: ['-C', '1'], maxMs: 180000, minSeqs: 10 },
      { label: 'fixture-30-trunc2k', fasta: subsampleFastaFile(fixturePath, 30, 2000), extra: ['-C', '1'], maxMs: 300000, minSeqs: 30 }
    );
  }

  const speedCases = [
    { label: 'speed-C0', extra: ['-C', '0'] },
    { label: 'speed-C1', extra: ['-C', '1'] },
    { label: 'speed-C2', extra: ['-C', '2'] }
  ];
  const speedFasta = syntheticFasta(15, 400);

  const results = {};

  for (const c of cases) {
    const t0 = Date.now();
    try {
      const { result, ms } = await runWorkerAlign(page, c.fasta, c.extra);
      const seqs = parseFasta(result);
      const alignedLen = seqs[0]?.seq.length || 0;
      const sameWidth = seqs.every(s => s.seq.length === alignedLen);
      results[c.label] = { ms, seqCount: seqs.length, alignedLen, sameWidth, wallMs: Date.now() - t0 };
      if (seqs.length < c.minSeqs) failures.push(`${c.label}: only ${seqs.length}/${c.minSeqs} sequences`);
      if (!sameWidth) failures.push(`${c.label}: uneven alignment widths`);
      if (alignedLen < 50) failures.push(`${c.label}: suspiciously short alignment (${alignedLen})`);
      if (Date.now() - t0 > c.maxMs) failures.push(`${c.label}: exceeded ${c.maxMs}ms budget`);
    } catch (e) {
      failures.push(`${c.label}: ${e.message}`);
      results[c.label] = { error: e.message };
    }
  }

  try {
    const responsive = await probeUiResponsiveDuringJob(page, syntheticFasta(25, 600), ['-C', '1'], 2500);
    results.uiResponsive = responsive;
    if (!responsive.rafOk) failures.push('UI did not process animation frames during MAFFT worker job');
  } catch (e) {
    failures.push(`ui-responsive: ${e.message}`);
  }

  const speedTimings = {};
  for (const sc of speedCases) {
    try {
      const { ms } = await runWorkerAlign(page, speedFasta, sc.extra);
      speedTimings[sc.label] = ms;
    } catch (e) {
      failures.push(`${sc.label}: ${e.message}`);
    }
  }
  results.speedTimings = speedTimings;
  if (speedTimings['speed-C0'] && speedTimings['speed-C2'] &&
      speedTimings['speed-C0'] > speedTimings['speed-C2'] * 1.15) {
    failures.push(`speed-C0 (${speedTimings['speed-C0'].toFixed(0)}ms) not faster than C2 (${speedTimings['speed-C2'].toFixed(0)}ms)`);
  }

  const presetUi = await page.evaluate(() => {
    const el = document.getElementById('mafftSpeed');
    if (!el) return { exists: false };
    const args = getMafftExtraArgs();
    el.value = '0';
    const fast = getMafftExtraArgs();
    el.value = '2';
    const accurate = getMafftExtraArgs();
    return {
      exists: true,
      fastHasC0: fast.args.includes('-C') && fast.args[fast.args.indexOf('-C') + 1] === '0',
      accurateHasC2: accurate.args.includes('-C') && accurate.args[accurate.args.indexOf('-C') + 1] === '2'
    };
  });
  results.presetUi = presetUi;
  if (!presetUi.exists) failures.push('mafftSpeed preset control missing from Alignment menu');
  else if (!presetUi.fastHasC0 || !presetUi.accurateHasC2) {
    failures.push(`mafftSpeed preset mapping wrong: ${JSON.stringify(presetUi)}`);
  }

  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({ results, errors, failures }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
