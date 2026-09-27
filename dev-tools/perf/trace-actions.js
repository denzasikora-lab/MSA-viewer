// Chrome trace of one page action on rsi: which rendering phases take the time.
const { launch } = require('../../tests/lib/browser');
const { start } = require('../../tests/lib/static-server');
const ACTIONS = {
  hdOn: `(() => { const e = document.getElementById('highlightDiffs'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  hdOff: `(() => { const e = document.getElementById('highlightDiffs'); e.checked = false; e.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  zoom80: `setZoom(80)`, zoom100: `setZoom(100)`,
  sort: `document.getElementById('sortByNameButton').click()`,
  render: `renderAlignment()`,
};
(async () => {
  const { server, baseUrl } = await start();
  const b = await launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1000 } });
  await p.goto(baseUrl + '/index.html?url=' + encodeURIComponent('https://raw.githubusercontent.com/Toki-bio/Tal/main/rhin/alignments/rsi_subfam_input_30k.aln.fa'), { waitUntil: 'networkidle' });
  await p.waitForFunction(() => state.seqs && state.seqs.length > 100, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  if (process.env.TRACE_CSS) { await p.addStyleTag({ content: process.env.TRACE_CSS }); await p.waitForTimeout(1500); }
  for (const name of (process.env.ACTIONS || 'hdOn,hdOff,zoom80,zoom100,sort,render').split(',')) {
    const cdp = await p.context().newCDPSession(p); const evs = [];
    cdp.on('Tracing.dataCollected', d => evs.push(...d.value));
    const doneP = new Promise(res => cdp.once('Tracing.tracingComplete', res));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink,v8', transferMode: 'ReportEvents' });
    const t0 = Date.now();
    await p.evaluate(ACTIONS[name]);
    await p.waitForTimeout(200);
    await p.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))));
    const wall = Date.now() - t0;
    await cdp.send('Tracing.end'); await doneP;
    const agg = {};
    for (const e of evs) if (e.ph === 'X' && e.dur > 5000 && /^(UpdateLayoutTree|Layout|Paint|PrePaint|HitTest|FunctionCall|TimerFire|EvaluateScript|v8\.run|ParseHTML|Layerize|Commit|RunMicrotasks|FireAnimationFrame|v8.callFunction)$/.test(e.name)) agg[e.name] = (agg[e.name] || 0) + e.dur / 1000;
    console.log(name, 'wall', wall, Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + Math.round(v)).join(' '));
    await cdp.detach();
  }
  await b.close(); server.close();
})();
