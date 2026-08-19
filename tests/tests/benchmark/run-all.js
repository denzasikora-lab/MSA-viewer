// Repeatable performance benchmark suite. Prints a JSON summary of scroll
// latency (DOM windowed vs Canvas) across a size ladder, and GeneDoc typing
// latency. These are the same measurements/methodology used to find and fix
// the v178 typing-latency bug and the v179 consensus-windowing bug this
// session - formalized here so the numbers are reproducible and can go
// straight into a manuscript's performance section. Not a pass/fail gate
// (see tests/regression for that) - this is a numbers report.
const { start } = require('../lib/static-server');
const { launch, loadSyntheticFasta, setMode } = require('../lib/browser');

// Only sizes that clear ALIGN_CRAZY_VOLUME (5M) so the windowed DOM path is
// actually exercised - a smaller alignment doesn't call
// _refreshUnifiedWindowOnScroll from the real scroll-handler path at all.
const SCROLL_SIZES = [
  { nSeq: 500, nCol: 12000 },   // 6M
  { nSeq: 1000, nCol: 15000 },  // 15M
  { nSeq: 2000, nCol: 20000 },  // 40M
  { nSeq: 2000, nCol: 50000 },  // 100M
];

async function benchScroll(browser, baseUrl, nSeq, nCol) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(90000);
  await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
  const t0 = Date.now();
  await loadSyntheticFasta(page, nSeq, nCol);
  const loadMs = Date.now() - t0;

  await setMode(page, 'canvas');
  const canvasScroll = [];
  for (let i = 0; i < 6; i++) {
    const dt = await page.evaluate(() => new Promise((resolve) => {
      const canvas = document.querySelector('#alignmentContainer canvas');
      const t0 = performance.now();
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, deltaX: 0, bubbles: true, cancelable: true }));
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - t0)));
    }));
    canvasScroll.push(dt);
  }

  await setMode(page, 'full');
  const domScroll = await page.evaluate(() => {
    const container = document.getElementById('alignmentContainer');
    const timings = [];
    for (let i = 0; i < 6; i++) {
      container.scrollTop += 300;
      const t0 = performance.now();
      _refreshUnifiedWindowOnScroll(container);
      timings.push(performance.now() - t0);
    }
    return timings;
  });

  await page.close();
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    nSeq, nCol, totalResidues: nSeq * nCol, loadMs,
    domScrollAvgMs: +avg(domScroll).toFixed(2),
    domScrollMaxMs: +Math.max(...domScroll).toFixed(2),
    canvasScrollAvgMs: +avg(canvasScroll).toFixed(2),
    canvasScrollMaxMs: +Math.max(...canvasScroll).toFixed(2),
  };
}

async function benchTyping(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(30000);
  await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
  await loadSyntheticFasta(page, 200, 20000); // 4M residues, realistic editing target size
  await setMode(page, 'full');
  const timings = await page.evaluate(async () => {
    setGeneDocEditTool('residue');
    state.editCell = { row: 0, pos: 0 };
    const out = [];
    for (const ch of 'ABCDEFGHIJ') {
      const t0 = performance.now();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      out.push(performance.now() - t0);
      await new Promise(r => setTimeout(r, 5));
    }
    return out;
  });
  await page.close();
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  return { perKeystrokeAvgMs: +avg.toFixed(3), perKeystrokeMaxMs: +Math.max(...timings).toFixed(3) };
}

async function main() {
  const { server, baseUrl } = await start();
  const browser = await launch();
  const results = { scroll: [], typing: null };
  try {
    for (const { nSeq, nCol } of SCROLL_SIZES) {
      const row = await benchScroll(browser, baseUrl, nSeq, nCol);
      results.scroll.push(row);
      console.log(JSON.stringify(row));
    }
    results.typing = await benchTyping(browser, baseUrl);
    console.log(JSON.stringify(results.typing));
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\n=== BENCHMARK SUMMARY ===');
  console.log(JSON.stringify(results, null, 1));
}

main().catch(e => { console.error('BENCHMARK ERROR:', e); process.exit(1); });
