// End-to-end: ?url=<aln>&mask=<json> loads the alignment AND overlays the
// supplied block mask. Exit 0 on success.
const { launch, loadFasta } = require('../lib/browser');
const { start } = require('../lib/static-server');
const path = require('path');

(async () => {
  const srv = await start();
  const base = `http://localhost:${srv.port}`;
  const alnPath = '/tests/fixtures/blockmask/oma_SINE16b.aln.fa';
  const maskPath = '/tests/fixtures/blockmask/oma_SINE16b.expected.json';
  const url = `${base}/index.html?url=${encodeURIComponent(base + alnPath)}`
    + `&mask=${encodeURIComponent(base + maskPath)}`;

  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  let failReason = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    // wait for the alignment to render and the ?mask= fetch to apply
    await page.waitForFunction(() => {
      try {
        return typeof state !== 'undefined'
          && state.seqs && state.seqs.length > 0
          && state.blockMask && Array.isArray(state.blockMask.blocks);
      } catch (e) { return false; }
    }, { timeout: 15000 });
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      let nrows = -1;
      try { nrows = state.seqs.length; } catch (e) {}
      return {
        rows: nrows,
        maskBlocks: (state.blockMask && state.blockMask.blocks) ? state.blockMask.blocks.length : -1,
        rects: document.querySelectorAll('.block-mask-layer rect').length
      };
    });

    if (info.rows <= 0) failReason = 'alignment did not load (rows=' + info.rows + ')';
    else if (info.maskBlocks <= 0) failReason = 'state.blockMask not set from ?mask= (blocks=' + info.maskBlocks + ')';
    else if (info.rects <= 0) failReason = 'no .block-mask-layer rects drawn';
    else console.log('PASS mask-url.test.js — rows=' + info.rows + ', maskBlocks=' + info.maskBlocks + ', rects=' + info.rects);
  } catch (e) {
    failReason = e.message;
  } finally {
    await browser.close();
    srv.server.close();
  }

  if (failReason) {
    console.log('FAIL mask-url.test.js — ' + failReason);
    if (errs.length) console.log('  page errors: ' + JSON.stringify(errs.slice(0, 5)));
    process.exit(1);
  }
  process.exit(0);
})();
