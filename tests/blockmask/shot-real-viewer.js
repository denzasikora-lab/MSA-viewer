// Load real ViewAlign, load the SINE16b fixture, apply the block-mask overlay
// LIVE via the in-script.js integration, screenshot. Tests the DEFAULT
// (Blocks) mode as well as Single.
const { launch, loadFasta } = require('../lib/browser');
const { start } = require('../lib/static-server');
const fs = require('fs');
const path = require('path');

(async () => {
  const ROOT = path.join(__dirname, '..', '..');
  const srv = await start();
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
  await page.waitForTimeout(400);

  const shoot = async (label, mode) => {
    const info = await page.evaluate(({ presetsJson, mode }) => {
      window.__BLOCKMASK_PRESETS = JSON.parse(presetsJson);
      if (mode) {
        const r = document.getElementById(mode);
        const other = document.getElementById(mode === 'modeSingle' ? 'modeBlocks' : 'modeSingle');
        if (r && !r.checked) { r.checked = true; if (other) other.checked = false; onModeChange(); }
      }
      const mask = (typeof applyBlockMaskLive === 'function') ? applyBlockMaskLive('V3_medium') : null;
      if (typeof setBlockMaskOpacity === 'function') setBlockMaskOpacity(0.45);
      const layers = document.querySelectorAll('.block-mask-layer');
      let rects = 0; layers.forEach(l => rects += l.querySelectorAll('rect').length);
      return {
        blocksDom: document.querySelectorAll('.block-block').length,
        seqLines: document.querySelectorAll('.seq-line[data-seq-index]').length,
        maskBlocks: mask ? mask.blocks.length : -1,
        splits: mask ? mask.blocks.filter(b => b.rows !== 'all').length : -1,
        layers: layers.length,
        rects
      };
    }, { presetsJson: presets, mode });
    console.log(label, info);
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      const c = document.getElementById('alignmentContainer');
      if (c) c.scrollLeft = Math.max(0, c.scrollWidth * 0.55);
      if (typeof renderBlockMaskOverlay === 'function') renderBlockMaskOverlay();
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(__dirname, 'real-viewer-' + label + '.png') });
  };

  await shoot('single', 'modeSingle');
  await shoot('blocks', 'modeBlocks');
  console.log('errors:', errs.length ? errs : 'none');

  await browser.close();
  srv.server.close();
})();
