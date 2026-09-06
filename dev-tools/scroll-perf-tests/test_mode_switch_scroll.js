const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3000/?url=/oma_test.fas', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);

  // Scroll down in Block/DOM mode to a specific row, note which row is at the top
  await page.evaluate(() => document.getElementById('alignmentContainer').scrollTo(0, 3000));
  await page.waitForTimeout(300);
  const beforeSwitch = await page.evaluate(() => {
    const c = document.getElementById('alignmentContainer');
    const rows = [...c.querySelectorAll('.seq-line[data-seq-index]')].filter(r => parseInt(r.getAttribute('data-seq-index'),10) >= 0);
    // topmost row = smallest positive top within viewport
    const top = rows.filter(r => r.getBoundingClientRect().top >= c.getBoundingClientRect().top - 5)
                    .sort((a,b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    return { scrollTop: c.scrollTop, topRowIdx: top ? parseInt(top.getAttribute('data-seq-index'),10) : null, topRowName: top ? state.seqs[parseInt(top.getAttribute('data-seq-index'),10)].header : null };
  });
  console.log('Before switch (Block mode):', JSON.stringify(beforeSwitch));

  await page.screenshot({ path: __dirname + '/switch_before.png' });

  // Switch to Canvas mode
  await page.evaluate(() => {
    const r = document.getElementById('modeCanvas');
    r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: __dirname + '/switch_after_canvas.png' });

  const afterSwitch = await page.evaluate(() => ({
    offsetY: _canvasState.offsetY, rowPitch: _canvasState.rowPitch,
    impliedTopRow: Math.round((_canvasState.offsetY||0) / (_canvasState.rowPitch||16))
  }));
  console.log('After switch (Canvas mode):', JSON.stringify(afterSwitch));

  const impliedName = await page.evaluate((idx) => state.seqs[idx] ? state.seqs[idx].header : null, afterSwitch.impliedTopRow);
  console.log('Row name at implied Canvas top-row index:', impliedName, '(compare to Block-mode top row name above)');

  console.log('errors:', JSON.stringify(errs));
  await browser.close();
})();
