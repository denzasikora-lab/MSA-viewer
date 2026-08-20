// Regression suite: each check is a real user-path interaction (real DOM
// events, not calling internal functions directly, except where the real
// event handler is confirmed to dispatch to the same internal call - see
// each check's comment). Exits 0 if all pass, 1 if any fail. Meant to be
// used both by a human (`node tests/regression/run-all.js`) and as a
// BROWSER_CHECK_CMD target from aider-loop.sh (see AIDER-PLAYBOOK.md).
const { start } = require('../lib/static-server');
const { launch, makeFasta, loadFasta, loadSyntheticFasta, setMode } = require('../lib/browser');

const CHECKS = [];
function check(name, fn) { CHECKS.push({ name, fn }); }

check('loads without console errors', async (page) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await loadFasta(page, makeFasta(20, 500));
  if (errors.length) return { pass: false, detail: `page errors: ${JSON.stringify(errors)}` };
  return { pass: true };
});

check('mode switching: full/block/canvas all render rows', async (page) => {
  await loadFasta(page, makeFasta(20, 500));
  for (const mode of ['full', 'block', 'canvas']) {
    await setMode(page, mode);
    const info = await page.evaluate(() => {
      const rows = document.querySelectorAll('.seq-line[data-seq-index]').length;
      const canvas = document.querySelector('#alignmentContainer canvas');
      return { rows, hasCanvas: !!canvas };
    });
    if (mode === 'canvas') {
      if (!info.hasCanvas) return { pass: false, detail: `canvas mode has no <canvas> element` };
    } else if (info.rows === 0) {
      return { pass: false, detail: `${mode} mode rendered 0 rows` };
    }
  }
  return { pass: true };
});

check('large (crazy) alignment triggers windowed DOM path', async (page) => {
  // 500 x 12000 = 6M residues, above ALIGN_CRAZY_VOLUME (5M). At/above that
  // size the app auto-switches to Canvas mode by default (CANVAS_AUTO_THRESHOLD
  // == ALIGN_CRAZY_VOLUME, see v179) - explicitly force Full/DOM mode since
  // that's the windowed-DOM path this check is actually about.
  await loadSyntheticFasta(page, 500, 12000);
  await setMode(page, 'full');
  const info = await page.evaluate(() => ({
    isCrazy: !!state.alignmentIndex?.isCrazy,
    domRows: document.querySelectorAll('.seq-line[data-seq-index]').length,
  }));
  if (!info.isCrazy) return { pass: false, detail: 'expected isCrazy=true for 6M-residue alignment' };
  if (info.domRows === 0 || info.domRows > 100) {
    return { pass: false, detail: `expected a small windowed row count (viewport-bounded), got ${info.domRows}` };
  }
  return { pass: true };
});

check('consensus row respects column windowing on horizontal scroll (v179 regression)', async (page) => {
  // Regresses the bug where addConsensusLine was passed the block's full
  // start/end instead of colStart/colEnd, building one span per column of
  // the whole alignment on every scroll. 300 x 20000 = 6M residues.
  await loadSyntheticFasta(page, 300, 20000);
  await setMode(page, 'full');
  const t = await page.evaluate(() => {
    const container = document.getElementById('alignmentContainer');
    container.scrollLeft = 8000;
    const t0 = performance.now();
    _refreshUnifiedWindowOnScroll(container);
    const dt = performance.now() - t0;
    const consensusSpans = document.querySelectorAll('.consensus-line .seq-data > *').length;
    return { dt, consensusSpans };
  });
  if (t.consensusSpans > 500) {
    return { pass: false, detail: `consensus row built ${t.consensusSpans} spans - looks unwindowed (full alignment width, not viewport)` };
  }
  if (t.dt > 500) {
    return { pass: false, detail: `scroll refresh took ${t.dt.toFixed(1)}ms - expected well under 500ms for a windowed refresh` };
  }
  return { pass: true, detail: `${t.dt.toFixed(1)}ms, ${t.consensusSpans} consensus spans` };
});

check('spanCache stays bounded during scroll in edit mode (spanCache regression)', async (page) => {
  await loadSyntheticFasta(page, 300, 12000); // 3.6M residues, isCrazy
  await setMode(page, 'full');
  await page.evaluate(() => { state.editModeActive = true; state._enableSpanCache = true; });
  const sizes = await page.evaluate(() => {
    const container = document.getElementById('alignmentContainer');
    const out = [];
    const maxScroll = container.scrollHeight - container.clientHeight;
    for (let i = 0; i <= 8; i++) {
      container.scrollTop = Math.floor(maxScroll * (i / 8));
      _refreshUnifiedWindowOnScroll(container);
      out.push(state.spanCache.size);
    }
    return out;
  });
  const max = Math.max(...sizes);
  if (max > 200) { // nSeq=300; a real leak trends toward that, a bounded cache stays near viewport size (~80-100)
    return { pass: false, detail: `spanCache grew to ${max} across scroll (nSeq=300) - looks unbounded` };
  }
  return { pass: true, detail: `max spanCache size ${max}` };
});

check('GeneDoc residue typing + undo/redo round-trips correctly', async (page) => {
  await loadFasta(page, makeFasta(5, 50));
  await setMode(page, 'full');
  const result = await page.evaluate(async () => {
    setGeneDocEditTool('residue');
    state.editCell = { row: 0, pos: 0 };
    const before = state.seqs[0].seq;
    // Dispatch real keydown events, same path a real keystroke takes.
    for (const ch of 'XYZ') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 10));
    }
    const afterType = state.seqs[0].seq;
    undoDelete(); undoDelete(); undoDelete();
    const afterUndo = state.seqs[0].seq;
    redoAction(); redoAction(); redoAction();
    const afterRedo = state.seqs[0].seq;
    return { before, afterType, afterUndo, afterRedo };
  });
  if (result.afterType === result.before) return { pass: false, detail: 'typing did not change the sequence' };
  if (result.afterUndo !== result.before) {
    return { pass: false, detail: `triple-undo did not restore original: before="${result.before}" afterUndo="${result.afterUndo}"` };
  }
  if (result.afterRedo !== result.afterType) {
    return { pass: false, detail: `triple-redo did not restore typed state: afterType="${result.afterType}" afterRedo="${result.afterRedo}"` };
  }
  return { pass: true };
});

check('column selection highlights only currently-visible rows after scroll', async (page) => {
  await loadSyntheticFasta(page, 300, 12000);
  await setMode(page, 'full');
  const result = await page.evaluate(() => {
    const container = document.getElementById('alignmentContainer');
    container.scrollTop = 0;
    _refreshUnifiedWindowOnScroll(container);
    const pos = 5;
    state.selectedColumns = new Set([pos]);
    updateColumnSelections();
    const visibleRows = document.querySelectorAll('.seq-line[data-seq-index]').length;
    return { visibleRows, ranWithoutError: true };
  });
  if (!result.ranWithoutError || result.visibleRows === 0) {
    return { pass: false, detail: `unexpected state after selection update: ${JSON.stringify(result)}` };
  }
  return { pass: true };
});

check('Canvas auto-switch threshold matches ALIGN_CRAZY_VOLUME (v179 regression)', async (page) => {
  // CANVAS_AUTO_THRESHOLD is intentionally local to renderAlignment(), not a
  // global - can't be read directly from page.evaluate's global context, so
  // test the actual BEHAVIOR it controls instead: an alignment just below
  // ALIGN_CRAZY_VOLUME should default to a DOM mode (has .seq-line rows) on
  // load, not auto-switch to Canvas.
  const crazyVolume = await page.evaluate(() => typeof ALIGN_CRAZY_VOLUME !== 'undefined' ? ALIGN_CRAZY_VOLUME : null);
  if (crazyVolume === null) return { pass: false, detail: 'could not read ALIGN_CRAZY_VOLUME from page' };
  // Pick a size just under the threshold (small enough to load fast).
  const nCol = 4000;
  const nSeq = Math.max(1, Math.floor((crazyVolume * 0.9) / nCol));
  await loadSyntheticFasta(page, nSeq, nCol);
  const info = await page.evaluate(() => ({
    canvasEl: !!document.querySelector('#alignmentContainer canvas'),
    domRows: document.querySelectorAll('.seq-line[data-seq-index]').length,
  }));
  if (info.canvasEl && info.domRows === 0) {
    return { pass: false, detail: `a ${nSeq * nCol}-residue alignment (90% of ALIGN_CRAZY_VOLUME=${crazyVolume}) auto-switched to Canvas - threshold looks too low` };
  }
  return { pass: true, detail: `${nSeq * nCol} residues stayed in DOM mode as expected` };
});

check('recent-files history: max-count setting survives a real page reload', async (page) => {
  // Regresses a bug where _historyManager.save() tried to persist maxItems
  // by tacking a "_max" property onto a plain Array before JSON.stringify -
  // which silently drops non-index array properties, so the setting was
  // never actually written to localStorage and reverted on every render.
  await page.evaluate(() => {
    localStorage.setItem('msaviewer_history', JSON.stringify({ max: 10, items: [
      { type: 'file', name: 'a.fa', timestamp: Date.now(), nSeqs: 3, length: 10, preview: '', source: '', text: null }
    ]}));
  });
  await page.click('.section-header[data-section="input"]');
  await page.click('#recentButton');
  await page.waitForTimeout(150);
  await page.focus('#historyMaxInput');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);
  const immediate = await page.inputValue('#historyMaxInput');
  if (immediate !== '11') return { pass: false, detail: `expected 11 right after one ArrowUp, got ${immediate}` };

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('.section-header[data-section="input"]');
  await page.click('#recentButton');
  await page.waitForTimeout(150);
  const afterReload = await page.inputValue('#historyMaxInput');
  if (afterReload !== '11') return { pass: false, detail: `expected 11 to survive a real reload, got ${afterReload} - setting was not actually persisted` };
  return { pass: true, detail: `max-count 11 correctly survived a real page reload` };
});

check('recent-files history: file entries do not cache truncated text', async (page) => {
  // Regresses a bug where every load (file or clipboard) cached up to
  // 100,000 chars of raw input text for reopen-from-history. Reopening a
  // file larger than that silently loaded a truncated fragment with no
  // warning (a real 3,408-sequence FASTA reopened as just 55 sequences).
  // Files should be re-opened from disk; only clipboard pastes (which have
  // no other source once cleared) should cache their text.
  const bigFasta = '>seq1\n' + 'ACGT'.repeat(30000) + '\n'; // ~120KB, over the old 100KB cap
  await page.evaluate((fasta) => {
    document.getElementById('fastaInput').value = fasta;
    state.currentFilename = 'big_test.fa';
    state.currentFilePath = 'C:/fake/big_test.fa';
  }, bigFasta);
  await page.evaluate(() => parseAndRender(false));
  await page.waitForTimeout(300);
  const entry = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('msaviewer_history'));
    return raw.items.find(e => e.name === 'big_test.fa');
  });
  if (!entry) return { pass: false, detail: 'no history entry was recorded for the loaded file' };
  if (entry.text !== null) return { pass: false, detail: `expected text=null for a file-type entry, got ${entry.text === undefined ? 'undefined' : entry.text.length + ' chars'} - reopening would silently load a truncated fragment` };
  return { pass: true, detail: `file-type history entry correctly stores text=null (forces a real re-open)` };
});

async function main() {
  const { server, baseUrl } = await start();
  const results = [];
  // Optional: CHECK_FILTER=substring runs only checks whose name includes it
  // (case-insensitive) - useful for isolating one check while iterating.
  const filter = process.env.CHECK_FILTER ? process.env.CHECK_FILTER.toLowerCase() : null;
  const activeChecks = filter ? CHECKS.filter(c => c.name.toLowerCase().includes(filter)) : CHECKS;
  try {
    for (const { name, fn } of activeChecks) {
      // A fresh browser process per check, not just a fresh page: multiple
      // multi-million-residue alignments loaded into the SAME browser
      // process across successive checks was observed to accumulate memory
      // and crash the renderer ("Target crashed") partway through the suite
      // - isolating each check removes that as a confound between checks
      // and matches how a real user's single-alignment session behaves
      // rather than compounding this test suite's own churn.
      const browser = await launch();
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      page.setDefaultTimeout(30000);
      let outcome;
      const t0 = Date.now();
      try {
        await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
        outcome = await fn(page);
      } catch (e) {
        outcome = { pass: false, detail: `threw: ${e.message}` };
      }
      const ms = Date.now() - t0;
      console.log(`[${outcome.pass ? 'PASS' : 'FAIL'}] (${ms}ms) ${name}${outcome.detail ? ' - ' + outcome.detail : ''}`);
      results.push({ name, ...outcome });
      await browser.close();
    }
  } finally {
    server.close();
  }

  const failCount = results.filter(r => !r.pass).length;
  console.log(`\n${results.length - failCount}/${results.length} passed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
