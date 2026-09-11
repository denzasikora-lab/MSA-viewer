const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3000/?url=/oma_test.fas', { waitUntil: 'load', timeout: 60000 });

  // Poll for real readiness. NOTE: `state` is declared with top-level `const`
  // in script.js, so it is NEVER a property of `window` - `window.state` is
  // always undefined and a check gated on it never resolves true. Check the
  // bare identifier instead (works fine inside page.evaluate, which runs in
  // the page's own global scope).
  let ready = false;
  for (let i = 0; i < 20; i++) {
    ready = await page.evaluate(() => typeof state !== 'undefined' && state.seqs && state.seqs.length > 0).catch(() => false);
    if (ready) break;
    await page.waitForTimeout(300);
  }
  console.log('ready:', ready);
  await page.waitForTimeout(500);

  const container = await page.evaluate(() => {
    const c = document.getElementById('alignmentContainer');
    return c ? { scrollHeight: c.scrollHeight, clientHeight: c.clientHeight, scrollTop: c.scrollTop, mode: (document.getElementById('modeSingle')?.checked ? 'single' : document.getElementById('modeBlocks')?.checked ? 'blocks' : 'other') } : null;
  });
  console.log('container state at top:', JSON.stringify(container));
  await page.screenshot({ path: __dirname + '/scroll_top.png' });

  // Scroll to the very bottom
  await page.evaluate(() => {
    const c = document.getElementById('alignmentContainer');
    c.scrollTop = c.scrollHeight;
  });
  await page.waitForTimeout(800);
  const containerAfter = await page.evaluate(() => {
    const c = document.getElementById('alignmentContainer');
    const spacers = [...c.querySelectorAll(':scope > .unified-mode-spacer')].map(s => s.style.height);
    const blocks = c.querySelectorAll('[class*="unified-block"], .unified-block').length;
    return { scrollHeight: c.scrollHeight, clientHeight: c.clientHeight, scrollTop: c.scrollTop, spacers, childCount: c.children.length, innerHTMLLen: c.innerHTML.length };
  });
  console.log('container state after scroll-to-bottom:', JSON.stringify(containerAfter));
  await page.screenshot({ path: __dirname + '/scroll_bottom.png' });

  console.log('errors:', JSON.stringify(errs));
  await browser.close();
})();
