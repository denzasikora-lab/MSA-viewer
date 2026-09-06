const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const client = await page.context().newCDPSession(page);
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 100 });

  await page.goto('http://localhost:3000/?url=/oma_test.fas', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  await client.send('Profiler.start');
  await page.evaluate(async () => {
    const container = document.getElementById('alignmentContainer');
    for (let i = 0; i < 15; i++) {
      container.scrollTop += 300;
      await new Promise(r => requestAnimationFrame(r));
    }
  });
  const { profile } = await client.send('Profiler.stop');

  const nodeById = new Map(profile.nodes.map(n => [n.id, n]));
  const idToTime = new Map();
  const samples = profile.samples || [];
  const deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    idToTime.set(samples[i], (idToTime.get(samples[i]) || 0) + (deltas[i] || 0));
  }
  const selfTime = new Map();
  for (const [nid, t] of idToTime.entries()) {
    const node = nodeById.get(nid);
    if (!node) continue;
    const key = (node.callFrame.functionName || '(anonymous)') + ' @ ' + node.callFrame.url.split('/').pop() + ':' + node.callFrame.lineNumber;
    selfTime.set(key, (selfTime.get(key) || 0) + t);
  }
  const sorted = [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log('Top self-time functions during 15 scroll steps (microseconds):');
  sorted.forEach(([k, v]) => console.log((v/1000).toFixed(1) + 'ms\t' + k));

  await browser.close();
})();
