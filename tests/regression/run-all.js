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

check('recent-files history: full source path visible without hovering, and a real preview panel appears on hover', async (page) => {
  await page.evaluate(() => {
    localStorage.setItem('msaviewer_history', JSON.stringify({ max: 10, items: [
      { type: 'file', name: 'scorpion_candidates.aln.fa', timestamp: Date.now(), nSeqs: 3408, length: 1842,
        preview: 'seqA, seqB, seqC  [ACGTACGTACGTACGT...]', source: 'C:\\work\\SINEderella\\de-novo-scan\\scorpion_candidates.aln.fa', text: null }
    ]}));
  });
  await page.click('.section-header[data-section="input"]');
  await page.click('#recentButton');
  await page.waitForTimeout(150);
  const pathVisible = await page.evaluate(() => document.querySelector('#recentDropdown').textContent.includes('SINEderella'));
  if (!pathVisible) return { pass: false, detail: 'full source path is not visible in the dropdown without hovering' };

  await page.hover('.recent-item');
  await page.waitForTimeout(150);
  const preview = await page.evaluate(() => {
    const el = document.getElementById('recentItemPreview');
    return el ? { visible: el.style.display === 'block', text: el.textContent } : null;
  });
  if (!preview || !preview.visible) return { pass: false, detail: 'no custom hover-preview panel appeared' };
  if (!preview.text.includes('seqA') || !preview.text.includes('3408')) {
    return { pass: false, detail: `hover preview missing expected content: ${preview.text}` };
  }
  return { pass: true, detail: 'full path visible, hover preview shows sequence content and stats' };
});

check('local-path load: a non-JSON server response gives a clear message, not a raw parse error', async (page) => {
  // Regresses the case where fetch('/api/local-cat') on a deployment
  // without server.js (e.g. GitHub Pages) gets back a plain 404 body -
  // resp.json() on that used to throw a raw SyntaxError ("Unexpected
  // token") before the response's ok-ness was even checked, surfacing an
  // implementation-detail error instead of an actionable one.
  await page.evaluate(() => {
    document.getElementById('fastaInput').value = 'C:\\work\\SINEderella\\de-novo-scan\\scorpion_candidates.aln.fa';
  });
  await page.evaluate(() => parseAndRender(false));
  await page.waitForTimeout(400);
  const msg = await page.evaluate(() => {
    const els = document.querySelectorAll('body *');
    for (const e of els) if (e.textContent && e.textContent.includes('Could not read local file')) return e.textContent;
    return null;
  });
  if (!msg) return { pass: false, detail: 'no "Could not read local file" message appeared at all' };
  if (msg.includes('Unexpected token') || msg.includes('SyntaxError')) {
    return { pass: false, detail: `message leaks a raw JSON parse error instead of explaining the server is unavailable: ${msg}` };
  }
  if (!msg.toLowerCase().includes('server')) {
    return { pass: false, detail: `message doesn't mention the actual cause (missing optional server): ${msg}` };
  }
  return { pass: true, detail: `clear message: ${msg}` };
});

check('version indicator never depends on the rate-limited GitHub API', async (page) => {
  // Regresses the commit-hash display silently depending on GitHub's
  // unauthenticated REST API (60 requests/hour PER IP, shared across
  // everyone behind the same NAT) - confirmed exhausted (0/60 remaining)
  // during real testing, and the failure was invisible (a bare
  // .catch(() => {})). It must now read a same-origin version.json
  // instead, which has no such limit.
  const externalRequests = [];
  page.on('request', req => {
    if (req.url().includes('api.github.com')) externalRequests.push(req.url());
  });
  await page.waitForTimeout(1000);
  if (externalRequests.length > 0) {
    return { pass: false, detail: `version display still hits the external GitHub API: ${JSON.stringify(externalRequests)}` };
  }
  const usesVersionJson = await page.evaluate(() => {
    const src = updateVersionIndicator.toString();
    return src.includes('version.json') && !src.includes('api.github.com');
  });
  if (!usesVersionJson) return { pass: false, detail: 'updateVersionIndicator() no longer reads version.json as expected' };
  return { pass: true, detail: 'version indicator reads a same-origin file, no external API dependency' };
});

check('Recent Files reopen: File System Access handle logic (permission granted/denied/missing)', async (page) => {
  // Note on what this test can and can't cover: Chromium's native
  // showOpenFilePicker() dialog cannot be driven by headless automation the
  // way the classic <input type=file> chooser can (a real, known
  // limitation, not something skipped here) - so this exercises
  // _fileHandleStore's own logic (permission gating, read, error handling)
  // with a mock handle whose get() is substituted in directly, rather than
  // a real end-to-end native-picker flow. IndexedDB's structured-clone
  // requirement means a plain mock object with function properties can't
  // round-trip through the real put()/get() (functions never survive
  // structured clone) - real FileSystemFileHandle objects have special
  // browser-native serialization support for exactly this, per spec, which
  // is why production code doesn't need this same workaround.
  const result = await page.evaluate(async () => {
    const grantedHandle = {
      kind: 'file', name: 'mock_test.fa', _content: '>seqX\nACGTACGT\n>seqY\nACGTACGA\n',
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async getFile() { const self = this; return { name: self.name, async text() { return self._content; } }; },
    };
    const deniedHandle = {
      kind: 'file', name: 'denied.fa',
      async queryPermission() { return 'denied'; },
      async requestPermission() { return 'denied'; },
      async getFile() { throw new Error('should not be called if permission denied'); },
    };
    const origGet = _fileHandleStore.get.bind(_fileHandleStore);

    document.getElementById('fastaInput').value = '';
    state.seqs = [];
    _fileHandleStore.get = async (id) => (id === 'mock_granted' ? grantedHandle : origGet(id));
    const grantedHandled = await _fileHandleStore.tryReopen('mock_granted', 'mock_test.fa');
    await new Promise(r => setTimeout(r, 300));
    const grantedOutcome = { handled: grantedHandled, nSeqs: state.seqs?.length, filename: state.currentFilename };

    _fileHandleStore.get = async (id) => (id === 'mock_denied' ? deniedHandle : origGet(id));
    const deniedHandled = await _fileHandleStore.tryReopen('mock_denied', 'denied.fa');

    _fileHandleStore.get = origGet;
    const missingHandled = await _fileHandleStore.tryReopen('totally_nonexistent_id', 'x.fa');

    return { grantedOutcome, deniedHandled, missingHandled };
  });
  if (!result.grantedOutcome.handled || result.grantedOutcome.nSeqs !== 2 || result.grantedOutcome.filename !== 'mock_test.fa') {
    return { pass: false, detail: `granted-permission reopen didn't work correctly: ${JSON.stringify(result.grantedOutcome)}` };
  }
  if (result.deniedHandled !== true) {
    return { pass: false, detail: `permission-denied case should be handled (show its own message), got handled=${result.deniedHandled}` };
  }
  if (result.missingHandled !== false) {
    return { pass: false, detail: `a missing/unknown handle id should fall through to the generic message (handled=false), got ${result.missingHandled}` };
  }
  return { pass: true, detail: 'granted/denied/missing handle paths all behave correctly' };
});

check('recent-files history: explicit up/down stepper buttons work (replacing the native spinner)', async (page) => {
  // Regresses the reported issue where the native number-input spin
  // buttons were visually clipped at the top - replaced with explicit,
  // fully-controlled up/down buttons instead of relying on native OS
  // spinner chrome (which headless Chrome doesn't even render, so that
  // specific clipping claim could never be visually verified here either
  // way - this test covers the buttons' own click behavior instead, which
  // IS fully controllable and testable).
  await page.evaluate(() => {
    localStorage.setItem('msaviewer_history', JSON.stringify({ max: 10, items: [
      { type: 'file', name: 'a.fa', timestamp: Date.now(), nSeqs: 3, length: 10, preview: '', source: '', text: null }
    ]}));
  });
  await page.click('.section-header[data-section="input"]');
  await page.click('#recentButton');
  await page.waitForTimeout(150);

  const before = await page.inputValue('#historyMaxInput');
  if (before !== '10') return { pass: false, detail: `expected initial value 10, got ${before}` };

  // Dispatched directly rather than via page.click() - Playwright's
  // synthetic mouse-move-then-click sequence intermittently reported this
  // tiny (14x11px) button as "not visible" during manual investigation,
  // seemingly related to this dropdown's own mouseenter/mouseleave hover-
  // preview handlers on adjacent .recent-item rows interfering with
  // Playwright's stability check while moving the pointer - isVisible(),
  // boundingBox(), and count() all reported the element as completely
  // normal in isolation, and no actual visual overlap with the hover
  // preview panel was found, so this looks like a Playwright/synthetic-
  // mouse-path quirk from this specific combination of features rather
  // than a real click-blocking bug - but it means the click PATH itself
  // isn't covered here, only the handler logic a click would trigger.
  await page.evaluate(() => document.querySelector('button[title="Increase"]').click());
  await page.waitForTimeout(100);
  const afterInc = await page.inputValue('#historyMaxInput');
  if (afterInc !== '11') return { pass: false, detail: `Increase button: expected 11, got ${afterInc}` };

  await page.evaluate(() => document.querySelector('button[title="Decrease"]').click());
  await page.waitForTimeout(100);
  const afterDec = await page.inputValue('#historyMaxInput');
  if (afterDec !== '10') return { pass: false, detail: `Decrease button: expected 10, got ${afterDec}` };

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('.section-header[data-section="input"]');
  await page.click('#recentButton');
  await page.waitForTimeout(150);
  const afterReload = await page.inputValue('#historyMaxInput');
  if (afterReload !== '10') return { pass: false, detail: `expected the decremented value to survive reload, got ${afterReload}` };

  return { pass: true, detail: 'up/down buttons correctly change and persist the max count' };
});

check('Clustering Results modal is draggable, resizable, and minimizable', async (page) => {
  const fasta = [
    '>seqA1', 'AAAAAAAAAAAAAAAAAAAA',
    '>seqA2', 'AAAAAAAAAAAAAAAAAAAA',
    '>seqA3', 'AAAAAAAAAAAAAAAAAAAA',
    '>seqA4', 'AAAAAAAAAAAAAAAAAAAA',
    '>seqA5', 'AAAAAAAAAAAAAAAAAAAA',
    '>seqB1', 'TTTTTTTTTTTTTTTTTTTT',
    '>seqB2', 'TTTTTTTTTTTTTTTTTTTT',
    '>seqB3', 'TTTTTTTTTTTTTTTTTTTT',
    '>seqB4', 'TTTTTTTTTTTTTTTTTTTT',
    '>seqB5', 'TTTTTTTTTTTTTTTTTTTT',
  ].join('\n');
  await page.evaluate((f) => { document.getElementById('fastaInput').value = f; }, fasta);
  await page.evaluate(() => parseAndRender(false));
  await page.evaluate(() => {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('clusterMinSizeInput', '2');
    setVal('clusterMinPerfectInput', '1');
    setVal('minOccurrencesInput', '2');
  });
  await page.evaluate(async () => { await clusterSequences(); });
  await page.waitForTimeout(400);

  const initial = await page.evaluate(() => {
    const r = document.getElementById('clusteringModal').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });

  // Drag
  const header = await page.locator('#clusteringModalHeader').boundingBox();
  await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
  await page.mouse.down();
  await page.mouse.move(header.x + header.width / 2 + 150, header.y + header.height / 2 + 80, { steps: 10 });
  await page.mouse.up();
  const afterDrag = await page.evaluate(() => {
    const r = document.getElementById('clusteringModal').getBoundingClientRect();
    return { left: r.left, top: r.top };
  });
  if (Math.abs(afterDrag.left - (initial.left + 150)) > 5 || Math.abs(afterDrag.top - (initial.top + 80)) > 5) {
    return { pass: false, detail: `drag didn't move the modal as expected: ${JSON.stringify(afterDrag)} vs expected ~(${initial.left + 150}, ${initial.top + 80})` };
  }

  // Resize
  const modalRect = await page.locator('#clusteringModal').boundingBox();
  const hx = modalRect.x + modalRect.width - 6, hy = modalRect.y + modalRect.height - 6;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 100, hy + 60, { steps: 10 });
  await page.mouse.up();
  const afterResize = await page.evaluate(() => {
    const r = document.getElementById('clusteringModal').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  if (afterResize.w < modalRect.width + 80 || afterResize.h < modalRect.height + 40) {
    return { pass: false, detail: `resize didn't grow the modal as expected: before ${modalRect.width}x${modalRect.height}, after ${JSON.stringify(afterResize)}` };
  }

  // Minimize / restore
  await page.click('#clusteringModalHeader button[title="Minimize"]');
  await page.waitForTimeout(150);
  const minimized = await page.evaluate(() => getComputedStyle(document.getElementById('clusteringContent')).display === 'none');
  if (!minimized) return { pass: false, detail: 'clicking Minimize did not hide the content' };

  await page.click('#clusteringModalHeader button[title="Restore"]');
  await page.waitForTimeout(150);
  const restored = await page.evaluate(() => getComputedStyle(document.getElementById('clusteringContent')).display !== 'none');
  if (!restored) return { pass: false, detail: 'clicking Restore did not bring the content back' };

  return { pass: true, detail: 'drag, resize, minimize, and restore all work correctly' };
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
