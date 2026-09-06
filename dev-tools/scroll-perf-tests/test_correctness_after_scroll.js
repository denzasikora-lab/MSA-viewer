const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3000/?url=/oma_test.fas', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);

  // Scroll down partway, then up, then down again - a realistic back-and-forth pattern
  // that exercises both the "rows scrolled out" and "rows scrolled back in" incremental paths.
  await page.evaluate(async () => {
    const c = document.getElementById('alignmentContainer');
    for (const delta of [500, 800, 1200, -400, -900, 600]) {
      c.scrollTop += delta;
      await new Promise(r => requestAnimationFrame(r));
    }
  });
  await page.waitForTimeout(300);

  // Correctness check 1: every rendered row's data-seq-index is unique (no duplicates
  // from a botched incremental add), and every row's actual sequence text matches
  // state.seqs[idx].seq for the columns currently rendered.
  const check1 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#alignmentContainer .seq-line[data-seq-index]')];
    const indices = rows.map(r => parseInt(r.getAttribute('data-seq-index'), 10)).filter(i => i >= 0);
    const dupSet = new Set();
    const dups = indices.filter(i => dupSet.has(i) ? true : (dupSet.add(i), false));
    // Spot-check a few rows' rendered text against the real state.seqs data
    const mismatches = [];
    for (const r of rows.slice(0, 30)) {
      const idx = parseInt(r.getAttribute('data-seq-index'), 10);
      if (idx < 0) continue;
      const spans = [...r.querySelectorAll('.seq-data span[data-pos]')];
      if (!spans.length) continue;
      const firstPos = parseInt(spans[0].getAttribute('data-pos'), 10);
      const renderedText = spans.map(s => s.textContent).join('');
      const realSeq = state.seqs[idx].seq;
      const expected = realSeq.slice(firstPos, firstPos + renderedText.length);
      if (expected !== renderedText) mismatches.push({ idx, firstPos, expected: expected.slice(0,30), rendered: renderedText.slice(0,30) });
    }
    return { totalRows: rows.length, dupCount: dups.length, dups: dups.slice(0,5), mismatchCount: mismatches.length, mismatches: mismatches.slice(0,3) };
  });
  console.log('Row correctness check:', JSON.stringify(check1));

  // Correctness check 2: column selection highlighting still works after this
  // scroll pattern (exercises spanCache correctness).
  const check2 = await page.evaluate(() => {
    state.selectedColumns.clear();
    for (let p = 10; p < 15; p++) state.selectedColumns.add(p);
    if (typeof updateColumnSelections === 'function') updateColumnSelections();
    const styleEl = document.getElementById('column-selection-style');
    return { styleText: styleEl ? styleEl.textContent.slice(0, 200) : null };
  });
  console.log('Column selection check:', JSON.stringify(check2));

  console.log('page errors:', JSON.stringify(errs));
  await browser.close();
})();
