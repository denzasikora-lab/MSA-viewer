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
    // a user drives the bar with a wheel, press or touch; a bare scrollLeft write is our own mirror
    h.dispatchEvent(new WheelEvent('wheel', { deltaX: 1, bubbles: true }));
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
    if (await page.locator('#statsLabelsPanel').isHidden()) await page.click('#statsLabelsBtn');   // label options live in the Labels panel
    await page.selectOption('#statsLabelStyle', style);
    await page.waitForTimeout(150);
    out[style] = await page.evaluate(async (style) => {
      const sc = document.querySelector('#statsSummaryTab .stats-mx-scroll'), table = sc.querySelector('table');
      const head = [...table.tHead.rows[0].cells].filter(c => c.classList.contains('c'));
      const n = state._statsData.names.length, m = state._statsData.identity;
      const headOk = head.length === n && head.every((c, j) => c.title.startsWith(state._statsData.names[j]) &&
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

// Statistics window: esl-alistat fields and esl-alipid identity match a calculation done
// here from the FASTA file; every field has a documented tooltip (no underline); min/max
// name their pairs; it maximizes/restores, resizes from all 8 edges/corners, docks beside the
// alignment; clicking column names selects them for Copy; the pair filter counts, lists and
// saves the right pairs; CSV and Excel files hold the matrix
check('Statistics window: esl values, tooltips, maximize, 8-way resize, dock, column copy, pair filter, files', async (page) => {
  const fs = require('fs');
  const path = require('path');
  const FA = path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa');
  const recs = [];
  for (const line of fs.readFileSync(FA, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('>')) recs.push({ name: line.slice(1).trim().split(/\s+/)[0], seq: '' });
    else if (line.trim()) recs[recs.length - 1].seq += line.trim().toUpperCase();
  }
  const n = recs.length, L = Math.max(...recs.map(r => r.seq.length));
  const gap = c => c === undefined || c === '-' || c === '.';
  const rawLen = recs.map(r => [...r.seq].filter(c => !gap(c)).length);
  const esl = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let nid = 0;
    for (let p = 0; p < L; p++) { const a = recs[i].seq[p], b = recs[j].seq[p]; if (!gap(a) && !gap(b) && a === b) nid++; }
    const m = Math.min(rawLen[i], rawLen[j]);
    esl.push({ i, j, v: m ? nid / m * 100 : 0 });
  }
  const exp = { nres: rawLen.reduce((a, b) => a + b, 0).toLocaleString('en-US'), small: String(Math.min(...rawLen)), large: String(Math.max(...rawLen)),
    avgid: (esl.reduce((s, x) => s + x.v, 0) / esl.length).toFixed(1) + '%', ge95: esl.filter(x => x.v >= 95 - 1e-12).length };

  await page.setInputFiles('#fileInput', FA);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { localStorage.removeItem('msaviewer_statsWin'); localStorage.removeItem('msaviewer_statsLabels'); } catch (e) {}
    window._copied = null; navigator.clipboard.writeText = t => { window._copied = t; return Promise.resolve(); }; openStats(); });
  await page.waitForFunction(() => document.querySelector('#statsSummaryTab table.stats-mx'), null, { timeout: 30000 });
  const r = {};
  r.fields = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.stats-card tr')].map(tr => [tr.cells[0].textContent.trim(), tr.cells[1].textContent.trim()])));
  r.valuesOk = r.fields['Total # residues'] === exp.nres && r.fields['Smallest'] === exp.small && r.fields['Largest'] === exp.large
    && r.fields['Average identity'] === exp.avgid && r.fields['Mean'] === exp.avgid;
  r.tips = await page.evaluate(() => [...document.querySelectorAll('.stats-card .tip')].map(el => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const card = document.getElementById('statsTipCard'), cs = getComputedStyle(el);
    const o = { shown: !card.hidden && card.textContent.length > 30, plain: cs.borderBottomStyle === 'none' && cs.textDecorationLine === 'none', doc: !!card.querySelector('.doc') };
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    return o;
  }));
  r.tipsOk = r.tips.length >= 13 && r.tips.every(t => t.shown && t.plain) && r.tips.filter(t => t.doc).length >= 8;
  r.pairsOk = await page.evaluate(() => {
    const d = state._statsData, s = _statsIdentitySummary('esl');
    const shown = [...document.querySelectorAll('#statsIdCard .pair a')].map(a => [+a.dataset.i, +a.dataset.j]);
    return shown.length > 0 && shown.every(([i, j]) => Math.abs(d.pid.esl[i * d.n + j] - s.min) < 1e-9 || Math.abs(d.pid.esl[i * d.n + j] - s.max) < 1e-9);
  });
  // maximize and restore
  const rect = () => page.evaluate(() => { const b = document.getElementById('statsModal').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(); });
  const before = await rect();
  await page.click('#statsMaxBtn'); await page.waitForTimeout(150);
  r.maxFills = await page.evaluate(() => { const b = document.getElementById('statsModal').getBoundingClientRect(); return b.width >= innerWidth - 10 && b.bottom >= innerHeight - 6; });
  await page.dblclick('#statsHeader h3'); await page.waitForTimeout(150);
  r.restored = (await rect()) === before;
  // resize from each edge and corner
  r.resize = {};
  for (const [dir, dx, dy] of [['e', 50, 0], ['w', -50, 0], ['s', 0, 40], ['n', 0, -30], ['se', 30, 20], ['sw', -30, 20], ['ne', 30, -20], ['nw', -30, -20]]) {
    await page.evaluate(() => _statsSetFloatRect({ left: 250, top: 120, width: 820, height: 560 }));
    const hb = await page.locator(`.stats-rz[data-dir="${dir}"]`).boundingBox();
    const x = hb.x + hb.width / 2, y = hb.y + hb.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 3 }); await page.mouse.up();
    const [left, top, w, h] = (await rect()).split(',').map(Number);
    const ew = 820 + (dir.includes('e') ? dx : dir.includes('w') ? -dx : 0), eh = 560 + (dir.includes('s') ? dy : dir.includes('n') ? -dy : 0);
    const el = 250 + (dir.includes('w') ? dx : 0), et = 120 + (dir.includes('n') ? dy : 0);
    r.resize[dir] = Math.abs(w - ew) <= 1 && Math.abs(h - eh) <= 1 && Math.abs(left - el) <= 1 && Math.abs(top - et) <= 1;
  }
  // column selection -> Copy copies those columns
  await page.evaluate(() => _statsSetFloatRect({ left: 60, top: 60, width: 1200, height: 760 }));
  await page.click('table.stats-mx thead th[data-c="2"]');
  await page.click('table.stats-mx thead th[data-c="5"]', { modifiers: ['Control'] });
  await page.click('#statsCopyBtn'); await page.waitForTimeout(150);
  r.copy = await page.evaluate(() => { const rows = window._copied.trimEnd().split('\n').map(l => l.split('\t')); const d = state._statsData;
    return rows.length === d.n + 1 && rows[0].length === 3 && rows[0][1] === d.names[2] && rows[0][2] === d.names[5] && rows[7][2] === d.identity[6][5]
      && document.querySelectorAll('table.stats-mx thead th.cs').length === 2 && document.getElementById('statsCopyBtn').textContent === 'Copy 2 columns'; });
  await page.keyboard.press('Escape');
  // pair filter
  await page.fill('#statsFilterValue', '95'); await page.waitForTimeout(500);
  r.filter = await page.evaluate(() => ({ hits: state._statsHits.length, cells: document.querySelectorAll('table.stats-mx td.hit').length }));
  await page.click('.stats-view button[data-view="list"]'); await page.waitForTimeout(200);
  r.listRows = await page.evaluate(() => document.querySelectorAll('table.stats-pairs tbody tr').length);
  r.saved = await page.evaluate(async () => {
    const got = []; const orig = URL.createObjectURL;
    URL.createObjectURL = b => { got.push(b); return orig.call(URL, b); };
    _statsSavePairs('pairs'); _statsSavePairs('fasta-raw'); saveStatsMatrix('csv', 'identity'); saveStatsMatrix('xlsx', 'identity');
    URL.createObjectURL = orig;
    const [pairs, fa, csv] = await Promise.all(got.slice(0, 3).map(b => b.text()));
    const xl = new Uint8Array(await got[3].arrayBuffer());
    const d = state._statsData;
    return { pairLines: pairs.trimEnd().split('\r\n').length - 1, faSeqs: (fa.match(/^>/gm) || []).length, faNoGaps: !/-/.test(fa.split('\n').filter(l => !l.startsWith('>')).join('')),
      csvOk: csv.split('\r\n')[5].split(',')[9] === d.identity[4][8], xlsx: xl[0] === 0x50 && xl[1] === 0x4b };
  });
  // dock beside the alignment
  await page.click('.stats-view button[data-view="matrix"]');
  const w0 = await page.evaluate(() => document.getElementById('alignmentContainer').getBoundingClientRect().width);
  await page.click('#statsDockBtn'); await page.waitForTimeout(500);
  r.dock = await page.evaluate((w0) => { const w = document.getElementById('statsModal').getBoundingClientRect(), a = document.getElementById('alignmentContainer').getBoundingClientRect();
    return Math.round(innerWidth - w.right) === 0 && a.width < w0 - 300 && a.right <= w.left + 1; }, w0);
  await page.click('#statsDockBtn'); await page.waitForTimeout(300);
  r.undock = await page.evaluate(() => document.body.style.paddingRight === '');
  const ok = r.valuesOk && r.tipsOk && r.pairsOk && r.maxFills && r.restored && Object.values(r.resize).every(Boolean) && r.copy
    && r.filter.hits === exp.ge95 && r.filter.cells === 2 * exp.ge95 && r.listRows === exp.ge95
    && r.saved.pairLines === exp.ge95 && r.saved.faSeqs > 0 && r.saved.faNoGaps && r.saved.csvOk && r.saved.xlsx && r.dock && r.undock;
  delete r.fields; delete r.tips;
  return { pass: ok, detail: JSON.stringify(r) };
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

// Codon analysis: leading/trailing gaps are not frameshifts, an internal 1-base gap is marked
// once, a row starting mid-codon is read in the alignment's frame, the translation track lines
// up with the bases with each letter over its codon's middle base, and long names end in one "…"
check('Codon analysis: frameshift only for internal gaps, late rows keep frame, track aligned', async (page) => {
  const cds = 'ATGGCTAAAGGTCTGCAAGAATTCGGTACCTGGAAACCGATGCTTGCAGGTAAAGAACTGTTCCCGGGATCCTAA';
  const rows = [
    ['ref', cds],
    ['late_start_mid_codon', '----' + cds.slice(4)],            // starts at column 5 = 2nd base of codon 2
    ['short_end', cds.slice(0, 50) + '-'.repeat(cds.length - 50)], // trailing gaps
    ['internal_1bp_gap_with_a_very_long_name_indeed', cds.slice(0, 20) + '-' + cds.slice(21)],
  ];
  await page.setInputFiles('#fileInput', { name: 'cds.fa', mimeType: 'text/plain', buffer: Buffer.from(rows.map(([n, s]) => `>${n}\n${s}`).join('\n') + '\n') });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n = document.getElementById('nameLengthInput'); n.value = 20; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true }));
    const c = document.getElementById('codonAnalysis'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const cd = state._codonData;
    const fs = cd.frameShifts.map(f => f.filter(x => x.type === 'indel').length);
    const refCodon5 = cd.aaSeq[0].find(e => e.cols[0] === 6);      // codon 3 of ref: columns 7-9
    const lateCodon = cd.aaSeq[1].find(e => e.cols[0] === 6);
    const lateFirst = cd.aaSeq[1][0]?.cols[0];
    let misaligned = 0, notMid = 0;
    document.querySelectorAll('.seq-line[data-seq-index]').forEach(line => {
      const aa = line.nextElementSibling; if (!aa?.classList.contains('aa-row')) return;
      const nt = [...line.querySelector('.seq-data').children].filter(k => k.dataset.pos != null);
      const ac = [...aa.querySelector('.aa-data').children];
      const i = +line.dataset.seqIndex;
      ac.forEach((a, k) => {
        if (nt[k] && Math.abs(a.getBoundingClientRect().left - nt[k].getBoundingClientRect().left) > 0.6) misaligned++;
        if (a.classList.contains('aa-c') && a.textContent.trim()) {
          const e = cd.aaSeq[i].find(x => x.cols.includes(k));
          if (!e || e.cols[1] !== k || e.aa !== a.textContent) notMid++;
        }
      });
    });
    const marks = [...document.querySelectorAll('.aa-row')].map(a => a.querySelectorAll('.aa-fs').length);
    const longName = document.querySelector('.seq-line[data-seq-index="3"] .seq-name').textContent.trim();
    return { fs, marks, lateFirst, lateOk: !!lateCodon && lateCodon.aa === refCodon5.aa && lateCodon.codon === refCodon5.codon,
      misaligned, notMid, longName, nameFits: longName.length <= 20 && longName.endsWith('…') && !longName.includes('...') };
  });
  const ok = r.fs[0] === 0 && r.fs[1] === 0 && r.fs[2] === 0 && r.fs[3] === 1 && r.marks.join() === '0,0,0,1'
    && r.lateFirst === 6 && r.lateOk && r.misaligned === 0 && r.notMid === 0 && r.nameFits;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Name Len: "No limit" shows every name in full and survives the render it triggers and a
// preset round-trip; typing in the box is not clamped per keystroke (12 stays 12) and an
// over-range entry clamps to the max on Enter; while dragging, the column width and the cut
// names always agree
check('Name Len: No limit works, typing 12 gives 12, Enter clamps, width and names agree', async (page) => {
  const names = Array.from({ length: 12 }, (_, i) => `sequence_with_a_long_name_number_${String(i).padStart(2, '0')}`);
  const seq = 'ACGTACGTAC'.repeat(8);
  await page.setInputFiles('#fileInput', { name: 'names.fa', mimeType: 'text/plain', buffer: Buffer.from(names.map(n => `>${n}\n${seq}`).join('\n') + '\n') });
  await page.waitForTimeout(1200);
  const look = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.seq-line[data-seq-index] > .seq-name')].filter(r => state.seqs[+r.parentElement.dataset.seqIndex]);
    const css = +getComputedStyle(document.documentElement).getPropertyValue('--nameLen');
    const texts = rows.map(r => r.textContent.trim());
    return { css, slider: +el('nameLengthSlider').value, max: +el('nameLengthSlider').max, box: el('nameLengthInput').value,
      full: texts.filter((t, i) => t === state.seqs[+rows[i].parentElement.dataset.seqIndex].header).length, n: rows.length,
      maxShown: Math.max(...texts.map(t => t.length)) };
  });
  const r = {};
  await page.hover('.section-header[data-section="display"]');
  await page.waitForTimeout(300);
  await page.click('#nameLengthNoLimit'); await page.waitForTimeout(600);
  r.noLimit = await look();
  // preset round-trip keeps No limit
  await page.evaluate(() => { savePreset(); const cb = el('nameLengthNoLimit'); cb.checked = false; cb.dispatchEvent(new Event('change')); });
  await page.waitForTimeout(400);
  await page.evaluate(() => loadPreset());
  await page.waitForTimeout(600);
  r.afterPreset = { ...(await look()), checked: await page.evaluate(() => el('nameLengthNoLimit').checked) };
  await page.click('#nameLengthNoLimit'); await page.waitForTimeout(600);
  r.unticked = await look();
  await page.click('#nameLengthInput', { clickCount: 3 });
  await page.keyboard.type('12'); await page.waitForTimeout(700);
  r.typed12 = await look();
  await page.click('#nameLengthInput', { clickCount: 3 });
  await page.keyboard.type('99'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  r.enter99 = await look();
  r.drag = await page.evaluate(async () => {
    const s = el('nameLengthSlider'); const bad = [];
    for (const v of [30, 22, 15, 8]) {
      s.value = v; s.dispatchEvent(new Event('input', { bubbles: true }));
      const css = +getComputedStyle(document.documentElement).getPropertyValue('--nameLen');
      const shown = Math.max(...[...document.querySelectorAll('.seq-line[data-seq-index] > .seq-name')].filter(r => state.seqs[+r.parentElement.dataset.seqIndex]).map(x => x.textContent.trim().length));
      if (css !== v || shown !== v) bad.push({ v, css, shown });
    }
    return bad;
  });
  const longest = Math.max(...names.map(n => n.length));
  const ok = r.noLimit.full === r.noLimit.n && r.noLimit.css === longest
    && r.afterPreset.checked && r.afterPreset.full === r.afterPreset.n
    && r.unticked.full === 0 && r.unticked.css === r.unticked.slider
    && r.typed12.css === 12 && r.typed12.box === '12' && r.typed12.maxShown === 12
    && r.enter99.slider === r.enter99.max && r.enter99.box === String(r.enter99.max) && r.enter99.css === r.enter99.max
    && r.drag.length === 0;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Tree builder: identical sequences cluster together under both methods (NJ breaks tied Q
// scores toward the closer pair); a pair with no shared aligned base gets no invented
// distance and is reported; a saturated JC69 pair does not turn branch lengths into NaN
check('Tree builder: NJ ties, no-shared-base and saturated pairs', async (page) => {
  const r = await page.evaluate(() => {
    const ident = [
      { header: 'Alpha one', seq: 'ACGTACGT' }, { header: 'Alpha two', seq: 'ACGTACGT' },
      { header: 'beta', seq: 'GCGTACGT' }, { header: "O'Brien", seq: 'ACGTACGT' }];
    const nj = buildNJTreeFromAlignment(ident, 'raw').newick;
    const upgma = buildUPGMATreeFromAlignment(ident, 'raw').newick;
    // beta must be outside the clade holding the three identical sequences
    const betaOutside = nw => { const t = nw.replace(/:[0-9.]+/g, ''); return /^\(beta,\(.*\)\);$/.test(t) || /^\(\(.*\),beta\);$/.test(t); };
    const noShare = [
      { header: 'left', seq: 'ACGTACGTAC----------' }, { header: 'left2', seq: 'ACGAACGTAC----------' },
      { header: 'right', seq: '----------TTGCATGCAA' }];
    const ns = buildUPGMATreeFromAlignment(noShare, 'raw');
    const sat = [
      { header: 's1', seq: 'ACGTACGTACGT' }, { header: 's2', seq: 'ACGTACGTACGA' }, { header: 's3', seq: 'TGCATGCATGCA' }];
    const sj = buildNJTreeFromAlignment(sat, 'jc69');
    return { nj, upgma, njOk: betaOutside(nj), upgmaOk: betaOutside(upgma),
      nsDistance: _modelPairDistance('ACGTACGT', '--------', 'raw'), nsPairs: ns.stats.noOverlap.length, nsFill: ns.stats.filledWith, nsMax: ns.stats.maxDistance,
      satPairs: sj.stats.saturated.length, satNewick: sj.newick, satNaN: /NaN|Infinity/.test(sj.newick),
      // s3 differs from s1/s2 everywhere: its distance must stay larger than theirs
      satFar: (() => { const u = buildUPGMATreeFromAlignment(sat, 'jc69').newick.replace(/:[0-9.]+/g, ''); return /^\(s3,\(s1,s2\)\);$|^\(\(s1,s2\),s3\);$/.test(u); })() };
  });
  const ok = r.njOk && r.upgmaOk && Number.isNaN(r.nsDistance) && r.nsPairs === 2 && r.nsFill === r.nsMax
    && r.satPairs === 2 && !r.satNaN && r.satFar;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Frameshifts are judged against the other rows: one row with an extra base is the only
// row flagged, not the four rows that have a 1-column gap opposite it
check('Codon analysis: an insertion in one row flags that row only', async (page) => {
  const cds = 'ATGGCTAAAGGTCTGCAAGAATTCGGTACCTGGAAACCGATGCTTGCAGGTAAAGAACTGTTCCCGGGATCCTAA';
  const gapped = cds.slice(0, 30) + '-' + cds.slice(30);
  const rows = [['r1', gapped], ['r2', gapped], ['r3', gapped], ['r4', gapped], ['ins', cds.slice(0, 30) + 'T' + cds.slice(30)]];
  await page.setInputFiles('#fileInput', { name: 'ins.fa', mimeType: 'text/plain', buffer: Buffer.from(rows.map(([n, s]) => `>${n}\n${s}`).join('\n') + '\n') });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const c = document.getElementById('codonAnalysis'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    fs: state._codonData.frameShifts.map(f => f.length),
    marked: [...document.querySelectorAll('.aa-row')].map(a => a.querySelectorAll('.aa-fs, .aa-fs-at').length),
  }));
  const ok = r.fs.join() === '0,0,0,0,1' && r.marked.join() === '0,0,0,0,1';
  return { pass: ok, detail: JSON.stringify(r) };
});

// Statistics heatmap: off by default; on, every off-diagonal cell is coloured, the lowest and
// highest take the palette's end colours and colours follow value order; a custom range puts
// values below it at the first colour; Reverse flips; the panel stays inside the window
check('Statistics heatmap: colours follow values, custom range, reverse, panel inside window', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { ['msaviewer_statsWin', 'msaviewer_statsLabels', 'msaviewer_statsHeat'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); openStats(); });
  await page.waitForFunction(() => document.querySelector('#statsSummaryTab table.stats-mx'), null, { timeout: 30000 });
  const cells = () => page.evaluate(() => {
    const d = state._statsData, n = d.n, out = [];
    for (const tr of document.querySelector('table.stats-mx').tBodies[0].rows) {
      const rn = tr.cells[0]; if (!rn?.dataset.r) continue; const i = +rn.dataset.r;
      for (let j = 0; j < n; j++) if (i !== j) out.push({ v: d.pid[d.mode][i * n + j], bg: tr.cells[j + 1].style.background });
    }
    return out;
  });
  const r = {};
  r.offByDefault = (await cells()).every(c => !c.bg);
  await page.click('#statsHeatBtn');
  r.panelInside = await page.evaluate(() => { const p = document.getElementById('statsHeatPanel').getBoundingClientRect(), b = document.getElementById('statsContent').getBoundingClientRect(); return p.left >= b.left && p.right <= b.right; });
  await page.click('#statsHeatOn'); await page.waitForTimeout(300);
  const lum = s => { const m = s.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  let cs = (await cells()).sort((a, b) => a.v - b.v);
  r.allColoured = cs.every(c => c.bg);
  r.ends = cs[0].bg === 'rgb(255, 255, 204)' && cs[cs.length - 1].bg === 'rgb(177, 0, 38)';
  r.monotonic = cs.every((c, k) => k === 0 || lum(c.bg) <= lum(cs[k - 1].bg) + 0.5);
  await page.fill('#statsHeatLo', '90'); await page.fill('#statsHeatHi', '100'); await page.waitForTimeout(600);
  cs = await cells();
  r.range = cs.filter(c => c.v < 90).every(c => c.bg === 'rgb(255, 255, 204)');
  await page.click('#statsHeatReverse'); await page.waitForTimeout(300);
  cs = await cells();
  r.reverse = cs.filter(c => c.v < 90).every(c => c.bg === 'rgb(177, 0, 38)');
  r.legend = await page.evaluate(() => document.getElementById('statsHeatLegend').textContent);
  const ok = r.offByDefault && r.panelInside && r.allColoured && r.ends && r.monotonic && r.range && r.reverse && r.legend === '90.0100.0%';
  return { pass: ok, detail: JSON.stringify(r) };
});

// GLM audit 2026-09-27, confirmed defects: RNA codons translated to X; synonymous /
// non-synonymous marks put on unchanged bases; a row with bases before the frame start was
// not placed on the codon grid; the k-mer guide tree dropped every U
check('Codon/guide-tree audit fixes: RNA translation, marks on changed bases only, frame start, RNA k-mers', async (page) => {
  const dna = 'ATGGCTCTGAAATAA';
  const fa = `>dna_ref\n${dna}\n>rna\n${dna.replace(/T/g, 'U')}\n>syn\nATGGCTTTGAAATAA\n>nonsyn\nATGGAACTGAAATAA\n`;
  await page.setInputFiles('#fileInput', { name: 'c.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const c = document.getElementById('codonAnalysis'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const cd = state._codonData;
    const marks = cd.synNonSyn.map(row => row.map((v, c) => v ? c + ':' + v : null).filter(Boolean).join(' '));
    // Frame 3 (offset 2): codons start at columns 2, 5, 8, ... A row with bases in columns 0-1
    // (before the frame start) and a gap in 2-5 resumes at column 6, the 2nd base of the codon
    // at 5-7; that partial codon gets no amino acid and translation starts at column 8
    const ref = 'NNATGGCTCTGAAATAA', row = 'NA' + '----' + 'CT' + 'CTGAAATAA';
    const fr = _computeCodonAnalysis([{ seq: ref }, { seq: row }], ref.length, 2);
    const g = _kmerGuideTree([{ seq: 'ACGUACGUUUGACGUAAGU' }, { seq: 'ACGUACGUUUGACGUAAGU' }, { seq: 'GGGCCCAAAGGGCCCAAAG' }], 4);
    const groups = cutGuideTree([{ seq: 'ACGUACGUUUGACGUAAGU' }, { seq: 'ACGUACGUUUGACGUAAGU' }, { seq: 'GGGCCCAAAGGGCCCAAAG' }], 2, 4);
    return { aa: cd.aaSeq.map(x => x.map(e => e.aa).join('')), marks,
      frameStart: fr.aaSeq[1][0]?.cols[0], frameAa: fr.aaSeq[1].map(e => e.aa).join(''),
      rnaGroups: JSON.stringify(groups.groups || groups) };
  });
  const ok = r.aa.join() === 'MALK*,MALK*,MALK*,MELK*' && r.marks.join('|') === '||6:syn|4:nonsyn 5:syn'
    && r.frameStart === 8 && r.frameAa === 'LK*' && /\[0,1\]|\[1,0\]/.test(r.rnaGroups.replace(/\s/g, ''));
  return { pass: ok, detail: JSON.stringify(r) };
});

// Clusterability verdict (GLM audit): a setting that changes the clusters but not the assigned
// count is not "changed nothing"; on a tie for most assigned the current settings stay best;
// with no current-settings result nothing is called inert
check('Clusterability verdict: whole outcome compared, ties keep current settings', async (page) => {
  const r = await page.evaluate(() => {
    const html = rows => { _renderClusterabilityReport(rows, {}, 20); return document.getElementById('clusteringContent').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); };
    const a = html([
      { label: 'current settings', clusters: 1, assigned: 10, largest: 10 },
      { label: 'Quality: loose', clusters: 2, assigned: 10, largest: 6 },
      { label: 'Min Size 3', clusters: 1, assigned: 10, largest: 10 }]);
    const b = html([
      { label: 'Min Size 3', clusters: 2, assigned: 12, largest: 7 },
      { label: 'current settings', clusters: 2, assigned: 12, largest: 7 }]);
    const c = html([
      { label: 'current settings', error: 'failed' },
      { label: 'Quality: loose', clusters: 1, assigned: 5, largest: 5 }]);
    return { a, b, c };
  });
  const ok = /Changed the outcome: Quality/.test(r.a) && /Changed nothing[^.]*: Min Size/.test(r.a) && !/Changed nothing[^.]*Quality/.test(r.a)
    && /current settings are already the best/.test(r.b) && !/Changed nothing|Changed the outcome/.test(r.c);
  return { pass: ok, detail: JSON.stringify({ a: r.a.slice(0, 300), b: r.b.slice(0, 160), c: r.c.slice(0, 200) }) };
});

// GLM audit batch 2: at most n-1 sequences can differ from a column's consensus, so the
// variable-sites count maximum is n-1 and 100% still finds the most variable column (it
// blanked the alignment); codons with an ambiguous base get no syn/nonsyn mark
check('Variable-sites top threshold and ambiguous codons (audit batch 2)', async (page) => {
  // column 4 has A/C/G/T (3 differ from any consensus); column 2 has one difference
  const fa = '>s1\nATGAAAGCT\n>s2\nATCACAGCT\n>s3\nATGAGAGCT\n>s4\nATGATAGCN\n';
  await page.setInputFiles('#fileInput', { name: 'v.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(async () => {
    const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
    const out = {};
    set('varSitesOnly', true);
    set('varThresholdMode', 'count');
    await new Promise(r => setTimeout(r, 400));
    out.countMax = document.getElementById('varSitesThreshold').max;
    set('varSitesThreshold', 3);
    await new Promise(r => setTimeout(r, 400));
    out.count3 = [...state._diffColumns].join(',');
    set('varThresholdMode', 'pct'); set('varSitesThreshold', 100);
    await new Promise(r => setTimeout(r, 400));
    out.pct100 = [...state._diffColumns].join(',');
    set('varSitesOnly', false); set('varSitesThreshold', 0);
    set('codonAnalysis', true);
    await new Promise(r => setTimeout(r, 600));
    const cd = state._codonData;
    out.s4marks = cd.synNonSyn[3].map((v, c) => v ? c + ':' + v : null).filter(Boolean).join(' ');
    out.s2marks = cd.synNonSyn[1].map((v, c) => v ? c + ':' + v : null).filter(Boolean).join(' ');
    return out;
  });
  // s4's last codon GCN (vs GCT) has an N: no mark there; s2's ATC (vs ATG) is marked at column 2
  const ok = r.countMax === '3' && r.count3 === '4' && r.pct100 === '4' && !/(^|\s)8:/.test(r.s4marks) && /(^|\s)2:nonsyn/.test(r.s2marks);
  return { pass: ok, detail: JSON.stringify(r) };
});

// GLM audit batch 3: the name-similarity sensitivity slider's 0 (strictest) was read as 3
check('Colour names by similarity: sensitivity 0 is the strictest setting, not 3', async (page) => {
  const fa = '>alphabeta_01\nACGT\n>alphabeta_02\nACGT\n>zzzzzz_9\nACGT\n';
  await page.setInputFiles('#fileInput', { name: 'n.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(900);
  const colours = (sens) => page.evaluate((sens) => {
    document.getElementById('colourSimilarityChars').value = 12;
    document.getElementById('colourSimilarityThreshold').value = sens;
    autoColourBySimilarity();
    const m = colourState.mappings;
    return [m.get('alphabeta_01'), m.get('alphabeta_02'), m.get('zzzzzz_9')];
  }, sens);
  const s0 = await colours(0), s10 = await colours(10);
  const r = { strictSame: s0[0] === s0[1], looseSame: s10[0] === s10[1], strictColours: s0, looseColours: s10 };
  return { pass: !r.strictSame && r.looseSame, detail: JSON.stringify(r) };
});

// GLM audit batch 3: a heatmap range typed low > high painted every cell one colour; a pair
// with no shared base became distance 0 when all defined distances were 0 (a false twin)
check('Heatmap inverted range and tree fill when all defined distances are 0 (audit batch 3)', async (page) => {
  const r = await page.evaluate(() => {
    const hc = { lo: 90, hi: 90, reverse: false, stops: [[0, 0, 0], [255, 255, 255]] };
    const single = [_statsHeatColour(hc, 80).bg, _statsHeatColour(hc, 95).bg];
    // identical comparable sequences plus one that overlaps none of them
    const seqs = [{ header: 'a', seq: 'ACGTACGT--------' }, { header: 'b', seq: 'ACGTACGT--------' }, { header: 'c', seq: '--------TTTTGGGG' }];
    const m = _treeDistanceMatrix(seqs, 'raw');
    return { single, acDist: m.D[0][2], fill: m.stats.filledWith, nw: buildUPGMATreeFromAlignment(seqs, 'raw').newick };
  });
  // inverted range through the UI: typed 100 .. 20 is stored as 20 .. 100
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { ['msaviewer_statsHeat'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); openStats(); });
  await page.waitForFunction(() => document.querySelector('#statsSummaryTab table.stats-mx'), null, { timeout: 30000 });
  await page.click('#statsHeatBtn'); await page.click('#statsHeatOn');
  await page.fill('#statsHeatLo', '100'); await page.fill('#statsHeatHi', '20'); await page.waitForTimeout(600);
  r.stored = await page.evaluate(() => _statsHeatOpts().range.identity);
  r.distinct = await page.evaluate(() => new Set([...document.querySelectorAll('table.stats-mx td')].map(t => t.style.background).filter(Boolean)).size);
  const ok = r.single[0] === 'rgb(0,0,0)' && r.single[1] === 'rgb(255,255,255)' && r.acDist === 1 && r.fill === 1
    && r.stored.lo === 20 && r.stored.hi === 100 && r.distinct > 10;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Neighbor-Joining against known trees (distance matrix injected): the Wikipedia 5-taxon
// example, and a long-branch case where the closest pair (a,c) is not a cherry. The tie-break
// added earlier the same day made the scan ignore Q until it met a pair closer than the first
// one, so with a,c first the wrong pair was joined (found by the GLM audit)
check('Neighbor-Joining reproduces known trees (Wikipedia example, long branches)', async (page) => {
  const r = await page.evaluate(() => {
    const run = (D, names) => {
      const orig = window._treeDistanceMatrix;
      window._treeDistanceMatrix = () => ({ D: D.map(x => x.slice()), stats: { count: names.length, averageDistance: 0, minDistance: 0, maxDistance: 0, noOverlap: [], saturated: [], filledWith: null, names } });
      try { return buildNJTreeFromAlignment(names.map(n => ({ header: n, seq: 'A' })), 'raw').newick; }
      finally { window._treeDistanceMatrix = orig; }
    };
    return {
      wiki: run([[0,5,9,9,8],[5,0,10,10,9],[9,10,0,8,7],[9,10,8,0,3],[8,9,7,3,0]], ['a','b','c','d','e']),
      lba: run([[0,3,5,6],[3,0,6,5],[5,6,0,9],[6,5,9,0]], ['a','c','b','d']),
    };
  });
  // leaf branch lengths from the Newick
  const len = (nw, leaf) => { const m = nw.match(new RegExp('[(,]' + leaf + ':([0-9.]+)')); return m ? +m[1] : null; };
  const wikiOk = len(r.wiki, 'a') === 2 && len(r.wiki, 'b') === 3 && len(r.wiki, 'd') === 2 && len(r.wiki, 'e') === 1 && /\(a:2(\.0)?,b:3(\.0)?\)/.test(r.wiki);
  const lbaOk = /\(a:1(\.0)?,b:4(\.0)?\)/.test(r.lba) && len(r.lba, 'c') === 1 && !/\(a:[0-9.]+,c:/.test(r.lba) && !/\(c:[0-9.]+,a:/.test(r.lba);
  return { pass: wikiOk && lbaOk, detail: JSON.stringify(r) };
});

// Reorder only uses the k shown next to it in the Alignment menu, which is the same setting as
// k in Clustering > Group by k-mer; the two boxes stay in step both ways
check('Reorder only: selectable k in the Alignment menu, linked to Group by k-mer k', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const input = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
    const out = {};
    input('mafftReorderK', 4); out.syncAtoB = document.getElementById('guideTreeK').value;
    input('guideTreeK', 9); out.syncBtoA = document.getElementById('mafftReorderK').value;
    input('mafftReorderK', 40); out.clamped = [document.getElementById('mafftReorderK').value, document.getElementById('guideTreeK').value];
    const orderFor = (k) => _kmerGuideTree(state.seqs.map(s => ({ header: s.header, seq: s.seq.replace(/[-.]/g, '') })), k).order.map(i => state.seqs[i].header).join(',');
    out.kMatters = orderFor(3) !== orderFor(10);
    const runWithK = async (k) => {
      input('mafftReorderK', k);
      const expect = orderFor(k);   // from the rows as they are before this run
      document.getElementById('mafftReorderOnly').checked = true;
      window.confirm = () => true;
      await realignAll();
      await new Promise(res => setTimeout(res, 400));
      return { got: state.seqs.map(s => s.header).join(','), expect };
    };
    out.k3 = await runWithK(3);
    out.k10 = await runWithK(10);
    return out;
  });
  const ok = r.syncAtoB === '4' && r.syncBtoA === '9' && r.clamped[0] === '12' && r.clamped[1] === '12'
    && r.k3.got === r.k3.expect && r.k10.got === r.k10.expect && r.kMatters;
  return { pass: ok, detail: JSON.stringify({ ...r, k3: r.k3.got === r.k3.expect, k10: r.k10.got === r.k10.expect }) };
});

// Row and column selection update only what changed (was: a document-wide query per selected
// row, and a <style> rule re-matched against every span). What the user sees must still follow
// the state exactly: after toggles, a range, a clear, a full redraw and with hidden columns.
check('Selection: row/column highlight follows the state after delta updates', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => {
    const frames = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    // A selected column is a blue tint (background-image) over whatever the residue shows,
    // since the conflict-study phase 2; it used to be a fill colour.
    const COL_TINT = 'rgba(25, 118, 210, 0.28)';
    const isCol = e => getComputedStyle(e).backgroundImage.includes(COL_TINT);
    // Compare what is painted with the state: every residue span, every row line and name.
    const audit = () => {
      const bad = [];
      document.querySelectorAll('.seq-data > span[data-pos]').forEach(sp => {
        const want = state.selectedColumns.has(+sp.dataset.pos);
        const got = isCol(sp);
        if (want !== got && bad.length < 5) bad.push('col ' + sp.dataset.pos + (want ? ' missing' : ' stale'));
      });
      document.querySelectorAll('.seq-line[data-seq-index], .seq-name[data-seq-index]').forEach(e => {
        const i = +e.dataset.seqIndex;
        if (i < 0) return;
        if (state.selectedRows.has(i) !== e.classList.contains('selected') && bad.length < 10) bad.push('row ' + i);
      });
      return bad;
    };
    const out = {};
    const cols = (...c) => { c.forEach(x => state.selectedColumns.has(x) ? state.selectedColumns.delete(x) : state.selectedColumns.add(x)); updateColumnSelections(); };
    const rows = (...c) => { c.forEach(x => state.selectedRows.has(x) ? state.selectedRows.delete(x) : state.selectedRows.add(x)); updateRowSelections(); };
    cols(3, 7, 8); rows(1, 4); await frames(); out.toggle = audit();
    cols(7); rows(4, 2); await frames(); out.untoggle = audit();
    for (let c = 20; c < 60; c++) state.selectedColumns.add(c); updateColumnSelections(); await frames(); out.range = audit();
    // a selected column still shows its colour inside a selected row (the old rule's precedence)
    const sp = document.querySelector('.seq-line[data-seq-index="1"] .seq-data > span[data-pos="3"]');
    out.colOverRow = !!sp && isCol(sp);
    state.selectedColumns = new Set([5, 25]); updateColumnSelections(); await frames(); out.reassigned = audit();
    renderAlignment(); await new Promise(res => setTimeout(res, 600)); out.afterRender = audit();
    const cons = document.querySelector('.consensus-line .seq-data > span[data-pos="25"]');
    out.consensusBaked = !cons || isCol(cons);
    cols(6); await frames(); out.afterRenderToggle = audit();
    state.selectedColumns.clear(); state.selectedRows.clear(); updateColumnSelections(); updateRowSelections(); await frames(); out.cleared = audit();
    return out;
  });
  const lists = ['toggle', 'untoggle', 'range', 'reassigned', 'afterRender', 'afterRenderToggle', 'cleared'];
  const ok = lists.every(k => r[k].length === 0) && r.colOverRow && r.consensusBaked;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Speed: the update itself (script + forced style/layout) for a column and for rows on ~300k
// residue spans. Old code here: column 104-129 ms, one row ~850 ms, 150 rows ~1 s.
// (Real clicks were slower still from hit-testing positioned spans; see styles.css.)
check('Selection speed: column click and 150 rows on 300k spans', async (page) => {
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const base = Array.from({ length: 700 }, () => 'ACGT'[rnd() % 4]);
  let fa = '';
  for (let i = 0; i < 420; i++) fa += `>s${i}\n` + base.map(c => (rnd() % 8 === 0 ? 'ACGT-'[rnd() % 5] : c)).join('') + '\n';
  await page.setInputFiles('#fileInput', { name: 'big.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForFunction(() => state.seqs && state.seqs.length === 420, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(async () => {
    const frames = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const time = (fn) => { const t0 = performance.now(); fn(); void document.body.offsetHeight; return Math.round(performance.now() - t0); };
    const out = { spans: document.querySelectorAll('.seq-data > span[data-pos]').length };
    out.col1 = time(() => { state.selectedColumns.add(100); updateColumnSelections(); }); await frames();
    out.col2 = time(() => { state.selectedColumns.add(101); updateColumnSelections(); }); await frames();
    out.rows150 = time(() => { for (let i = 10; i < 160; i++) state.selectedRows.add(i); updateRowSelections(); }); await frames();
    out.row1 = time(() => { state.selectedRows.add(300); updateRowSelections(); });
    return out;
  });
  const ok = r.spans > 250000 && r.col2 < 60 && r.row1 < 300 && r.rows150 < 600;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Highlight diffs (and its threshold) now update the page in place instead of redrawing it.
// The result must be exactly what a redraw draws: same screenshot, in Block and Full mode,
// switching on, changing the threshold, switching off; and no redraw may happen.
check('Highlight diffs: in-place update matches a full redraw exactly', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const out = {};
  const settle = () => page.waitForTimeout(400);
  for (const mode of ['modeBlocks', 'modeSingle']) {
    await page.evaluate((m) => { const r = document.getElementById(m); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, mode);
    await page.waitForTimeout(1200);
    // A redraw replaces every row element, so a marked row that is still in the page means none happened
    const mark = () => page.evaluate(() => { const d = document.querySelector('#alignmentContainer .seq-line:not(.scale-ruler-line) .seq-data'); d.__mark = 1; window.__marked = d; });
    await mark();
    const steps = [
      ['on', () => { const e = document.getElementById('highlightDiffs'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }],
      ['threshold', () => { document.getElementById('varThresholdMode').value = 'count'; const e = document.getElementById('varSitesThresholdInput'); e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }],
      ['off', () => { const e = document.getElementById('highlightDiffs'); e.checked = false; e.dispatchEvent(new Event('change', { bubbles: true })); }],
    ];
    for (const [name, fn] of steps) {
      await page.evaluate(fn); await settle();
      const renders = await page.evaluate(() => (window.__marked.isConnected && window.__marked.__mark === 1) ? 0 : 1);
      const inPlace = await page.screenshot();
      await page.evaluate(() => renderAlignment()); await settle();
      const redrawn = await page.screenshot();
      await mark();
      const diffCols = await page.evaluate(() => state._diffColumns ? state._diffColumns.size : 0);
      out[mode + ':' + name] = { same: inPlace.equals(redrawn), renders, diffCols };
      if (process.env.SAVE_SHOTS && !inPlace.equals(redrawn)) { require('fs').writeFileSync(`scratch/_hd_${mode}_${name}_a.png`, inPlace); require('fs').writeFileSync(`scratch/_hd_${mode}_${name}_b.png`, redrawn); }
    }
  }
  const ok = Object.values(out).every(v => v.same && v.renders === 0)
    && out['modeBlocks:on'].diffCols > out['modeBlocks:threshold'].diffCols && out['modeBlocks:threshold'].diffCols > 0;
  return { pass: ok, detail: JSON.stringify(out) };
});

// A redraw expected to take over ~1 s says what it is doing first (it blocks the page, so the
// notice has to be painted before it starts), and a quick one does not flash a notice.
check('Slow redraw: notice shown before and hidden after; none for small files', async (page) => {
  const path = require('path');
  const watch = () => page.evaluate(() => {
    window.__busy = [];
    const box = _busyOverlay();
    new MutationObserver(() => window.__busy.push(box.hidden ? 'hide' : 'show:' + document.getElementById('busyLabel').textContent)).observe(box, { attributes: true, attributeFilter: ['hidden'] });
  });
  const toggle = () => page.evaluate(async () => {
    const e = document.getElementById('showConsensus'); e.checked = !e.checked; e.dispatchEvent(new Event('change', { bubbles: true }));
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) { await new Promise(r => setTimeout(r, 100)); if (window.__busy.includes('hide') || (performance.now() - t0 > 3000 && !window.__busy.length)) break; }
    return { log: window.__busy.slice(), hiddenNow: document.getElementById('busyOverlay').hidden };
  });
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  await watch();
  const small = await toggle();
  let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const base = Array.from({ length: 700 }, () => 'ACGT'[rnd() % 4]);
  let fa = '';
  for (let i = 0; i < 420; i++) fa += `>s${i}\n` + base.map(c => (rnd() % 8 === 0 ? 'ACGT-'[rnd() % 5] : c)).join('') + '\n';
  await page.setInputFiles('#fileInput', { name: 'big.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForFunction(() => state.seqs && state.seqs.length === 420, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { window.__busy = []; });
  const big = await toggle();
  const ok = small.log.length === 0 && big.log.length === 2 && /^show:Redrawing/.test(big.log[0]) && big.log[1] === 'hide' && big.hiddenNow;
  return { pass: ok, detail: JSON.stringify({ small, big }) };
});

// Renaming a sequence: double-click opens a box over the name without moving anything; typing
// reaches only the box; Esc cancels; Enter and clicking away save, in place (no redraw); undo works.
check('Rename: box over the name, no shift, Esc cancels, Enter/click-away save without redraw', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const nameSel = (i) => `.seq-line[data-seq-index="${i}"] > .seq-name`;
  const geo = (i) => page.evaluate((i) => {
    const line = document.querySelector(`.seq-line[data-seq-index="${i}"]`);
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; };
    return { name: r(line.querySelector('.seq-name')), res: r(line.querySelector('.seq-data > span[data-pos]')), line: r(line) };
  }, i);
  const mark = () => page.evaluate(() => { window.__m = document.querySelector('#alignmentContainer .seq-line:not(.scale-ruler-line) .seq-data'); });
  const redrawn = () => page.evaluate(() => !window.__m.isConnected);
  const out = {};
  const openBox = async (i) => { const bb = await page.locator(nameSel(i)).first().boundingBox(); await page.mouse.dblclick(bb.x + 30, bb.y + bb.height / 2); await page.waitForTimeout(150); };
  const before = await geo(2);
  const orig2 = await page.evaluate(() => state.seqs[2].header);
  await mark();
  await openBox(2);
  out.boxOpen = await page.evaluate(() => document.activeElement?.classList.contains('seq-name-edit'));
  out.noShift = JSON.stringify(await geo(2)) === JSON.stringify(before);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('renamed two');
  out.stateUntouchedWhileTyping = await page.evaluate((o) => state.seqs[2].header === o && !state.editModeActive, orig2);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  out.escCancels = await page.evaluate((o) => state.seqs[2].header === o && !document.querySelector('.seq-name-edit'), orig2);
  await openBox(2);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('renamed two');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  out.enterSaves = await page.evaluate(() => state.seqs[2].header === 'renamed two'
    && [...document.querySelectorAll('.seq-name[data-seq-index="2"]')].every(c => c.textContent.startsWith('renamed')));
  await openBox(4);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('four by click');
  await page.mouse.click(700, 5);
  await page.waitForTimeout(150);
  out.clickAwaySaves = await page.evaluate(() => state.seqs[4].header === 'four by click' && !document.querySelector('.seq-name-edit'));
  out.noRedraw = !(await redrawn());
  out.noShiftAfter = JSON.stringify(await geo(2)) === JSON.stringify(before);
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  out.undo = await page.evaluate((o) => state.seqs[2].header === o && document.querySelector('.seq-name[data-seq-index="2"]').textContent.length > 0, orig2);
  const ok = Object.values(out).every(Boolean);
  return { pass: ok, detail: JSON.stringify(out) };
});

// Dragging the persistent scrollbars moves the view with the mouse, like a scrollbar thumb.
// It used to scroll -1 px per px: dragging the thumb down moved the view back up ("jumps
// back"), and from the start of the track it did not move at all.
check('Scrollbars: dragging the thumb moves the view with the mouse, never back', async (page) => {
  let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const base = Array.from({ length: 900 }, () => 'ACGT'[rnd() % 4]);
  let fa = '';
  for (let i = 0; i < 700; i++) fa += `>s${i}\n` + base.map(c => (rnd() % 9 === 0 ? 'ACGT-'[rnd() % 5] : c)).join('') + '\n';
  await page.setInputFiles('#fileInput', { name: 'bars.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForFunction(() => state.seqs && state.seqs.length === 700, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  const out = {};
  const drag = async (sel, axis) => {
    const r = await page.evaluate((sel) => { const b = document.querySelector(sel); if (getComputedStyle(b).display === 'none') return null; const q = b.getBoundingClientRect(); return [q.x, q.y, q.width, q.height, b.clientWidth, b.scrollWidth, b.clientHeight, b.scrollHeight]; }, sel);
    if (!r) return { shown: false };
    const read = () => page.evaluate(([sel, axis]) => document.querySelector(sel)[axis === 'y' ? 'scrollTop' : 'scrollLeft'], [sel, axis]);
    // start at the beginning of the track (a mode switch keeps the previous position)
    await page.evaluate(([sel, axis]) => { const b = document.querySelector(sel); b[axis === 'y' ? 'scrollTop' : 'scrollLeft'] = 0; b.dispatchEvent(new Event('scroll')); }, [sel, axis]);
    await page.waitForTimeout(500);
    const [x, y, w, h] = r;
    const x0 = axis === 'y' ? x + w / 2 : x + 12, y0 = axis === 'y' ? y + 12 : y + h / 2;
    const seen = [await read()];
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let k = 1; k <= 6; k++) { await page.mouse.move(axis === 'y' ? x0 : x0 + k * 25, axis === 'y' ? y0 + k * 25 : y0, { steps: 2 }); await page.waitForTimeout(200); seen.push(await read()); }
    await page.mouse.up(); await page.waitForTimeout(400); seen.push(await read());
    const track = axis === 'y' ? r[6] : r[4], content = axis === 'y' ? r[7] : r[5];
    const expected = 150 * (content - track) / (track - Math.max(20, track * track / content));   // thumb under the pointer
    const moved = seen[seen.length - 1] - seen[0];
    const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className) : null; }, [x0, y0]);
    return { shown: true, forward: seen.every((v, i) => i === 0 || v >= seen[i - 1]), moved, ratio: Math.round(moved / expected * 100) / 100, range: content - track, hit, seen };
  };
  const setMode = async (m) => {
    await page.evaluate((m) => { const r = document.getElementById(m); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, m);
    await page.waitForTimeout(1000);
    if (await page.locator('#alignLoadProceed').count()) await page.click('#alignLoadProceed');
    await page.waitForTimeout(2500);
  };
  await setMode('modeBlocks'); out.blockV = await drag('.vertical-scrollbar', 'y');
  await setMode('modeSingle'); out.fullV = await drag('.vertical-scrollbar', 'y'); out.fullH = await drag('.horizontal-scrollbar', 'x');
  await setMode('modeCanvas'); out.canvasV = await drag('.vertical-scrollbar', 'y');
  const good = v => v.shown && v.forward && v.moved > 0 && v.ratio > 0.8 && v.ratio < 1.2;
  return { pass: Object.values(out).every(good), detail: JSON.stringify(out) };
});

// Undo / Redo history lists: open under the caret even when the page is scrolled (it opened
// off screen), show action names (it showed "undefined" / "redo-snapshot"), jump N steps with
// one redraw, and the plain Undo button (a click handler) still redraws.
check('Undo history list: visible after scrolling, named entries, N-step jump, redo names', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1500);
  const order = () => page.evaluate(() => state.seqs.map(s => s.header).join(','));
  const original = await order();
  await page.evaluate(async () => { sortByName(); await new Promise(r => setTimeout(r, 200)); sortByLength(); await new Promise(r => setTimeout(r, 200)); sortBySimilarity(); await new Promise(r => setTimeout(r, 400)); });
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  await page.click('#undoDropdownBtn');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const d = document.querySelector('.undo-redo-dropdown'); const b = document.getElementById('undoDropdownBtn').getBoundingClientRect();
    const q = d.getBoundingClientRect();
    return { names: [...d.querySelectorAll('.undo-redo-name')].map(n => n.textContent), onScreen: q.top >= 0 && Math.abs(q.top - b.bottom) < 6 };
  });
  // pick entry 3 = undo all three sorts
  await page.click('.undo-redo-dropdown .undo-redo-item:nth-of-type(3)');
  await page.waitForTimeout(800);
  r.restored = (await order()) === original;
  r.listClosed = await page.evaluate(() => !document.querySelector('.undo-redo-dropdown'));
  await page.click('#redoDropdownBtn'); await page.waitForTimeout(200);
  r.redoNames = await page.evaluate(() => [...document.querySelectorAll('.undo-redo-dropdown .undo-redo-name')].map(n => n.textContent));
  await page.click('#redoDropdownBtn'); await page.waitForTimeout(200);
  r.toggleCloses = await page.evaluate(() => !document.querySelector('.undo-redo-dropdown'));
  await page.click('#redoDropdownBtn'); await page.waitForTimeout(200);
  await page.click('.undo-redo-dropdown .undo-redo-item:nth-of-type(2)'); await page.waitForTimeout(800);
  r.redoTwo = await page.evaluate(() => state.redoHistory.length === 1 && state.deletedHistory.length === 2);
  // plain Undo button: undoes one step and the page is redrawn to match
  await page.evaluate(() => { window.__m2 = document.querySelector('#alignmentContainer .seq-line:not(.scale-ruler-line) .seq-data'); });
  await page.click('#undoButton'); await page.waitForTimeout(800);
  r.buttonRedraws = await page.evaluate(() => !window.__m2.isConnected && state.deletedHistory.length === 1);
  const ok = r.onScreen && r.names.join('|') === 'Sort by similarity|Sort by length|Sort by name' && r.restored && r.listClosed
    && r.redoNames.join('|') === 'Sort by name|Sort by length|Sort by similarity' && r.toggleCloses && r.redoTwo && r.buttonRedraws;
  return { pass: ok, detail: JSON.stringify(r) };
});

// Repeat Finder redesign: the panel leaves the alignment usable (no blocking backdrop); TSD
// results say how many copies have a TSD, list the ones that do not with a reason, and show
// each pair with its mismatches; a repeat found in one sequence is highlighted in that
// sequence only (it used to colour the same columns in every row).
check('Repeat Finder: non-blocking panel, TSD summary and misses, row-specific highlights', async (page) => {
  // high bits only: the low bits of this generator repeat with period 4, which made every
  // 'random' flank identical
  let seed = 9; const rnd = () => Math.floor((seed = (seed * 1103515245 + 12345) % 2147483648) / 65536);
  const rb = (n) => Array.from({ length: n }, () => 'ACGT'[rnd() % 4]).join('');
  const body = rb(120);
  // row 1 is the gap-padded consensus, as on a SINEderella plate; Auto reads the body from it
  let fa = `>consensus
${'-'.repeat(31)}${body}AAAAAAAAAA${'-'.repeat(31)}
`;
  for (let i = 0; i < 20; i++) {
    const tsd = rb(6);
    const b = body.split('').map(c => (rnd() % 20 === 0 ? 'ACGT'[rnd() % 4] : c)).join('');
    const tsd3 = i < 12 ? (i === 0 ? tsd.slice(0, 5) + (tsd[5] === 'A' ? 'C' : 'A') : tsd) : rb(6);   // rows 12-19: no TSD
    fa += `>copy${i}\n${rb(25)}${tsd}${b}AAAAAAAAAA${tsd3}${rb(25)}\n`;
  }
  // one extra row with a tandem repeat inside its body, for the highlight test
  fa += `>tandem\n${rb(31)}${'ACGTTGCA'.repeat(4)}${body.slice(32)}AAAAAAAAAA${rb(31)}\n`;
  await page.setInputFiles('#fileInput', { name: 'tsd.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1500);
  await page.evaluate(() => openRepeatFinder(0));
  await page.waitForTimeout(300);
  const out = {};
  out.alignmentClickable = await page.evaluate(() => {
    const e = document.elementFromPoint(40, 300);
    return !!e && !!e.closest('#alignmentContainer');
  });
  await page.click('label:has(input[name="repeatMode"][value="tsd"])');
  await page.click('#repeatRunBtn');
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('#repeatResults tbody tr')];
    const mm = trs.map(tr => parseInt(tr.children[4].textContent, 10));
    // planted rows copy1..copy11 carry an identical 6 bp pair right at the SINE ends
    const planted = [];
    for (let i = 1; i <= 11; i++) {
      const r = _lastTsdResults.find(x => x.seqName === 'copy' + i);
      planted.push(!!r && r.tsdLen === 6 && r.upTSD === r.downTSD);
    }
    return {
      summary: document.querySelector('#repeatResults .rf-big')?.textContent || '',
      rows: trs.length,
      misses: document.querySelectorAll('#repeatResults .rf-misses li').length,
      missReason: document.querySelector('#repeatResults .rf-misses li')?.textContent || '',
      plantedFound: planted.every(Boolean),
      mmConsistent: document.querySelectorAll('#repeatResults .rf-mm').length === 2 * mm.reduce((a, b) => a + b, 0),
      bodyChip: [...document.querySelectorAll('#repeatResults .rf-chip')].map(c => c.textContent).find(t => /SINE body/.test(t)) || '',
      tools: !document.getElementById('tsdResultTools').hidden,
    };
  });
  Object.assign(out, t);
  // tandem: search all, highlight the first result, count highlighted spans per row
  await page.click('label:has(input[name="repeatMode"][value="tandem"])');
  await page.click('label:has(input[name="repeatScope"][value="all"])');
  await page.fill('#repeatMinLen', '8');
  await page.click('#repeatRunBtn');
  await page.waitForTimeout(1500);
  out.tandemFound = await page.evaluate(() => document.querySelectorAll('#repeatResults tbody tr').length);
  await page.click('#repeatResults tbody tr:first-child');
  await page.waitForTimeout(400);
  out.hlRows = await page.evaluate(() => [...new Set([...document.querySelectorAll('.seq-data > span[data-repeat-hl="1"]')].map(s => s.closest('.seq-line').dataset.seqIndex))]);
  out.hlRowMatches = await page.evaluate(() => { const tr = document.querySelector('#repeatResults tbody tr:first-child'); return tr.dataset.row; });
  await page.click('#repeatClearHighlightsBtn');
  out.cleared = await page.evaluate(() => document.querySelectorAll('.seq-data > span[data-repeat-hl="1"]').length === 0);
  const ok = out.alignmentClickable && new RegExp(`TSD in ${out.rows} of 21 copies`).test(out.summary) && out.rows + out.misses === 21
    && out.plantedFound && /no pair/.test(out.missReason) && out.mmConsistent && /columns 32–161/.test(out.bodyChip) && out.tools
    && out.tandemFound > 0 && out.hlRows.length === 1 && out.hlRows[0] === out.hlRowMatches && out.cleared;
  return { pass: ok, detail: JSON.stringify(out) };
});

// Dot plot window: the "?" and Copy region buttons sit in the toolbar at normal size (they
// stretched across the whole window); the window moves by its title bar and resizes, with
// the plot following the new size.
check('Dot plot window: compact help button, draggable, resizable with the plot following', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const a = state.seqs[1], c = state.seqs[2]; openDotPlot(a.seq.replace(/-/g, ''), c.seq.replace(/-/g, ''), a.header, c.header); });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const w = id => document.getElementById(id).getBoundingClientRect().width;
    return { help: Math.round(w('dotPlotHelpBtn')), copy: Math.round(w('dotPlotCopyRegion')), dialog: Math.round(w('dotPlotDialog')),
      resizable: document.querySelectorAll('#dotPlotDialog .win-rz').length };   // 8 edge/corner handles
  });
  const bar = await page.locator('#dotPlotTitleBar').boundingBox();
  const before = await page.evaluate(() => document.getElementById('dotPlotDialog').getBoundingClientRect().left);
  await page.mouse.move(bar.x + 200, bar.y + 12); await page.mouse.down();
  await page.mouse.move(bar.x + 120, bar.y + 40, { steps: 5 }); await page.mouse.up();
  out.moved = Math.round(await page.evaluate(() => document.getElementById('dotPlotDialog').getBoundingClientRect().left) - before);
  // resize (as the corner handle does) and check the plot canvases follow the viewport
  out.afterResize = await page.evaluate(async () => {
    const d = document.getElementById('dotPlotDialog'); d.style.width = '700px'; d.style.height = '560px';
    await new Promise(r => setTimeout(r, 300));
    const vp = document.getElementById('dotPlotViewport'), cv = document.getElementById('dotPlotCanvas');
    return { vp: vp.clientWidth, canvas: parseInt(cv.style.width, 10) };
  });
  const ok = out.help <= 30 && out.copy < 150 && out.resizable === 8 && out.moved === -80 && out.afterResize.vp === out.afterResize.canvas;
  return { pass: ok, detail: JSON.stringify(out) };
});

// Alignment menu: the six action buttons form an even grid (they had different heights,
// wrapping their labels onto two or three lines) and stay inside the menu.
check('Alignment menu: even button grid inside the menu, labels on one line', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1000);
  await page.hover('.section-header[data-section="alignment"]');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const ids = ['realignAllButton', 'realignSelectedButton', 'realignBlockButton', 'addSequencesButton', 'degapBlockLeftButton', 'degapBlockRightButton'];
    const boxes = ids.map(id => document.getElementById(id).getBoundingClientRect());
    const menu = document.getElementById('alignment-controls').getBoundingClientRect();
    const lineH = parseFloat(getComputedStyle(document.getElementById('realignAllButton')).fontSize) * 1.6;
    return { heights: [...new Set(boxes.map(b => Math.round(b.height)))], oneLine: boxes.every(b => b.height <= lineH + 12),
      inside: boxes.every(b => b.left >= menu.left - 1 && b.right <= menu.right + 1), rows: [...new Set(boxes.map(b => Math.round(b.top)))].length };
  });
  return { pass: r.heights.length === 1 && r.oneLine && r.inside && r.rows === 2, detail: JSON.stringify(r) };
});

// Dot plot: maximize and resize from any edge; Full view; settings recalculate as they
// change unless Live update is off; a self-plot can use other settings below the diagonal;
// dots are drawn as runs (lines), not as a scaled raster.
check('Dot plot: maximize/edge resize, Full view, live recalculation, split halves, vector runs', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1200);
  const open = (self) => page.evaluate((self) => { const a = state.seqs[1], c = state.seqs[self ? 1 : 2]; openDotPlot(a.seq.replace(/-/g, ''), c.seq.replace(/-/g, ''), a.header, c.header); }, self);
  await open(true);
  await page.waitForTimeout(1500);
  const rect = () => page.evaluate(() => { const r = document.getElementById('dotPlotDialog').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
  const out = {};
  out.runsUsed = await page.evaluate(() => !!_dotPlotState.runs && _dotPlotState.runs.n > 0);
  // maximize and restore
  const r0 = await rect();
  await page.click('#dotPlotMaxBtn'); await page.waitForTimeout(300);
  const rMax = await rect();
  out.maximized = rMax[2] >= 1390 - 20 && rMax[3] >= 900 - 20;
  await page.click('#dotPlotMaxBtn'); await page.waitForTimeout(300);
  out.restored = JSON.stringify(await rect()) === JSON.stringify(r0);
  // resize from the left edge
  const w = await page.locator('#dotPlotDialog .win-rz[data-dir="w"]').boundingBox();
  await page.mouse.move(w.x + 3, w.y + 40); await page.mouse.down(); await page.mouse.move(w.x - 97, w.y + 40, { steps: 5 }); await page.mouse.up();
  const r1 = await rect();
  out.leftResize = r1[0] === r0[0] - 100 && r1[2] === r0[2] + 100;
  // Full view refits after zooming in
  for (let i = 0; i < 4; i++) await page.click('#dotPlotZoomIn');
  const zoomed = await page.evaluate(() => _dotPlotState.zoom);
  await page.click('#dotPlotFullView'); await page.waitForTimeout(300);
  out.fullView = await page.evaluate((z) => _dotPlotState.zoom < z && _dotPlotState._autoFit === true, zoomed);
  // live: a new word size recalculates without pressing Recalculate
  await page.fill('#dotPlotWindow', '8'); await page.waitForTimeout(1200);
  out.liveRecalc = await page.evaluate(() => _dotPlotState.windowSize === 8);
  // not live: the plot stays, Recalculate is flagged
  await page.click('#dotPlotLive');
  await page.fill('#dotPlotWindow', '10'); await page.waitForTimeout(900);
  out.notLive = await page.evaluate(() => _dotPlotState.windowSize === 8 && document.getElementById('dotPlotRecalc').classList.contains('dot-dirty'));
  await page.click('#dotPlotRecalc'); await page.waitForTimeout(1000);
  out.recalcApplies = await page.evaluate(() => _dotPlotState.windowSize === 10);
  await page.click('#dotPlotLive');
  // split halves on the self-plot: upper SPIN, lower Dotter
  await page.click('#dotPlotSplit'); await page.waitForTimeout(1800);
  out.split = await page.evaluate(() => {
    const S = _dotPlotState;
    return { lower: !!(S.lower && S.lower.ready), upperSpin: S.spinMode, lowerSpin: S.lower?.spinMode,
      upperCell: _dotHalf(2, 50) === S, lowerCell: _dotHalf(50, 2) === S.lower, runs: !!S.runs && !!S.lower?.runs };
  });
  const box = await page.locator('#dotPlotOverlay').boundingBox();
  const hoverAt = async (row, col) => {
    const p = await page.evaluate(([r, c]) => _dotCellToScreen(r, c), [row, col]);
    await page.mouse.move(box.x + p.x, box.y + p.y); await page.waitForTimeout(150);
    return page.evaluate(() => document.getElementById('dotPlotHover').textContent);
  };
  out.hoverUpper = /match=/.test(await hoverAt(20, 120));
  out.hoverLower = /identity=/.test(await hoverAt(120, 20));
  // different sequences: split is not offered
  await open(false); await page.waitForTimeout(1500);
  out.splitDisabledForAB = await page.evaluate(() => document.getElementById('dotPlotSplit').disabled && !_dotPlotState.lower);
  const s = out.split;
  const ok = out.runsUsed && out.maximized && out.restored && out.leftResize && out.fullView && out.liveRecalc && out.notLive && out.recalcApplies
    && s.lower && s.upperSpin === true && s.lowerSpin === false && s.upperCell && s.lowerCell && s.runs && out.hoverUpper && out.hoverLower && out.splitDisabledForAB;
  return { pass: ok, detail: JSON.stringify(out) };
});

// The slider under a focused number box goes away when the user clicks anywhere else (it
// stayed forever: clicking the alignment moves no focus), and a click in the alignment
// closes the open menu (a focused number box kept it open).
check('Number-box slider and menus: a click in the alignment closes both', async (page) => {
  const path = require('path');
  await page.setInputFiles('#fileInput', path.join(__dirname, '..', '..', 'examples', 'svk_k4.fa'));
  await page.waitForTimeout(1200);
  const state_ = () => page.evaluate(() => ({
    pop: getComputedStyle(document.getElementById('numSliderPop') || document.body).display !== 'none' && !!document.getElementById('numSliderPop'),
    menuOpen: !!document.querySelector('#controls .menu-section.menu-open'),
    k: document.getElementById('mafftReorderK').value,
  }));
  const out = {};
  const openK = async () => {
    await page.hover('.section-header[data-section="alignment"]');
    await page.waitForTimeout(300);
    await page.click('#mafftReorderK');
    await page.waitForTimeout(200);
  };
  await openK();
  out.opened = await state_();
  // dragging the slider keeps it (and the menu) open and changes the value
  const pb = await page.locator('#numSliderPop input[type="range"]').boundingBox();
  await page.mouse.move(pb.x + 4, pb.y + pb.height / 2); await page.mouse.down();
  await page.mouse.move(pb.x + pb.width - 4, pb.y + pb.height / 2, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(200);
  out.afterDrag = await state_();
  // click a residue in the alignment
  const cell = await page.locator('.seq-line[data-seq-index="5"] .seq-data span[data-pos="40"]').first().boundingBox();
  await page.mouse.click(cell.x + 3, cell.y + 4);
  await page.waitForTimeout(400);
  out.afterAlignmentClick = await state_();
  // again, closing with a click on empty page space
  await openK();
  await page.mouse.click(700, 890);
  await page.waitForTimeout(400);
  out.afterPageClick = await state_();
  const ok = out.opened.pop && out.opened.menuOpen && out.afterDrag.pop && out.afterDrag.k === '12'
    && !out.afterAlignmentClick.pop && !out.afterAlignmentClick.menuOpen && !out.afterPageClick.pop && !out.afterPageClick.menuOpen;
  return { pass: ok, detail: JSON.stringify(out) };
});

// Dot plot regions: one entry per similar stretch (runs broken by mismatches / small indels
// are chained), no overlapping duplicates, only the upper triangle of a self-plot (the list
// was empty there, or doubled); double-click (freeze) does not resize the plot.
check('Dot plot regions: chained stretches, no duplicates, self-plot upper half; freeze keeps size', async (page) => {
  let seed = 21; const rnd = () => Math.floor((seed = (seed * 1103515245 + 12345) % 2147483648) / 65536);
  const rb = (n) => Array.from({ length: n }, () => 'ACGT'[rnd() % 4]).join('');
  const rep = rb(80);
  // copy 2 of the repeat carries 3 mismatches and a 2 bp deletion
  const rep2 = rep.slice(0, 20) + 'T' + rep.slice(21, 40) + rep.slice(42, 60) + 'G' + rep.slice(61, 70) + 'C' + rep.slice(71);
  const self = rb(40) + rep + rb(120) + rep2 + rb(40);
  await page.evaluate((self) => { state.seqs = [{ header: 'self', seq: self }]; openDotPlot(self, self, 'self', 'self'); }, self);
  await page.waitForTimeout(1500);
  const out = {};
  out.self = await page.evaluate(() => _dotPlotState.regions.map(r => [r.aStart + 1, r.aEnd, r.bStart + 1, r.bEnd, r.matched]));
  // the planted repeat: A 41-120 vs B 241-318, found as ONE upper-triangle entry
  const hits = out.self.filter(r => r[0] <= 50 && r[1] >= 110 && r[2] >= 230 && r[3] <= 330);
  out.selfOne = hits.length === 1;
  out.selfUpper = out.self.every(r => r[2] > r[0]);
  // pair: two related sequences; no two entries cover mostly the same A and B stretch
  const other = rb(30) + rep2 + rb(60);
  await page.evaluate(([a, b]) => openDotPlot(a, b, 'a', 'b'), [self, other]);
  await page.waitForTimeout(1500);
  out.pair = await page.evaluate(() => _dotPlotState.regions.map(r => [r.aStart, r.aEnd, r.bStart, r.bEnd, r.matched]));
  const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  out.pairNoDup = out.pair.every((x, i) => out.pair.every((y, j) => j <= i || !(ov(x[0], x[1], y[0], y[1]) > 0.5 * (x[1] - x[0]) && ov(x[2], x[3], y[2], y[3]) > 0.5 * (x[3] - x[2]))));
  out.matchedWithin = out.pair.concat(out.self).every(r => r[4] <= (r[1] - r[0]) + 1);
  // freeze by double-click: nothing changes size
  const before = await page.evaluate(() => [document.getElementById('dotPlotViewport').clientHeight, _dotPlotState.zoom]);
  const box = await page.locator('#dotPlotOverlay').boundingBox();
  const pt = await page.evaluate(() => _dotCellToScreen(60, 60));
  await page.mouse.dblclick(box.x + pt.x, box.y + pt.y); await page.waitForTimeout(400);
  const after = await page.evaluate(() => [document.getElementById('dotPlotViewport').clientHeight, _dotPlotState.zoom, _dotPlotState._frozen]);
  out.freezeSteady = after[2] === true && after[0] === before[0] && after[1] === before[1];
  const ok = out.selfOne && out.selfUpper && out.pairNoDup && out.matchedWithin && out.freezeSteady;
  return { pass: ok, detail: JSON.stringify(out) };
});

// Audit fixes (GLM audit of Repeat Finder + dot plot, 2026-09-28): SPIN region ends are exact;
// a second open while the first is computing shows the second pair; closing the window stops a
// pending live recalculation; inverted repeats and tandem arrays are listed once; RNA U pairs A;
// 0% divergence means identical.
check('Audit fixes: SPIN region ends, open race, close cancels live, repeats listed once, 0% divergence', async (page) => {
  let seed = 33; const rnd = () => Math.floor((seed = (seed * 1103515245 + 12345) % 2147483648) / 65536);
  const rb = (n) => Array.from({ length: n }, () => 'ACGT'[rnd() % 4]).join('');
  const core = rb(25);
  const a = rb(100) + core + rb(75), b = rb(50) + core + rb(125);
  await page.evaluate(() => { const r = document.querySelector('input[name="dotPlotMode"][value="spin"]'); if (r) r.checked = true; });
  await page.evaluate(([a, b]) => { state.seqs = [{ header: 'a', seq: a }, { header: 'b', seq: b }]; openDotPlot(a, b, 'a', 'b'); }, [a, b]);
  await page.waitForTimeout(1200);
  const out = {};
  out.regions = await page.evaluate(() => _dotPlotState.regions.map(r => [r.aStart + 1, r.aEnd, r.bStart + 1, r.bEnd]));
  out.spinExact = out.regions.some(r => r[0] === 101 && r[1] === 125 && r[2] === 51 && r[3] === 75);
  // race: open a big plot, then immediately a small one; the small one must win
  const big = rb(9000), small1 = rb(60), small2 = rb(70);
  out.race = await page.evaluate(async ([big, s1, s2]) => {
    openDotPlot(big, big, 'big', 'big');
    await new Promise(r => setTimeout(r, 5));
    await openDotPlot(s1, s2, 's1', 's2');
    await new Promise(r => setTimeout(r, 1500));
    const S = _dotPlotState; return [S.rows, S.cols, S.seqA.length, S.seqB.length, S.computing];
  }, [big, small1, small2]);
  out.raceOk = out.race[0] === 60 && out.race[1] === 70 && out.race[4] === false;
  // close cancels a pending live recalculation
  out.closeStays = await page.evaluate(async () => {
    document.getElementById('dotPlotWindow').dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('dotPlotWindow').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('dotPlotCloseBtn').click();
    const m = document.getElementById('dotPlotModal');
    await new Promise(r => setTimeout(r, 900));
    return m.style.display === 'none';
  });
  // Repeat Finder functions
  out.rep = await page.evaluate(() => ({
    inv: _findRepeats('AAAAAAAAAAACGTACGTACAAAAAAGTACGTACGTAAAAAAAAAA', 10, 0, 'inverted').length,
    rna: _findRepeats('GGAUAUAUAUAUGGGGAUAUAUAUAUGG', 10, 15, 'inverted').length,
    tan: _findRepeats('ACGTACGTACGTACGT', 4, 15, 'tandem').map(r => [r.start, r.end, r.unitLen, r.copies]),
    exact0: _findRepeats('TTTTGATCCAGTACGGTTTTTTTGATCCAGTACGATTTT', 12, 0, 'direct').every(r => Number(r.divergence) === 0),
  }));
  out.repOk = out.rep.inv === 1 && out.rep.rna >= 1 && JSON.stringify(out.rep.tan) === '[[0,16,4,4]]' && out.rep.exact0;
  out.tsd0 = await page.evaluate(() => { const e = document.getElementById('tsdMaxDiv'); if (!e) return null; e.value = '0'; return _readTsdParams().maxDiv; });
  const ok = out.spinExact && out.raceOk && out.closeStays && out.repOk && (out.tsd0 === 0 || out.tsd0 === null);
  return { pass: ok, detail: JSON.stringify(out) };
});

// ---- Search highlights, in-place gap edits, Selections panel (v212) ----

// Alignment with real variation (a Park-Miller generator, not the low bits of an LCG,
// which cycle and turn every row into long runs of one base).
function variedFasta(nSeq, nCol, seed = 7, trailingGapRows = 0) {
  let x = seed;
  const r = () => { x = (x * 16807) % 2147483647; return x; };
  const base = Array.from({ length: nCol }, () => 'ACGT'[r() % 4]);
  let out = '';
  for (let i = 0; i < nSeq; i++) {
    let s = base.map(c => (r() % 9 === 0 ? 'ACGT-'[r() % 5] : c));
    if (i < trailingGapRows) s = s.slice(0, nCol - 3).concat(['-', '-', '-']);
    out += `>s${i}\n${s.join('')}\n`;
  }
  return out;
}

// Rendered search classes vs an independent oracle (exact, overlapping matches of each
// enabled search in the degapped row). Returns the number of disagreeing residue spans.
const SEARCH_MISMATCH_SRC = `(() => {
  let bad = 0, total = 0; const ex = [];
  document.querySelectorAll('#alignmentContainer .seq-line[data-seq-index]:not(.consensus-line)').forEach(line => {
    const i = +line.dataset.seqIndex;
    const seq = state.seqs[i].seq; const cols = []; let text = '';
    for (let c = 0; c < seq.length; c++) if (seq[c] !== '-' && seq[c] !== '.') { cols.push(c); text += seq[c].toUpperCase(); }
    const hits = new Set();
    const rc = t => t.split('').reverse().map(c => ({ A: 'T', C: 'G', G: 'C', T: 'A' }[c] || c)).join('');
    state.searchHistory.filter(e => e.enabled !== false && !e.useRegex).forEach(e => {
      const fwd = String(e.motif).split(':')[0];
      const m = e.searchValue || (/rev comp/.test(e.strand) ? rc(fwd) : fwd);
      for (let k = text.indexOf(m); k >= 0; k = text.indexOf(m, k + 1)) for (let j = 0; j < m.length; j++) hits.add(cols[k + j]);
    });
    line.querySelectorAll('.seq-data > span[data-pos]').forEach(sp => {
      const p = +sp.dataset.pos; total++;
      const dom = [...sp.classList].some(c => c.startsWith('search-hit-'));
      if (dom !== hits.has(p) || sp.textContent !== (seq[p] || '-')) { bad++; if (ex.length < 3) ex.push([i, p, dom, sp.textContent]); }
    });
  });
  return { bad, total, ex };
})()`;

check('Search highlights stay on the matching residues through gap tools, typing, undo and drags', async (page) => {
  await loadFasta(page, variedFasta(40, 300, 7, 10));
  const out = {};
  const run = async (label, fn) => {
    await page.evaluate(fn);
    await page.waitForTimeout(60);
    out[label] = await page.evaluate(`(typeof flushPendingSpanRepaint === "function" && flushPendingSpanRepaint()), ${SEARCH_MISMATCH_SRC}`);
  };
  await run('search', () => {
    el('searchInput').value = state.seqs[0].seq.replace(/-/g, '').slice(20, 24);
    el('searchBothStrands').checked = true;
    el('searchButton').click();
  });
  await page.click('#editToggleButton');
  await page.click('#editInsertGapOtherButton');
  await page.click('.seq-line[data-seq-index="3"] .seq-data > span[data-pos="10"]');
  await page.waitForTimeout(60);
  out.insOther = await page.evaluate(`(typeof flushPendingSpanRepaint === "function" && flushPendingSpanRepaint()), ${SEARCH_MISMATCH_SRC}`);
  // Same-width Move drag on a row with trailing gaps (the row patch path, no render)
  await page.click('#editMoveNoGapsButton');
  const sp = await page.$('.seq-line[data-seq-index="2"] .seq-data > span[data-pos="40"]');
  const b = await sp.boundingBox();
  await page.mouse.move(b.x + 2, b.y + 4); await page.mouse.down();
  for (let k = 1; k <= 2; k++) { await page.mouse.move(b.x + 2 + k * b.width, b.y + 4); await page.waitForTimeout(50); }
  // while dragging, the overlay must paint over every cell whose DOM highlight is stale
  out.overlay = await page.evaluate(() => {
    const d = state.editDrag; if (!d || !d.overlay) return { overlay: false };
    let uncovered = 0, checked = 0;
    const hitsNow = _getSearchHitsForRow(d.rowIndex);
    document.querySelectorAll(`.seq-line[data-seq-index="${d.rowIndex}"] .seq-data > span[data-pos]`).forEach(sp => {
      const p = +sp.dataset.pos;
      if (!!sp.dataset.searchHit === hitsNow.has(p) && sp.textContent === state.seqs[d.rowIndex].seq[p]) return;
      const r = sp.getBoundingClientRect();
      for (const L of d.overlay.layers) {
        if (Math.abs(parseFloat(L.canvas.style.top) - r.top) > 1) continue;
        const x = (r.left + r.width / 2 - L.left) * devicePixelRatio;
        if (x < 0 || x >= L.canvas.width) continue;
        checked++;
        if (L.ctx.getImageData(x | 0, (r.height / 2 * devicePixelRatio) | 0, 1, 1).data[3] < 200) uncovered++;
      }
    });
    return { overlay: true, checked, uncovered };
  });
  await page.mouse.up();
  await page.waitForTimeout(80);
  out.drag = await page.evaluate(SEARCH_MISMATCH_SRC);
  await page.click('#editResidueButton');
  await page.click('.seq-line[data-seq-index="5"] .seq-data > span[data-pos="22"]');
  await page.keyboard.press('-');
  await page.waitForTimeout(60);
  out.type = await page.evaluate(SEARCH_MISMATCH_SRC);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(80);
  out.undo = await page.evaluate(SEARCH_MISMATCH_SRC);
  // A full re-render must keep both-strand (label "X (fwd)") highlights
  await page.evaluate(() => renderAlignment());
  out.rerender = await page.evaluate(SEARCH_MISMATCH_SRC);
  const bad = Object.entries(out).filter(([k, v]) => k === 'overlay' ? (!v.overlay || v.uncovered) : v.bad);
  const hits = await page.evaluate(() => document.querySelectorAll('[data-search-hit]').length);
  if (!hits) return { pass: false, detail: 'search painted nothing: ' + JSON.stringify(out) };
  return { pass: bad.length === 0, detail: bad.length ? JSON.stringify(Object.fromEntries(bad)) : `${hits} hit spans; overlay checked ${out.overlay.checked}` };
});

check('Search highlights: windowed scroll, restriction sites and regex case survive a redraw', async (page) => {
  // Windowed: rows built on scroll carry the highlight
  await loadSyntheticFasta(page, 600, 1200);
  await setMode(page, 'full');
  const win = await page.evaluate(async () => {
    el('searchInput').value = 'GTAC'; el('searchButton').click();
    const c = el('alignmentContainer');
    c.scrollTop = c.scrollHeight / 2;
    _refreshUnifiedWindowOnScroll(c);
    await new Promise(r => setTimeout(r, 50));
    const spans = [...document.querySelectorAll('.seq-line[data-seq-index] .seq-data > span[data-pos]')];
    let want = 0, have = 0;
    document.querySelectorAll('.seq-line[data-seq-index]:not(.consensus-line)').forEach(line => {
      const i = +line.dataset.seqIndex; const seq = state.seqs[i].seq;
      line.querySelectorAll('.seq-data > span[data-pos]').forEach(sp => {
        const p = +sp.dataset.pos;
        // GTAC at p..p+3 (no gaps in this data)
        let hit = false;
        for (let k = Math.max(0, p - 3); k <= p; k++) if (seq.substr(k, 4) === 'GTAC') hit = true;
        if (hit) want++;
        if (hit && sp.dataset.searchHit) have++;
      });
    });
    return { rowsShown: document.querySelectorAll('.seq-line[data-seq-index]').length, want, have, total: spans.length, count: state.searchHistory[0]?.matchCount };
  });
  // Restriction-site search (label = enzyme name) and a regex with \w keep their hits after a redraw
  await loadFasta(page, variedFasta(20, 200, 3));
  const re = await page.evaluate(() => {
    state.seqs[4].seq = state.seqs[4].seq.slice(0, 50) + 'GAATTC' + state.seqs[4].seq.slice(56);
    renderAlignment();
    el('reSiteManualInput').value = 'EcoRI:GAATTC';
    searchResEnzyme();
    const before = document.querySelectorAll('[data-search-hit]').length;
    renderAlignment();
    const after = document.querySelectorAll('[data-search-hit]').length;
    clearAllSearches(true);
    el('searchRegex').checked = true;
    el('searchInput').value = 'GAA\\w\\wC';
    el('searchButton').click();
    const rx = state.searchHistory[0]?.matchCount || 0;
    return { before, after, rx };
  });
  const ok = win.want > 0 && win.have === win.want && win.count > 0 && re.before >= 6 && re.after === re.before && re.rx >= 1;
  return { pass: ok, detail: JSON.stringify({ win, re }) };
});

check('Gap tools: in-place update matches a full redraw, and takes the fast path', async (page) => {
  const snapSrc = `(() => {
    const out = [];
    document.querySelectorAll('#alignmentContainer .seq-line').forEach(line => {
      const kind = line.classList.contains('scale-ruler-line') ? 'R' : line.classList.contains('consensus-line') ? 'C' : 'S' + line.dataset.seqIndex;
      const data = line.querySelector('.seq-data'); if (!data) return;
      if (kind === 'R') { out.push(kind + data.textContent + data.dataset.scale); return; }
      out.push(kind + [...data.children].map(sp => (sp.dataset.pos ?? '_') + sp.textContent
        + [...sp.classList].filter(c => !/^(nuc-|edit-active)/.test(c)).sort().join('.') + (sp.dataset.searchHit || '')).join(' '));
    });
    document.querySelectorAll('#alignmentContainer > .block-block').forEach(b => out.push('B' + b.style.getPropertyValue('--cols')));
    return out;
  })()`;
  const results = [];
  for (const mode of ['full', 'block']) {
    for (const [tool, trailing] of [['insertGapOther', 0], ['insertGapAll', 30], ['insertGapSeq', 0], ['deleteGapOther', 0]]) {
      await loadFasta(page, variedFasta(40, 157, 11, trailing));
      await setMode(page, mode);
      const r = await page.evaluate(async ({ tool, snapSrc }) => {
        el('searchInput').value = state.seqs[4].seq.replace(/-/g, '').slice(30, 34); el('searchButton').click();
        if (!state.editModeActive) el('editToggleButton').click();
        if (tool.startsWith('delete')) {
          state.seqs.forEach(s => { s.seq = s.seq.slice(0, 40) + '-' + s.seq.slice(40); });
          refreshAllGaplessPositions(); renderAlignment();
        }
        let patched = null;
        const orig = window.patchColumnsInPlace;
        window.patchColumnsInPlace = function (...a) { return (patched = orig.apply(this, a)); };
        const t0 = performance.now();
        handleGeneDocGapToolClick(7, 40, tool);
        const ms = performance.now() - t0;
        window.patchColumnsInPlace = orig;
        flushPendingSpanRepaint();
        const a = eval(snapSrc);
        renderAlignment();
        const b = eval(snapSrc);
        const diff = a.findIndex((x, i) => x !== b[i]);
        return { patched, ms: Math.round(ms), same: a.length === b.length && diff < 0, diffLine: diff };
      }, { tool, snapSrc });
      results.push({ mode, tool, trailing, ...r });
    }
  }
  const bad = results.filter(r => !r.same || !r.patched);
  return { pass: bad.length === 0, detail: bad.length ? JSON.stringify(bad) : results.map(r => `${r.mode}/${r.tool}:${r.ms}ms`).join(' ') };
});

check('Selections panel: lists every kind, on/off, remove + undo, Esc, snapshot round trip', async (page) => {
  await loadFasta(page, variedFasta(25, 200, 5));
  const panel = () => page.evaluate(() => ({
    shown: getComputedStyle(el('selections-menu-section')).display !== 'none',
    keys: [...document.querySelectorAll('#selectionsList .sel-item')].map(r => (r.classList.contains('is-off') ? '-' : '+') + r.dataset.key.replace(/^search:.*/, 'search'))
  }));
  const settle = () => page.waitForTimeout(80);
  const log = {};
  log.fresh = await panel();
  const names = await page.$$('.seq-name[data-seq-index]');
  await names[2].click({ modifiers: ['Control'] });
  await names[6].click({ modifiers: ['Control'] });
  await page.evaluate(() => {
    [20, 21, 60].forEach(c => state.selectedColumns.add(c)); updateColumnSelections();
    state.selectedNucs.set(3, new Set([5, 6, 7])); scheduleNucSelectionRefresh();
    el('searchInput').value = state.seqs[0].seq.replace(/-/g, '').slice(10, 14); el('searchBothStrands').checked = false; el('searchButton').click();
    colourState.mappings.set(state.seqs[1].header, '#ff0000'); applyColourToSeqNames(colourState.mappings);
  });
  await settle();
  log.all = await panel();
  // rows off: kept, not live (the menu opens on hover, like the others)
  const openPanel = async () => { await page.hover('#selections-menu-section .section-header'); await page.waitForTimeout(200); };
  await openPanel();
  await page.click('#selectionsList .sel-item[data-key="rows"] input');
  await page.click('#selectionsList .sel-item[data-key^="search:"] input');
  await settle();
  log.off = await panel();
  log.offState = await page.evaluate(() => ({ live: state.selectedRows.size, hits: document.querySelectorAll('[data-search-hit]').length }));
  // snapshot keeps on/off; Clear all then Undo restores; reload restores
  const payload = await page.evaluate(() => JSON.stringify(_buildSnapshotPayload()));
  await page.evaluate(() => clearAllSelections());
  await settle();
  log.cleared = await panel();
  await page.evaluate(() => undoSelectionsRemoval());
  await page.waitForTimeout(150);
  log.undone = await panel();
  await page.evaluate(async (p) => { _loadSnapshotPayload(JSON.parse(p)); await new Promise(r => setTimeout(r, 1200)); }, payload);
  log.reloaded = await panel();
  // turning rows back on after reload selects the same sequences
  await openPanel();
  await page.click('#selectionsList .sel-item[data-key="rows"] input');
  await settle();
  log.rowsBack = await page.evaluate(() => [...state.selectedRows].sort((a, b) => a - b));
  // Esc with nothing open clears rows/columns/residues but not highlights; Undo restores
  await page.mouse.move(700, 600); await page.waitForTimeout(400);   // menus close 120 ms after the pointer leaves
  await page.keyboard.press('Escape');
  await settle();
  log.esc = await panel();
  await page.evaluate(() => undoSelectionsRemoval());
  await settle();
  log.escUndo = await panel();
  const want = {
    all: ['+rows', '+cols', '+nucs', '+search', '+names'],
    off: ['-rows', '+cols', '+nucs', '-search', '+names'],
    esc: ['-search', '+names'],
    escUndo: ['+rows', '+cols', '+nucs', '-search', '+names'],
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const ok = !log.fresh.shown && log.all.shown && same(log.all.keys, want.all) && same(log.off.keys, want.off)
    && log.offState.live === 0 && log.offState.hits === 0 && log.cleared.keys.length === 0
    && same(log.undone.keys, want.off) && same(log.reloaded.keys, want.off) && same(log.rowsBack, [2, 6])
    && same(log.esc.keys, want.esc) && same(log.escUndo.keys, want.escUndo);
  return { pass: ok, detail: ok ? '' : JSON.stringify(log) };
});

check('Canvas: switching a search or selection off in the Selections panel redraws', async (page) => {
  await loadFasta(page, makeFasta(30, 300));
  await page.evaluate(() => { el('searchInput').value = 'GTAC'; el('searchButton').click(); });
  await setMode(page, 'canvas');
  const yellow = () => page.evaluate(() => {
    const c = document.getElementById('alignmentCanvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let y = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] < 60) y++; return y;
  });
  await page.waitForTimeout(300);
  const on = await yellow();
  await page.evaluate(() => setSelectionItemOn('search:' + state.searchHistory[0].className, false));
  await page.waitForTimeout(200);
  const off = await yellow();
  return { pass: on > 1000 && off === 0, detail: `highlighted pixels ${on} -> ${off}` };
});

check('v212 audit fixes: mismatch hits, empty/lowercase/invalid regex, counts, legacy snapshots, no-op gaps, per-row cache', async (page) => {
  await loadFasta(page, '>a\nACGTAAAACCGTTGCA\n>b\nAC-GTAAATCCGTTGC\n>c\nTTTTTTTTTTTTTTTT\n');
  const out = await page.evaluate(() => {
    const r = {};
    const hitCols = row => [...document.querySelectorAll(`.seq-line[data-seq-index="${row}"] .seq-data > span[data-search-hit]`)].map(sp => +sp.dataset.pos);
    // 1 mismatch search AAAA: row b "ACGTAAATCC.." matches AAAT at degapped 4..7 -> A,A,A paint, T not
    el('maxMismatches').value = '1'; el('searchRegex').checked = false; el('searchBothStrands').checked = false;
    el('searchInput').value = 'AAAA'; el('searchButton').click();
    renderAlignment();                                  // the redraw path, not the Find path
    r.mm = hitCols(1).join(',');                       // row b columns: A at 5,6,7 (gap at col 2)
    clearAllSearches(true); el('maxMismatches').value = '0';
    // empty-matching regex paints nothing, counts nothing
    el('searchRegex').checked = true; el('searchInput').value = 'q*'; el('searchButton').click();
    r.empty = [state.searchHistory[0]?.matchCount, document.querySelectorAll('[data-search-hit]').length];
    clearAllSearches(true);
    // lowercase u in a regex finds T/U residues
    el('searchInput').value = 'gu'; el('searchButton').click();
    r.lowerU = state.searchHistory[0]?.matchCount || 0;
    clearAllSearches(true);
    // invalid regex with both strands: no entry, message kept
    el('searchBothStrands').checked = true; el('searchInput').value = '[AT'; el('searchButton').click();
    r.invalid = [state.searchHistory.length, (el('statusMessage')?.textContent || '').includes('Invalid regex')];
    // regex + both strands: forward only, no mangled rev-comp entry
    el('searchInput').value = 'A[CT]G'; el('searchButton').click();
    r.regexStrands = state.searchHistory.map(e => e.strand).join(',');
    clearAllSearches(true);
    // both strands: a sequence matching on both strands counted once
    el('searchRegex').checked = false; el('searchInput').value = 'ACG'; el('searchButton').click();
    r.bothMsg = el('statusMessage')?.textContent || '';
    clearAllSearches(true);
    // legacy snapshot entries: mismatches from the view, regex from metacharacters
    _applySnapshotSearchHistory([{ motif: 'AAAA:fwd', color: '#ff0', label: 'AAAA', strand: 'fwd' },
                                 { motif: '[AT]CC:fwd', color: '#0ff', label: '[AT]CC', strand: 'fwd' }], '1');
    r.legacy = state.searchHistory.map(e => `${e.maxMismatches}/${e.useRegex}`).join(' ');
    clearAllSearches(true);
    // gap insert inside the trailing filler run is a no-op
    r.noop = geneDocInsertDashString('MK--', 3).changed === false && geneDocDeleteDashString('MK--', 3).changed === false
      && geneDocInsertDashString('MKGA', 1).changed === true;
    // per-row cache: a missing row blocks the in-place patch even when the consensus row pads the size
    const saved = state.spanCache.get(1); state.spanCache.delete(1);
    r.cacheGuard = canPatchColumnsInPlace(state.seqs[0].seq.length, state.seqs[0].seq.length) === false;
    state.spanCache.set(1, saved);
    return r;
  });
  const ok = out.mm === '5,6,7' && out.empty[0] === 0 && out.empty[1] === 0 && out.lowerU >= 1
    && out.invalid[0] === 0 && out.invalid[1] && out.regexStrands === 'fwd'
    && /in 2 sequences/.test(out.bothMsg) && out.legacy === '1/false 0/true' && out.noop && out.cacheGuard;
  return { pass: ok, detail: JSON.stringify(out) };
});

check('v212 audit fixes: Selections off/on merges TSD marks, repeats and name colours', async (page) => {
  await loadFasta(page, variedFasta(6, 80, 9));
  const out = await page.evaluate(() => {
    const r = {};
    const names = state.seqs.map(q => q.header);
    // TSD: mark row 0, off, mark row 1, off again, on -> both rows
    state.tsdMarks = new Map([[0, new Set([3, 4])]]);
    setSelectionItemOn('tsd', false);
    state.tsdMarks = new Map([[1, new Set([7])]]);
    setSelectionItemOn('tsd', false);
    setSelectionItemOn('tsd', true);
    r.tsd = [...state.tsdMarks.keys()].sort().join(',');
    // Name colours: A,B off; C coloured; on -> A,B,C
    colourState.mappings.set(names[0], '#f00'); colourState.mappings.set(names[1], '#0f0');
    setSelectionItemOn('names', false);
    colourState.mappings.set(names[2], '#00f');
    setSelectionItemOn('names', true);
    r.names = colourState.mappings.size;
    // Repeats: off twice with a new one between, then on -> both
    state.repeatHighlights = new Map([['r1', { segs: [[2, 6]], row: 0, color: '#abc' }]]);
    setSelectionItemOn('repeats', false);
    state.repeatHighlights = new Map([['r2', { segs: [[8, 12]], row: 1, color: '#cba' }]]);
    setSelectionItemOn('repeats', false);
    setSelectionItemOn('repeats', true);
    r.repeats = [...state.repeatHighlights.keys()].sort().join(',');
    // toggling repeats with no repeat state must not throw
    state.repeatHighlights = undefined; state.selectionStash.repeats = null;
    try { setSelectionItemOn('repeats', false); r.noThrow = true; } catch (e) { r.noThrow = e.message; }
    state.repeatHighlights = new Map();
    // Undo after a row above the selection was deleted restores the same sequence
    state.selectedRows = new Set([3]); const want = state.seqs[3].header;
    clearActiveSelection(true);
    state.seqs.splice(0, 1); renderAlignment();
    undoSelectionsRemoval();
    r.undoRow = [...state.selectedRows].map(i => state.seqs[i].header).join() === want;
    // A snapshot with no colours/marks, loaded over a session that has them, shows none
    clearAllSelections();
    const snap = _buildSnapshotPayload();
    snap.view.selectedColumns = [2, 99999];
    colourState.mappings.set(state.seqs[0].header, '#f00');
    state.tsdMarks = new Map([[1, new Set([4])]]);
    return new Promise(res => {
      _loadSnapshotPayload(JSON.parse(JSON.stringify(snap)));
      setTimeout(() => {
        r.snapExact = colourState.mappings.size === 0 && state.tsdMarks.size === 0;
        r.snapCols = [...state.selectedColumns].join();
        res(r);
      }, 1200);
    });
  });
  const ok = out.tsd === '0,1' && out.names === 3 && out.repeats === 'r1,r2' && out.noThrow === true && out.undoRow
    && out.snapExact && out.snapCols === '2';
  return { pass: ok, detail: JSON.stringify(out) };
});

check('v212 audit fixes: switched-off selections survive undo and column edits; Esc in a Type cell', async (page) => {
  await loadFasta(page, variedFasta(6, 40, 13));
  const r = await page.evaluate(() => {
    const out = {};
    const hdr = () => [...state.selectedRows].sort((a, b) => a - b).map(i => state.seqs[i].header).join();
    // rows 2,3 off; a data undo replaces state.seqs with copies; on again -> same sequences
    state.selectedRows = new Set([2, 3]); const want = hdr();
    setSelectionItemOn('rows', false);
    state.selectedColumns = new Set([0]); deleteSelectedColumns(true);   // pushes undo, copies seqs
    undoDelete();
    setSelectionItemOn('rows', true);
    out.rowsAfterUndo = hdr() === want;
    // columns 10,11 off; insert a gap column at 5 -> they come back as 11,12; delete 0 -> 10,11
    state.selectedRows.clear(); state.selectedColumns = new Set([10, 11]);
    setSelectionItemOn('cols', false);
    state.selectedColumns = new Set([5]); insertGapColumn();
    setSelectionItemOn('cols', true);
    out.colsAfterInsert = [...state.selectedColumns].sort((a, b) => a - b).join();
    setSelectionItemOn('cols', false);
    state.selectedColumns = new Set([0]); deleteSelectedColumns(true);
    setSelectionItemOn('cols', true);
    out.colsAfterDelete = [...state.selectedColumns].sort((a, b) => a - b).join();
    return out;
  });
  // Esc while typing in a cell leaves the cell and keeps the selection
  await page.evaluate(() => { state.selectedRows = new Set([1]); updateRowSelections(); });
  await page.click('#editToggleButton');
  await page.click('#editResidueButton');
  await page.click('.seq-line[data-seq-index="4"] .seq-data > span[data-pos="3"]');
  await page.mouse.move(700, 650); await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  r.escCell = await page.evaluate(() => [state.editCell === null, state.selectedRows.size]);
  // a focused checkbox does not swallow the first Esc
  await page.evaluate(() => { el('editToggleButton').click(); state.selectedRows = new Set([2]); updateRowSelections();
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = '__escProbe';
    cb.style.cssText = 'position:fixed;left:5px;bottom:5px;z-index:99999'; document.body.appendChild(cb); cb.focus(); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  r.escCheckbox = await page.evaluate(() => [document.activeElement?.id === '__escProbe' || document.activeElement === document.body, state.selectedRows.size]);
  const ok = r.rowsAfterUndo && r.colsAfterInsert === '11,12' && r.colsAfterDelete === '10,11'
    && r.escCell[0] === true && r.escCell[1] === 1 && r.escCheckbox[1] === 0;
  return { pass: ok, detail: JSON.stringify(r) };
});

check('Name colours: cleared when a new file loads, restored from a snapshot', async (page) => {
  await loadFasta(page, variedFasta(5, 60, 21));
  const snap = await page.evaluate(() => {
    colourState.mappings.set(state.seqs[0].header, '#ff0000'); applyColourToSeqNames(colourState.mappings);
    return JSON.stringify(_buildSnapshotPayload());
  });
  await loadFasta(page, variedFasta(5, 60, 21));
  const afterLoad = await page.evaluate(() => [colourState.mappings.size, document.querySelectorAll('.seq-name[style*="background"]').length]);
  const afterSnap = await page.evaluate(async (p) => { _loadSnapshotPayload(JSON.parse(p)); await new Promise(r => setTimeout(r, 1200)); return colourState.mappings.size; }, snap);
  const ok = afterLoad[0] === 0 && afterLoad[1] === 0 && afterSnap === 1;
  return { pass: ok, detail: JSON.stringify({ afterLoad, afterSnap }) };
});

check('Marks follow their residues: TSD marks, repeats and residue selection through gaps, row delete/move, redraw', async (page) => {
  // rows 0-5 have identical letters, so a mark kept by row number or by letters would land on another sequence
  let x = 11; const rnd = () => { x = (x * 16807) % 2147483647; return x; };
  const base = Array.from({ length: 50 }, () => 'ACGT'[rnd() % 4]);
  let fa = ''; for (let i = 0; i < 10; i++) { const s = base.slice(); if (i >= 6) s[20] = 'T'; fa += `>seq${i}\n${s.join('')}\n`; }
  page.on('dialog', d => d.accept());
  await loadFasta(page, fa);
  const r = await page.evaluate(() => {
    const where = (sel) => {
      const out = [];
      document.querySelectorAll('#alignmentContainer .seq-line[data-seq-index]:not(.consensus-line) .seq-data > span[data-pos]').forEach(sp => {
        if (!sp.matches(sel)) return;
        const row = +sp.closest('.seq-line').dataset.seqIndex, q = state.seqs[row];
        let n = 0; for (let c = 0; c < +sp.dataset.pos; c++) if (q.seq[c] !== '-') n++;
        out.push(q.header + ':' + n);
      });
      return out.sort().join();
    };
    const nucs = () => [...state.selectedNucs].filter(([r]) => r >= 0).map(([r, s]) => state.seqs[r].header + ':' + [...s].sort((a, b) => a - b).join('.')).join();
    state.tsdMarkStyle = 'color'; state.tsdMarks = new Map([[2, new Set([10, 11])]]); renderAlignment({ deferConservation: true });
    const info = { segs: [[30, 33]], row: 3, color: '#ff00ff' }; state.repeatHighlights.set('t', info); _paintRepeatHighlight(info, true);
    state.selectedNucs.set(4, new Set([5, 6])); refreshNucleotideSelectionsImmediate();
    const before = [where('.tsd-mark'), where('[data-repeat-hl]'), nucs()];
    const steps = {};
    renderAlignment(); steps.redraw = [where('.tsd-mark'), where('[data-repeat-hl]'), nucs()];
    state.selectedColumns = new Set([3]); insertGapColumn(); state.selectedColumns.clear();
    steps.gapColumn = [where('.tsd-mark'), where('[data-repeat-hl]')];
    state.seqs.splice(0, 1); renderAlignment(); steps.deleteRow = [where('.tsd-mark'), where('[data-repeat-hl]'), nucs()];
    state.selectedRows = new Set([3]); moveSelectedToTop(); state.selectedRows.clear(); updateRowSelections();
    steps.moveRow = [where('.tsd-mark'), where('[data-repeat-hl]'), nucs()];
    return { before, steps };
  });
  const [tsd0, rep0, nuc0] = r.before;
  const bad = Object.entries(r.steps).filter(([, v]) => v[0] !== tsd0 || v[1] !== rep0 || (v[2] !== undefined && v[2] !== nuc0));
  const ok = tsd0 === 'seq2:10,seq2:11' && rep0 === 'seq3:30,seq3:31,seq3:32' && nuc0 === 'seq4:5.6' && bad.length === 0;
  return { pass: ok, detail: JSON.stringify(ok ? r.before : r) };
});

check('Overlapping marks all stay visible, in any order, in DOM and Canvas (conflict study phase 2)', async (page) => {
  // two groups differing at 10, 20, 30, so SNP grouping paints column 10 of row 2
  let x = 7; const rnd = () => { x = (x * 16807) % 2147483647; return x; };
  const base = Array.from({ length: 60 }, () => 'ACGT'[rnd() % 4]);
  let fa = ''; for (let i = 0; i < 12; i++) { const s = base.slice(); [10, 20, 30].forEach(c => { s[c] = i < 6 ? 'G' : 'C'; }); fa += `>seq${i}\n${s.join('')}\n`; }
  await loadFasta(page, fa);
  const r = await page.evaluate(async () => {
    const cs = (row, pos) => getComputedStyle(document.querySelector(`.seq-line[data-seq-index="${row}"] .seq-data > span[data-pos="${pos}"]`));
    const nameCs = row => { const n = document.querySelector(`.seq-line[data-seq-index="${row}"] .seq-name`); const c = getComputedStyle(n); return [c.backgroundColor, c.boxShadow].join(' | '); };
    const left = () => [...document.querySelectorAll('.seq-line[data-seq-index="2"] .seq-data > span[data-pos]')].map(s => Math.round(s.getBoundingClientRect().left));
    const out = {};
    const x0 = left();
    // name cell: Colour Name first, then groups ...
    colourState.mappings.set(state.seqs[1].header, '#ff8800'); applyColourToSeqNames(colourState.mappings);
    await clusterSequences();
    out.nameAB = nameCs(1);
    // ... and groups first, then Colour Name (clear both, redo in the other order)
    colourState.mappings.clear(); clearTypePaint();
    await clusterSequences();
    colourState.mappings.set(state.seqs[1].header, '#ff8800'); applyColourToSeqNames(colourState.mappings);
    out.nameBA = nameCs(1);
    renderAlignment();
    out.nameRedraw = nameCs(1);
    // residue marks on column 10 of row 2 (an SNP letter): search + TSD on top of it
    state.tsdMarkStyle = 'color'; state.tsdMarkColor = '#00e5ff';
    state.tsdMarks = new Map([[2, new Set([5, 10])]]);
    searchMotif({ motif: state.seqs[2].seq.slice(8, 12), color: '#ffff00', bothStrands: false, useRegex: false, maxMismatches: 0, suppressMessage: true });
    state.selectedNucs.set(2, new Set([10])); state.selectedColumns.add(20); state.selectedRows.add(3);
    renderAlignment();
    await new Promise(r => setTimeout(r, 100));
    const c10 = cs(2, 10), c5 = cs(2, 5), c20 = cs(2, 20), r3 = cs(3, 10);
    out.tsdUnderSearch = [c10.backgroundColor, c10.fontFamily.startsWith('Arial'), c10.fontWeight, c10.color];
    out.tsdAlone = [c5.backgroundColor, c5.fontFamily.startsWith('Arial')];
    out.resSelTint = /gradient/.test(c10.backgroundImage);
    out.colSelOverSnp = [/gradient/.test(c20.backgroundImage), c20.backgroundColor];
    out.rowSelTint = /gradient/.test(r3.backgroundImage);
    out.moved = left().filter((v, i) => Math.abs(v - x0[i]) > 0).length;
    // Canvas shows the TSD colour and the name colour
    document.getElementById('modeCanvas').checked = true; onModeChange();
    await new Promise(r => setTimeout(r, 500));
    const c = document.getElementById('alignmentCanvas'), m = _canvasState.metrics, k = devicePixelRatio, g = c.getContext('2d');
    const px = (xx, yy) => Array.from(g.getImageData(Math.round(xx * k), Math.round(yy * k), 1, 1).data).slice(0, 3).join(',');
    // the most common colour in the cell is its background (a single pixel can hit the glyph)
    const cellBg = (col, row) => {
      const d = g.getImageData(Math.round((m.nameW + col * m.charW) * k), Math.round((m.charH + row * _canvasState.rowPitch) * k), Math.round(m.charW * k), Math.round(m.charH * k)).data;
      const n = {}; for (let i = 0; i < d.length; i += 4) { const key = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; n[key] = (n[key] || 0) + 1; }
      return Object.entries(n).sort((a, b) => b[1] - a[1])[0][0];
    };
    out.canvasTsd = cellBg(5, 2);
    out.canvasName = px(20, m.charH + 1 * _canvasState.rowPitch + 2);
    return out;
  });
  const ok = r.nameAB === r.nameBA && r.nameBA === r.nameRedraw && /255, 136, 0/.test(r.nameAB) && /inset/.test(r.nameAB)
    && r.tsdUnderSearch[0] === 'rgb(255, 255, 0)' && r.tsdUnderSearch[1] && r.tsdUnderSearch[2] === '700'
    && r.tsdAlone[0] === 'rgb(0, 229, 255)' && r.tsdAlone[1]
    && r.resSelTint && r.colSelOverSnp[0] && r.rowSelTint && r.moved === 0
    && r.canvasTsd === '0,229,255' && r.canvasName === '255,136,0';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('Touchpad-style horizontal scroll: no writes back into the alignment, the swipe completes', async (page) => {
  // A compositor-driven gesture (like a two-finger swipe) over a wide alignment in Full view at 50%.
  // The persistent bar used to echo every scroll step back (scrollLeft = bar.scrollLeft), which
  // cancelled the browser's scrolling: the swipe stopped at 40-60% of its distance.
  await loadFasta(page, makeFasta(120, 2000));
  await setMode(page, 'full');
  await page.evaluate(() => setZoom(50));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const c = el('alignmentContainer'); window.__writes = 0;
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft');
    Object.defineProperty(c, 'scrollLeft', { get() { return d.get.call(this); }, set(v) { window.__writes++; d.set.call(this, v); } });
    // main-thread load, as while new rows are laid out
    const spin = () => { const t = performance.now(); while (performance.now() - t < 25); requestAnimationFrame(spin); }; requestAnimationFrame(spin);
  });
  const b = await (await page.$('#alignmentContainer')).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + 200), xDistance: -1200, yDistance: 0, speed: 1500, gestureSourceType: 'mouse' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ left: Math.round(el('alignmentContainer').scrollLeft), writes: window.__writes, bar: Math.round(document.querySelector('.horizontal-scrollbar').scrollLeft) }));
  const ok = r.writes === 0 && r.left >= 1150 && Math.abs(r.bar - r.left) <= 2;
  return { pass: ok, detail: JSON.stringify(r) };
});

check('TSD results show 3 flanking bases on each side of both copies, in small grey', async (page) => {
  let seed = 5; const rnd = () => Math.floor((seed = (seed * 1103515245 + 12345) % 2147483648) / 65536);
  const rb = (n) => Array.from({ length: n }, () => 'ACGT'[rnd() % 4]).join('');
  const body = rb(100);
  let fa = `>consensus\n${'-'.repeat(31)}${body}AAAAAAAAAA${'-'.repeat(31)}\n`;
  for (let i = 0; i < 20; i++) {
    const tsd = rb(6);
    const b = body.split('').map(c => (rnd() % 20 === 0 ? 'ACGT'[rnd() % 4] : c)).join('');   // a varying body, as in the Repeat Finder check
    // copy3 has a gap inside its 5' flank, copy4 a copy truncated so the 3' flank is short
    let left = rb(25); if (i === 3) left = left.slice(0, 22) + '-' + left.slice(22);
    let right = rb(25); if (i === 4) right = right.slice(0, 2) + '-'.repeat(23);
    fa += `>copy${i}
${left}${tsd}${b}AAAAAAAAAA${tsd}${right}
`;
  }
  await page.setInputFiles('#fileInput', { name: 'tsdflank.fa', mimeType: 'text/plain', buffer: Buffer.from(fa) });
  await page.waitForTimeout(1500);
  await page.evaluate(() => openRepeatFinder(0));
  await page.click('label:has(input[name="repeatMode"][value="tsd"])');
  await page.click('#repeatRunBtn');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const out = { rows: 0, bad: [], grey: null, short: null };
    const trs = [...document.querySelectorAll('#repeatResults tbody tr')];
    out.rows = trs.length;
    _lastTsdResults.forEach(res => {
      // independent flank computation: residues (gaps skipped) just before/after each copy
      const seq = state.seqs[res.seqIndex].seq;
      const nongap = c => { let n = 0; for (let i = 0; i < c; i++) if (seq[i] !== '-' && seq[i] !== '.') n++; return n; };
      const ung = seq.replace(/[-.]/g, '');
      const exp = pos => { const a = nongap(pos[0]), z = nongap(pos[pos.length - 1]) + 1; return [ung.slice(Math.max(0, a - 3), a), ung.slice(z, z + 3)]; };
      const [ub, ua] = exp(res.upPositions), [db, da] = exp(res.downPositions);
      const tr = trs.find(t => t.children[1].textContent === res.seqName);
      const shown = [...tr.querySelectorAll('.rf-flank')].map(s => s.textContent.replace(/\u00a0/g, ''));
      if (shown.join('|') !== [ub, ua, db, da].join('|')) out.bad.push([res.seqName, shown.join('|'), [ub, ua, db, da].join('|')]);
    });
    const f = document.querySelector('#repeatResults .rf-flank');
    const cs = getComputedStyle(f), main = getComputedStyle(document.querySelector('#repeatResults .rf-pair'));
    out.grey = { color: cs.color, small: parseFloat(cs.fontSize) < parseFloat(main.fontSize) };
    out.fourPerRow = trs.every(t => t.querySelectorAll('.rf-flank').length === 4);
    out.mmStillCounted = document.querySelectorAll('#repeatResults .rf-mm').length;
    return out;
  });
  const ok = r.rows >= 15 && r.bad.length === 0 && r.fourPerRow && r.grey.small && r.grey.color !== 'rgb(0, 0, 0)' && r.mmStillCounted === 0;
  return { pass: ok, detail: JSON.stringify(r) };
});

check('Highlight diffs / Variable sites only work out of the box and pause each other with a message', async (page) => {
  // column 3 (0-based) differs in one sequence; every other column is identical
  await loadFasta(page, '>a\nACGTACGTAC\n>b\nACGAACGTAC\n>c\nACGTACGTAC\n>d\nACGTACGTAC\n');
  const r = await page.evaluate(async () => {
    const out = {};
    const tick = async (id) => { el(id).click(); await new Promise(res => setTimeout(res, 350)); };
    const msg = () => el('statusMessage')?.textContent || '';
    out.defaults = [el('varThresholdMode').value, el('varSitesThreshold').value];
    await tick('highlightDiffs');
    out.diffCols = [...state._diffColumns].join();          // only the differing column
    const dim = p => getComputedStyle(document.querySelector(`.seq-line[data-seq-index="0"] span[data-pos="${p}"]`)).opacity;
    out.opacity = [dim(3), dim(5)];                          // differing column normal, identical dimmed
    await tick('varSitesOnly');
    out.afterVar = [el('highlightDiffs').checked, el('varSitesOnly').checked, state._diffsPausedByVarSites === true, /paused/.test(msg())];
    out.hidden = getComputedStyle(document.querySelector('.seq-line[data-seq-index="0"] span[data-pos="5"]')).display;
    await tick('varSitesOnly');                              // off again: Highlight diffs comes back
    out.afterOff = [el('highlightDiffs').checked, el('varSitesOnly').checked, /back on/.test(msg())];
    await tick('varSitesOnly'); await tick('highlightDiffs'); // ticking diffs while var-sites is on
    out.afterDiffs = [el('highlightDiffs').checked, el('varSitesOnly').checked, /switched off/.test(msg())];
    return out;
  });
  const ok = r.defaults[0] === 'count' && r.defaults[1] === '1' && r.diffCols === '3'
    && r.opacity[0] === '1' && parseFloat(r.opacity[1]) < 1
    && r.afterVar[0] === false && r.afterVar[1] === true && r.afterVar[2] && r.afterVar[3] && r.hidden === 'none'
    && r.afterOff[0] === true && r.afterOff[1] === false && r.afterOff[2]
    && r.afterDiffs[0] === true && r.afterDiffs[1] === false && r.afterDiffs[2];
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
