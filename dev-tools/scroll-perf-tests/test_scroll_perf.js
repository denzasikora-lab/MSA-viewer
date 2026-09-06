const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3000/?url=/oma_test.fas', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  const scrollTimes = await page.evaluate(async () => {
    const container = document.getElementById('alignmentContainer');
    const times = [];
    for (let i = 0; i < 15; i++) {
      const t = performance.now();
      container.scrollTop += 300;
      await new Promise(r => requestAnimationFrame(r));
      times.push(+(performance.now() - t).toFixed(1));
    }
    return times;
  });
  console.log('per-scroll-step frame times (ms):', JSON.stringify(scrollTimes));
  await browser.close();
})();
