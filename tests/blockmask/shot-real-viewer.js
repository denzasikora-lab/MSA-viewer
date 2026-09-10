// Load the REAL ViewAlign, load the SINE16b fixture, apply the block-mask
// overlay live, screenshot. Verifies the overlay lines up with real residues.
const { launch, loadFasta } = require('../lib/browser');
const { start } = require('../lib/static-server');
const fs = require('fs');
const path = require('path');

(async () => {
  const ROOT = path.join(__dirname, '..', '..');
  const srv = await start(ROOT);
  const base = `http://localhost:${srv.port}`;
  const fasta = fs.readFileSync(path.join(ROOT, 'tests/fixtures/blockmask/oma_SINE16b.aln.fa'), 'utf8');
  const presets = fs.readFileSync(path.join(ROOT, 'reference/granularity_presets.json'), 'utf8');

  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text()); });

  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle', timeout: 25000 });
  await loadFasta(page, fasta);
  await page.waitForTimeout(300);
  // Overlay currently supports the unwrapped Single view only.
  await page.evaluate(() => {
    const s = document.getElementById('modeSingle');
    if (s && !s.checked) { s.checked = true; document.getElementById('modeBlocks').checked = false; onModeChange(); }
  });
  await page.waitForTimeout(500);

  const info = await page.evaluate((presetsJson) => {
    window.__BLOCKMASK_PRESETS = JSON.parse(presetsJson);
    if (!window.BlockMaskOverlay) return { err: 'overlay script not present' };
    const mask = window.BlockMaskOverlay.applyLive('V3_medium');
    window.BlockMaskOverlay.setOpacity(0.5);
    const layer = document.getElementById('blockMaskLayer');
    let nrows = -1;
    try { nrows = (typeof state !== 'undefined' && state.seqs) ? state.seqs.length : -1; } catch (e) {}
    return {
      rows: nrows,
      seqLines: document.querySelectorAll('.seq-line[data-seq-index]').length,
      blocks: mask ? mask.blocks.length : -1,
      splits: mask ? mask.blocks.filter(b => b.rows !== 'all').length : -1,
      rects: layer ? layer.querySelectorAll('rect').length : -1
    };
  }, presets);
  console.log('info:', info);
  console.log('errors:', errs.length ? errs : 'none');

  await page.waitForTimeout(300);
  // scroll the alignment container to the element/right-flank boundary
  await page.evaluate(() => {
    const c = document.getElementById('alignmentContainer');
    if (c) c.scrollLeft = Math.max(0, c.scrollWidth * 0.62);
    if (window.BlockMaskOverlay) window.BlockMaskOverlay.redraw();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'real-viewer-overlay.png') });

  await browser.close();
  srv.server.close();
})();
