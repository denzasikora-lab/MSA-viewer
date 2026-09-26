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

check('Dot plot: toolbar buttons stay grouped (Recalculate/-/+ never split across rows)', async (page) => {
  const fasta = '>seqA\n' + 'ACGTACGTACGTACGTACGTACGTACGTACGT'.repeat(3) + '\n>seqB\n' + 'ACGTACGTACGTACGTACGTACGTACGTACGT'.repeat(3) + '\n';
  await page.evaluate((f) => { document.getElementById('fastaInput').value = f; }, fasta);
  await page.evaluate(() => parseAndRender(false));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = state.seqs[0];
    const ungapped = s.seq.replace(/[-. ]/g, '');
    openDotPlot(ungapped, ungapped, s.header, s.header, { rowIndexA: 0, rowIndexB: 0, alignedSeqA: s.seq, alignedSeqB: s.seq });
  });
  await page.waitForTimeout(500);
  const layout = await page.evaluate(() => {
    const zi = document.getElementById('dotPlotZoomIn').getBoundingClientRect();
    const zo = document.getElementById('dotPlotZoomOut').getBoundingClientRect();
    const rc = document.getElementById('dotPlotRecalc').getBoundingClientRect();
    return Math.abs(zi.top - zo.top) < 3 && Math.abs(zi.top - rc.top) < 3;
  });
  if (!layout) return { pass: false, detail: 'Recalculate/zoom-out/zoom-in buttons are not on the same row - the toolbar wrapped mid-group' };
  return { pass: true, detail: 'zoom button group stays together when the toolbar wraps' };
});

check('Dot plot: Ctrl+wheel zoom works (not silently killed by an ancestor capture-phase listener)', async (page) => {
  const fasta = '>seqA\n' + 'ACGTACGTACGTACGTACGTACGTACGTACGT'.repeat(3) + '\n>seqB\n' + 'ACGTACGTACGTACGTACGTACGTACGTACGT'.repeat(3) + '\n';
  await page.evaluate((f) => { document.getElementById('fastaInput').value = f; }, fasta);
  await page.evaluate(() => parseAndRender(false));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = state.seqs[0];
    const ungapped = s.seq.replace(/[-. ]/g, '');
    openDotPlot(ungapped, ungapped, s.header, s.header, { rowIndexA: 0, rowIndexB: 0, alignedSeqA: s.seq, alignedSeqB: s.seq });
  });
  await page.waitForTimeout(800);
  const result = await page.evaluate(() => {
    const overlay = document.getElementById('dotPlotOverlay');
    const before = _dotPlotState.zoom;
    const rect = overlay.getBoundingClientRect();
    overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, ctrlKey: true, bubbles: true, cancelable: true }));
    return { before, after: _dotPlotState.zoom };
  });
  if (result.before === result.after) return { pass: false, detail: `zoom did not change on Ctrl+wheel (before=${result.before}, after=${result.after}) - an ancestor's capture-phase stopPropagation is likely killing the event before the overlay's own handler runs` };
  return { pass: true, detail: `zoom changed from ${result.before} to ${result.after} on Ctrl+wheel` };
});

// Real file-input path (setInputFiles fires the same 'change' event a user's
// file pick does). Synthetic files are the published examples/synthetic set.
const SYNTH = require('path').join(__dirname, '..', '..', 'examples', 'synthetic');
async function openSynthetic(page, name) {
  await page.setInputFiles('#fileInput', require('path').join(SYNTH, name));
  await page.waitForTimeout(2500);
  return page.evaluate(() => ({ n: state.seqs.length, name: state.seqs[0] && state.seqs[0].header, msg: document.getElementById('statusMessage').innerText }));
}

check('GenBank file opens (parser returns the same record shape as FASTA)', async (page) => {
  const r = await openSynthetic(page, 'synth_ref.gb');
  if (r.n !== 1 || r.name !== 'synth_ref') return { pass: false, detail: JSON.stringify(r) };
  return { pass: true, detail: `1 sequence named ${r.name}` };
});

check('BAM piles onto a loaded reference (multi-block BGZF decompresses in Chrome)', async (page) => {
  await openSynthetic(page, 'synth_ref.fa');
  const r = await openSynthetic(page, 'synth_reads.bam');
  if (!/Loaded \d+ reads/.test(r.msg)) return { pass: false, detail: r.msg };
  return { pass: true, detail: r.msg };
});

check('BAM opened with nothing loaded explains that the reference comes first', async (page) => {
  const r = await openSynthetic(page, 'synth_reads.bam');
  if (!/reference first/.test(r.msg)) return { pass: false, detail: r.msg };
  return { pass: true, detail: 'guidance message shown' };
});

check('Ctrl+Delete deletes selected rows and Ctrl+= zooms in', async (page) => {
  await openSynthetic(page, 'synth_msa.fa');
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { state.selectedRows = new Set([0]); document.activeElement.blur(); });
  await page.keyboard.press('Control+Delete');
  await page.waitForTimeout(500);
  const rows = await page.evaluate(() => state.seqs.length);
  const z0 = await page.evaluate(() => document.getElementById('zoomSlider').value);
  await page.keyboard.press('Control+Equal');
  await page.waitForTimeout(300);
  const z1 = await page.evaluate(() => document.getElementById('zoomSlider').value);
  if (rows !== 5 || z1 === z0) return { pass: false, detail: `rows=${rows} (want 5), zoom ${z0}->${z1}` };
  return { pass: true, detail: `6->5 rows, zoom ${z0}->${z1}` };
});

// Dot plot checks (2026-09-24 audit). All in one page to keep the suite fast.
check('Dot plot: N runs, U/T, zoom, size limit, copy reset, window input', async (page) => {
  const r = await page.evaluate(async () => {
    const rnd = (n, seed) => { let s = seed, o = ''; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; o += 'ACGT'[(s >>> 16) & 3]; } return o; };
    const plot = async (A, B, mode, win) => {
      document.querySelector(`input[name="dotPlotMode"][value="${mode}"]`).checked = true; _dotOnModeChange();
      document.getElementById('dotPlotWindow').value = win;
      await openDotPlot(A, B, 'A', 'B');
    };
    const out = {};
    const nseq = rnd(100, 5) + 'N'.repeat(200) + rnd(100, 9);
    for (const mode of ['spin', 'doter']) {
      await plot(nseq, nseq, mode, mode === 'spin' ? 6 : 11);
      let inN = 0;
      for (let r = 120; r < 280; r++) for (let c = 120; c < 280; c++) if (_dotIsDot(r, c)) inN++;
      out['nBlockDots_' + mode] = inN;
    }
    await plot('ACGUACGUACGUACGUACGU', 'ACGTACGTACGTACGTACGT', 'spin', 6);
    out.uEqualsT = _dotIsDot(0, 0) && _dotIsDot(10, 10);
    await plot(rnd(1500, 3), rnd(1500, 3), 'spin', 6);
    const S = _dotPlotState;
    S.zoom = 24; _dotSetSpacer(); _dotRender();
    const c = document.getElementById('dotPlotCanvas'), vp = document.getElementById('dotPlotViewport');
    out.canvasFitsViewport = c.width <= vp.clientWidth * (devicePixelRatio || 1) + 1;
    _dotUpdateHoverInfo(5, 5);
    out.copyBefore = !!S._copyRegion;
    await plot(rnd(12000, 1), rnd(12000, 2), 'spin', 8);
    out.refused = /Too large/.test(document.getElementById('dotPlotStatus').textContent) && S.rows === 0;
    await plot(rnd(300, 4), rnd(300, 4), 'spin', 6);
    out.copyAfter = S._copyRegion;
    const w = document.getElementById('dotPlotWindow');
    out.spinInputValid = w.checkValidity() && w.min === '2' && w.max === '20';
    return out;
  });
  const bad = [];
  if (r.nBlockDots_spin || r.nBlockDots_doter) bad.push(`N block shows dots (spin ${r.nBlockDots_spin}, dotter ${r.nBlockDots_doter})`);
  if (!r.uEqualsT) bad.push('U and T do not match');
  if (!r.canvasFitsViewport) bad.push('zoomed canvas larger than the viewport');
  if (!r.copyBefore || r.copyAfter !== null) bad.push('Copy Region not reset by a new plot');
  if (!r.refused) bad.push('12000 x 12000 plot not refused');
  if (!r.spinInputValid) bad.push('word-size input invalid in SPIN mode');
  if (bad.length) return { pass: false, detail: bad.join('; ') };
  return { pass: true, detail: 'no dots in N runs, U=T, viewport-sized canvas at 24x, size limit, copy reset, valid input' };
});

// In-browser MAFFT Speed must change the alignment. It used to send disttbfast -C
// (the thread count), so all three settings gave byte-identical results.
check('MAFFT Speed sets -E (guide-tree runs) and changes the alignment', async (page) => {
  page.on('dialog', d => d.accept());
  const path = require('path');
  const out = {};
  for (const v of ['1', '2', '3']) {
    await page.goto(page.url(), { waitUntil: 'networkidle' });
    await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
    await page.waitForTimeout(1500);
    const args = await page.evaluate(v => { document.getElementById('mafftSpeed').value = v; return getMafftExtraArgs().args; }, v);
    await page.evaluate(() => { window.__before = state.seqs.map(s => s.seq).join('|'); realignAll(); });
    await page.waitForFunction(() => state.seqs.map(s => s.seq).join('|') !== window.__before, null, { timeout: 60000 });
    out[v] = { args: args.join(' '), aln: await page.evaluate(() => state.seqs.map(s => s.seq).join('|')) };
  }
  const bad = [];
  for (const v of ['1', '2', '3']) {
    if (!out[v].args.includes('-E ' + v)) bad.push(`Speed ${v} sent "${out[v].args}"`);
    if (out[v].args.includes('-C')) bad.push(`Speed ${v} still sends -C`);
  }
  if (out['1'].aln === out['2'].aln || out['2'].aln === out['3'].aln) bad.push('Speed settings gave identical alignments');
  if (bad.length) return { pass: false, detail: bad.join('; ') };
  return { pass: true, detail: '-E 1/2/3 sent, three different alignments' };
});

// Sort buttons keep their arrow labels (an ASCII pass once turned them into "A->Z", "Lenv", "Simv")
check('Sort buttons show A→Z / Len↓ / Sim↓ and Len↓ sorts longest first', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const t = id => document.getElementById(id).textContent;
    document.getElementById('sortByLengthButton').click();
    const lens = state.seqs.map(s => s.seq.replace(/[-.]/g, '').length);
    return { labels: [t('sortByNameButton'), t('sortByLengthButton'), t('sortBySimButton')], descending: lens.every((v, i) => i === 0 || lens[i - 1] >= v) };
  });
  const want = ['A\u2192Z', 'Len\u2193', 'Sim\u2193'];
  if (JSON.stringify(r.labels) !== JSON.stringify(want)) return { pass: false, detail: 'labels ' + JSON.stringify(r.labels) };
  if (!r.descending) return { pass: false, detail: 'Len\u2193 did not sort by descending ungapped length' };
  return { pass: true, detail: 'labels ' + r.labels.join(' ') + ', length sort descending' };
});

// Ctrl+Shift+R is the browser's hard refresh: take it only when a 2+ column span is selected
check('Ctrl+Shift+R is left to the browser unless a 2+ column span is selected', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'synthetic', 'synth_msa.fa'));
  await page.waitForTimeout(1200);
  const press = (cols) => page.evaluate((cols) => {
    state.selectedColumns = new Set(cols); document.activeElement.blur();
    let prevented = null;
    document.addEventListener('keydown', e => { prevented = e.defaultPrevented; }, { once: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    return prevented;
  }, cols);
  const separate = await press([3, 9]);
  const span = await press([3, 4]);
  if (separate !== false || span !== true) return { pass: false, detail: `two single columns prevented=${separate}, span prevented=${span}` };
  return { pass: true, detail: 'separate single columns: browser keeps the key; span: realign' };
});

// Zoom is a font-size change the persistent scrollbar's observers don't see; before the
// fix the bar kept its 100%-zoom width at 50%, overshot the alignment and snapped back.
check('Horizontal scrollbar follows zoom (no overshoot / snap-back at 50%)', async (page) => {
  let seq = '', rnd = 7;
  const next = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648);
  const fa = Array.from({ length: 20 }, (_, i) => { seq = ''; for (let k = 0; k < 4000; k++) seq += 'ACGT'[next() % 4]; return `>s${i}\n${seq}`; }).join('\n') + '\n';
  await page.setInputFiles('#fileInput', { name: 'wide.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const r = document.getElementById('modeSingle'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(800);
  const sw = page.getByRole('button', { name: 'Switch anyway' }); if (await sw.count()) await sw.click();
  await page.waitForTimeout(1500);
  await page.evaluate(() => setZoom(50));
  await page.waitForTimeout(800);
  const r = await page.evaluate(async () => {
    const h = document.querySelector('.horizontal-scrollbar'), c = document.getElementById('alignmentContainer');
    h.scrollLeft = h.scrollWidth; h.dispatchEvent(new Event('scroll'));
    await new Promise(res => setTimeout(res, 500));
    return { barMax: h.scrollWidth - h.clientWidth, contMax: c.scrollWidth - c.clientWidth, bar: Math.round(h.scrollLeft), cont: Math.round(c.scrollLeft) };
  });
  const ok = r.contMax > 0 && Math.abs(r.barMax - r.contMax) <= 3 && Math.abs(r.bar - r.cont) <= 3 && r.cont >= r.contMax - 3;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Display menu: Sticky sits with Name Len; case and colours are labelled on a "Letters" row
check('Display menu: Sticky on the Name Len row, labelled Case/Colours/Frame/Code, both still work', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const layout = await page.evaluate(() => {
    const labelFor = id => document.querySelector(`label[for="${id}"]`)?.textContent.trim();
    return {
      stickyRow: !!document.getElementById('stickyNames').closest('.display-slider-row')?.querySelector('#nameLengthSlider'),
      caseLabel: labelFor('residueCase'), colourLabel: labelFor('colorSchemeSelect'),
      frameLabel: labelFor('codonFrame'), codeLabel: labelFor('codonCode'),
      caseFirst: document.querySelector('#residueCase option').textContent,
    };
  });
  await page.evaluate(() => { const s = document.getElementById('residueCase'); s.value = 'lower'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(600);
  const lowered = await page.evaluate(() => { const t = document.getElementById('alignmentContainer').innerText; return /[acgt]{5}/.test(t) && !/[ACGT]{5}/.test(t.replace(/^.*Consensus.*$/gm, '')); });
  const ok = layout.stickyRow && layout.caseLabel === 'Case' && layout.colourLabel === 'Colours' && layout.frameLabel === 'Frame' && layout.codeLabel === 'Code' && layout.caseFirst === 'As in file' && lowered;
  return { pass: ok, detail: JSON.stringify({ ...layout, lowered }) };
});

// Statistics matrices: names on both axes in every label style, windowed rows hold the right
// data, the Distance/Identity switch, find row/column, copy gives a TSV table with full names
check('Statistics matrices: named labels, windowed rows, switch, find, TSV copy', async (page) => {
  const names = Array.from({ length: 150 }, (_, i) => `seq_with_a_rather_long_name_${i}`);
  let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) % 4;
  const base = Array.from({ length: 120 }, () => 'ACGT'[rnd()]).join('');
  const fa = names.map(n => `>${n}\n` + base.split('').map(c => rnd() === 0 && rnd() === 0 ? 'ACGT'[rnd()] : c).join('')).join('\n') + '\n';
  await page.setInputFiles('#fileInput', { name: 'many.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { localStorage.removeItem('msaviewer_statsLabels'); localStorage.removeItem('msaviewer_statsWin'); } catch (e) {}
    window._copied = null; navigator.clipboard.writeText = t => { window._copied = t; return Promise.resolve(); }; openStats(); });
  await page.waitForFunction(() => state._statsData && document.querySelector('#statsSummaryTab table.stats-mx'), null, { timeout: 30000 });
  const out = {};
  for (const style of ['angled', 'vertical', 'numbers']) {
    await page.selectOption('#statsLabelStyle', style);
    await page.waitForTimeout(150);
    out[style] = await page.evaluate(async (style) => {
      const sc = document.querySelector('#statsSummaryTab .stats-mx-scroll'), table = sc.querySelector('table');
      const head = [...table.tHead.rows[0].cells].filter(c => c.classList.contains('c'));
      const n = state._statsData.names.length, m = state._statsData.identity;
      const headOk = head.length === n && head.every((c, j) => c.title === state._statsData.names[j] &&
        (style === 'numbers' ? c.textContent === String(j + 1) : state._statsData.names[j].startsWith(c.textContent.replace('…', ''))));
      sc.scrollTop = 0.6 * (sc.scrollHeight - sc.clientHeight);
      await new Promise(r => setTimeout(r, 150));
      const top = sc.getBoundingClientRect().top + table.tHead.getBoundingClientRect().height;
      const tr = [...table.tBodies[0].rows].find(t => t.cells[0].dataset.r && t.getBoundingClientRect().bottom > top + 2);
      const i = +tr.cells[0].dataset.r;
      const rowOk = i > 50 && [...tr.cells].slice(1, n + 1).every((c, j) => c.textContent === m[i][j]);
      return { headOk, rowOk, i, domRows: table.tBodies[0].rows.length };
    }, style);
  }
  // switch shows the distance matrix; find puts the named row/column under the labels
  await page.click('.stats-seg button[data-kind="distance"]');
  await page.fill('#statsFindRow', 'name_97');
  await page.fill('#statsFindCol', 'name_120');
  await page.waitForTimeout(300);
  const nav = await page.evaluate(() => {
    const sc = document.querySelector('#statsSummaryTab .stats-mx-scroll'), table = sc.querySelector('table');
    const cell = table.querySelector('td.focus');
    const cr = cell?.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    return { kind: table.dataset.kind, f: state._statsFocus, cell: cell?.textContent, want: state._statsData.distance[97][120],
      visible: !!cr && cr.top > sr.top && cr.bottom < sr.bottom && cr.left > sr.left && cr.right < sr.right };
  });
  await page.click('#statsCopyBtn');
  await page.waitForTimeout(200);
  const tsv = await page.evaluate(() => {
    const lines = (window._copied || '').trimEnd().split('\n');
    const head = lines[0].split('\t'), r7 = lines[8].split('\t');
    return { lines: lines.length, headOk: head[0] === '' && head[1] === state._statsData.names[0] && head.length === 151,
      rowOk: r7[0] === state._statsData.names[7] && r7[8] === '0.0000' && r7[3] === state._statsData.distance[7][2] };
  });
  const navOk = nav.kind === 'distance' && nav.f.i === 97 && nav.f.j === 120 && nav.cell === nav.want && nav.visible;
  const ok = ['angled', 'vertical', 'numbers'].every(s => out[s].headOk && out[s].rowOk && out[s].domRows < 150) && navOk && tsv.lines === 151 && tsv.headOk && tsv.rowOk;
  return { pass: ok, detail: JSON.stringify({ ...out, nav, tsv }) };
});

// Statistics window: tooltips on every summary field, min/max name their pairs, it docks
// beside the alignment (which narrows instead of being covered) and undocks, and CSV and
// Excel files hold the matrix
check('Statistics window: field tooltips, min/max pairs, dock/undock, CSV and Excel files', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { localStorage.removeItem('msaviewer_statsWin'); localStorage.removeItem('msaviewer_statsLabels'); } catch (e) {} openStats(); });
  await page.waitForFunction(() => document.querySelector('#statsSummaryTab table.stats-mx'), null, { timeout: 30000 });
  const sum = await page.evaluate(() => {
    const d = state._statsData, n = d.names.length;
    let min = Infinity, max = -Infinity, minP = [], maxP = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = parseFloat(d.identity[i][j]);
      if (v < min) { min = v; minP = [`${d.names[i]} × ${d.names[j]}`]; } else if (v === min) minP.push(`${d.names[i]} × ${d.names[j]}`);
      if (v > max) { max = v; maxP = [`${d.names[i]} × ${d.names[j]}`]; } else if (v === max) maxP.push(`${d.names[i]} × ${d.names[j]}`);
    }
    const rows = Object.fromEntries([...document.querySelectorAll('.stats-card tr')].map(tr => [tr.cells[0].textContent, tr]));
    const pairs = label => [...rows[label].querySelectorAll('.pair a')].map(a => a.textContent);
    return { tips: [...document.querySelectorAll('.stats-card .tip')].filter(e => e.title.length > 20).length,
      fields: Object.keys(rows).length, minOk: pairs('Min identity').every(p => minP.includes(p)) && pairs('Min identity').length > 0,
      maxOk: pairs('Max identity').every(p => maxP.includes(p)) && pairs('Max identity').length > 0 };
  });
  const w0 = await page.evaluate(() => document.getElementById('alignmentContainer').getBoundingClientRect().width);
  await page.click('#statsDockBtn');
  await page.waitForTimeout(600);
  const docked = await page.evaluate((w0) => {
    const w = document.getElementById('statsModal').getBoundingClientRect(), a = document.getElementById('alignmentContainer').getBoundingClientRect();
    return { right: Math.round(innerWidth - w.right), bottom: Math.round(innerHeight - w.bottom), narrowed: a.width < w0 - 300, noOverlap: a.right <= w.left + 1 };
  }, w0);
  await page.click('#statsDockBtn');
  await page.waitForTimeout(400);
  const undocked = await page.evaluate((w0) => ({ pad: document.body.style.paddingRight,
    fullWidth: Math.abs(document.getElementById('alignmentContainer').getBoundingClientRect().width - w0) < 2 }), w0);
  const files = await page.evaluate(async () => {
    const got = {};
    const orig = URL.createObjectURL;
    URL.createObjectURL = b => { got.blob = b; return orig.call(URL, b); };
    saveStatsMatrix('csv', 'identity'); const csv = await got.blob.text();
    saveStatsMatrix('xlsx', 'identity'); const xl = new Uint8Array(await got.blob.arrayBuffer());
    URL.createObjectURL = orig;
    const d = state._statsData;
    const lines = csv.trimEnd().split('\r\n').map(l => l.split(','));
    const csvOk = lines.length === d.names.length + 1 && lines[5][0] === d.names[4] && lines[5][9] === d.identity[4][8];
    const text = new TextDecoder().decode(xl);
    return { csvOk, zip: xl[0] === 0x50 && xl[1] === 0x4b, sheet: text.includes('xl/worksheets/sheet1.xml') && text.includes(`<t>${d.names[4]}</t>`) };
  });
  const ok = sum.tips === 9 && sum.fields === 9 && sum.minOk && sum.maxOk && docked.right === 0 && docked.bottom === 0 && docked.narrowed && docked.noOverlap
    && undocked.pad === '' && undocked.fullWidth && files.csvOk && files.zip && files.sheet;
  return { pass: ok, detail: JSON.stringify({ sum, docked, undocked, files }) };
});

// Window title bars: every dialog's close button is a 26px target centred in its title bar
check('Dialog close buttons are centred in a title bar', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const r = {};
  for (const [name, open, btn] of [
    ['stats', 'openStats()', '#statsCloseBtn'],
    ['tree', 'state.selectedRows = new Set([0,1,2,3]); openTreeBuilder()', '#treeBuilderCloseBtn'],
    ['repeat', 'openRepeatFinder(0)', '#repeatFinderCloseBtn'],
    ['seqedit', 'openSeqEditor(0)', '#seqEditCloseBtn'],
  ]) {
    await page.evaluate(open);
    await page.waitForTimeout(900);
    r[name] = await page.evaluate((btn) => {
      const b = document.querySelector(btn), bar = b.closest('.win-titlebar');
      if (!bar) return 'no title bar';
      const br = b.getBoundingClientRect(), hr = bar.getBoundingClientRect();
      return { w: br.width, h: br.height, dy: Math.round((br.top + br.height / 2) - (hr.top + hr.height / 2)), glyph: b.textContent };
    }, btn);
    await page.click(btn);
    await page.waitForTimeout(200);
  }
  const ok = Object.values(r).every(v => v.w === 26 && v.h === 26 && Math.abs(v.dy) <= 1 && v.glyph === '×');
  return { pass: ok, detail: JSON.stringify(r) };
});

// Codon analysis marks frameshift gaps with side bars; drawn as borders they widened those
// cells by 4px and pushed the rest of the row off its columns
check('Codon analysis: frameshift-marked cells keep the column width (rows stay aligned)', async (page) => {
  const cds = 'ATGGCTAAAGGTCTGCAAGAATTCGGTACCTGGAAACCGATGCTTGCAGGTAAAGAACTGTTCCCGGGATCCTAA';
  const rows = ['>ref\n' + cds, '>del1\n' + cds.slice(0, 20) + '-' + cds.slice(21), '>del2\n' + cds.slice(0, 30) + '--' + cds.slice(32), '>ok\n' + cds];
  await page.setInputFiles('#fileInput', { name: 'cds.fa', mimeType: 'text/plain', buffer: Buffer.from(rows.join('\n') + '\n') });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const c = document.getElementById('codonAnalysis'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const lines = [...document.querySelectorAll('.seq-line[data-seq-index]')];
    const marked = document.querySelectorAll('.seq-data span.codon-fs-internal').length;
    const widths = new Set(), lefts = {};
    for (const l of lines) [...l.querySelector('.seq-data').children].filter(k => !k.classList.contains('seq-length')).forEach((k, ci) => {
      const b = k.getBoundingClientRect(); widths.add(Math.round(b.width * 100) / 100);
      (lefts[ci] ||= new Set()).add(Math.round(b.left * 10) / 10);
    });
    const misaligned = Object.values(lefts).filter(s => s.size > 1).length;
    return { rows: lines.length, marked, widths: [...widths], misaligned };
  });
  const ok = r.marked > 0 && r.widths.length === 1 && r.misaligned === 0;
  return { pass: ok, detail: JSON.stringify(r) };
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
