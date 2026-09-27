// Interaction benchmark on big alignments: time from the user's gesture to the next painted
// frame, using real mouse/keyboard input (Playwright), for row selection, column selection
// and other everyday operations.
//   node dev-tools/perf/bench-interactions.js            (writes dev-tools/perf/bench-<date>.json)
//   BENCH_ONLY=rsi node ...                              (one dataset)
//   BENCH_OUT=name.json  BENCH_CSS='...'                   (output file; extra CSS to try)
// Gestures as a user makes them: Ctrl-click a name = toggle row, Shift-click = row range,
// Ctrl+Alt-click a residue = toggle column, Ctrl+Alt+Shift-click = column range.
// Timing: a timestamp is taken in the page, the real input is sent, then the page waits two
// animation frames; the Playwright round trip adds a few ms to every figure.
const fs = require('fs');
const path = require('path');
const { launch } = require('../../tests/lib/browser');
const { start } = require('../../tests/lib/static-server');

const DATASETS = [
  { id: 'rsi', label: 'rsi_subfam_input_30k (601 x 524, real)', url: 'https://raw.githubusercontent.com/Toki-bio/Tal/main/rhin/alignments/rsi_subfam_input_30k.aln.fa' },
  { id: 'syn', label: 'synthetic 400 x 3000 (1.2 M residues)', synth: [400, 3000] },
];

function synthFasta(n, len) {
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const base = Array.from({ length: len }, () => 'ACGT'[rnd() % 4]);
  let out = '';
  for (let i = 0; i < n; i++) {
    const s = base.map(c => (rnd() % 10 === 0 ? 'ACGT-'[rnd() % 5] : c)).join('');
    out += `>seq_${String(i).padStart(4, '0')}\n${s}\n`;
  }
  return out;
}

async function benchPage(p) {
  const out = await p.evaluate(() => ({
    mode: document.getElementById('modeBlocks')?.checked ? 'block' : document.getElementById('modeSingle')?.checked ? 'full' : 'canvas',
    seqs: state.seqs.length, cols: state.seqs.reduce((m, s) => Math.max(m, s.seq.length), 0),
    domSpans: document.querySelectorAll('.seq-data span').length,
  }));
  const mark = () => p.evaluate(() => { window.__t0 = performance.now(); });
  const done = () => p.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - window.__t0))))));
  const timeIt = async (fn) => { await mark(); await fn(); return done(); };
  // Locating, scrolling and measuring the target happen before the timer starts; only the
  // real click (with its modifier keys) is timed.
  const keys = async (ks, fn) => { for (const k of ks) await p.keyboard.down(k); try { await fn(); } finally { for (const k of ks.slice().reverse()) await p.keyboard.up(k); } };
  const clickAt = async (sel, ks = []) => {
    let loc = p.locator(sel).first();
    if (!(await loc.count())) return null;
    await loc.scrollIntoViewIfNeeded();
    // In windowed mode scrolling redraws the rows: find the element again once it settles
    await p.waitForTimeout(250);
    loc = p.locator(sel).first();
    const bb = await loc.boundingBox();
    if (!bb) return null;
    const x = bb.x + Math.min(6, bb.width / 2), y = bb.y + bb.height / 2;
    for (const k of ks) await p.keyboard.down(k);
    await mark();
    await p.mouse.click(x, y);
    const ms = await done();
    for (const k of ks.slice().reverse()) await p.keyboard.up(k);
    return ms;
  };
  const nameSel = i => `.seq-line[data-seq-index="${i}"] > .seq-name`;
  const cellSel = (i, pos) => `.seq-line[data-seq-index="${i}"] .seq-data span[data-pos="${pos}"]`;
  // sequence rows only (the consensus and ruler lines carry negative / no indices)
  const rows = await p.evaluate(() => [...new Set([...document.querySelectorAll('.seq-line[data-seq-index]:not(.consensus-line):not(.scale-ruler-line)')].map(l => +l.dataset.seqIndex).filter(i => i >= 0))].slice(0, 160));

  out.rowCtrlClick = [];
  for (let k = 0; k < 10; k++) out.rowCtrlClick.push(await clickAt(nameSel(rows[k]), ['Control']));
  const far = rows[Math.min(rows.length - 1, 150)];
  out.rowShiftRange = { toRow: far, ms: await clickAt(nameSel(far), ['Shift']) };
  out.rowsSelected = await p.evaluate(() => state.selectedRows.size);
  out.rowCtrlClickWith150 = await clickAt(nameSel(rows[12]), ['Control']);

  // back to the top-left: in windowed mode only the rows on screen are in the page
  await p.evaluate(() => { window.scrollTo(0, 0); const c = document.getElementById('alignmentContainer'); c.scrollTop = 0; c.scrollLeft = 0; c.dispatchEvent(new Event('scroll')); });
  await p.waitForTimeout(800);
  out.colCtrlAltClick = [];
  for (let c = 10; c < 20; c++) out.colCtrlAltClick.push(await clickAt(cellSel(rows[0], c), ['Control', 'Alt']));
  const farPos = await p.evaluate(() => Math.min(210, state.seqs[0].seq.length - 1));
  out.colShiftRange = { toCol: farPos, ms: await clickAt(cellSel(rows[0], farPos), ['Control', 'Alt', 'Shift']) };
  out.colsSelected = await p.evaluate(() => state.selectedColumns.size);
  out.colCtrlAltClickWith200 = await clickAt(cellSel(rows[0], 5), ['Control', 'Alt']);
  out.scrollWithSelections = await timeIt(() => p.mouse.wheel(0, 800));

  out.residueClick = await clickAt(cellSel(rows[3], 30));

  const run = (fnSrc) => timeIt(() => p.evaluate(fnSrc));
  out.highlightDiffsOn = await run(`(async () => { const e = document.getElementById('highlightDiffs'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 120)); })()`);
  out.highlightDiffsOff = await run(`(async () => { const e = document.getElementById('highlightDiffs'); e.checked = false; e.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 120)); })()`);
  out.zoomTo80 = await run(`(async () => { setZoom(80); await new Promise(r => setTimeout(r, 150)); })()`);
  out.zoomTo100 = await run(`(async () => { setZoom(100); await new Promise(r => setTimeout(r, 150)); })()`);
  out.sortByName = await run(`(async () => { document.getElementById('sortByNameButton').click(); await new Promise(r => setTimeout(r, 150)); })()`);
  out.fullRender = await run(`renderAlignment()`);
  return out;
}

(async () => {
  const { server, baseUrl } = await start();
  const b = await launch();
  const results = {};
  for (const ds of DATASETS) {
    if (process.env.BENCH_ONLY && process.env.BENCH_ONLY !== ds.id) continue;
    const p = await b.newPage({ viewport: { width: 1920, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    if (ds.url) {
      await p.goto(baseUrl + '/index.html?url=' + encodeURIComponent(ds.url), { waitUntil: 'networkidle' });
    } else {
      await p.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
      await p.setInputFiles('#fileInput', { name: 'synth.fa', mimeType: 'text/plain', buffer: Buffer.from(synthFasta(...ds.synth)) });
    }
    await p.waitForFunction(() => state.seqs && state.seqs.length > 100, null, { timeout: 120000 });
    await p.waitForTimeout(2500);
    // BENCH_CSS='...' injects extra CSS first, to try a styling change before making it
    if (process.env.BENCH_CSS) { await p.addStyleTag({ content: process.env.BENCH_CSS }); await p.waitForTimeout(1500); }
    const r = await benchPage(p);
    r.label = ds.label; r.errors = errs;
    results[ds.id] = r;
    console.log(ds.id, JSON.stringify(r));
    await p.close();
  }
  const out = path.join(__dirname, process.env.BENCH_OUT || `bench-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  await b.close(); server.close();
})();
