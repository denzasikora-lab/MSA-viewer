// Chrome trace of 12 scroll steps on the windowed DOM renderer: time by category
// (script, style, layout, paint...), the script functions that ran, layouts forced from
// script, and the layer tree's view of the alignment container (is it a composited
// scroller, what else is composited).
//
//   node trace_scroll_windowed.js <single|blocks> <alignment url> <nSeq> [port]
//
// Same arguments and INJECT_CSS env as measure_scroll_windowed.js. Note: with the
// LayerTree domain enabled, absolute paint times are inflated; compare counts, not ms.
const path = require('path');
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const mode = process.argv[2] || 'blocks';
const ALN = process.argv[3] || '/oma_test.fas';
// A leading slash is rewritten to a Windows path by Git Bash (MSYS), so a served path may be given
// without it: 'oma_test.fas' means '/oma_test.fas'.
const ALN_URL = /^https?:/.test(ALN) || ALN.startsWith('/') ? ALN : '/' + ALN;
const NSEQ = +(process.argv[4] || 621); const PORT = +(process.argv[5] || 3019);
const ROOT = path.resolve(__dirname, '..', '..');
// Poll with evaluate: page.waitForFunction did not resolve on this app for some files.
async function waitFor(page, fn, arg, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(250); }
  throw new Error('waitFor timed out: ' + fn.toString().slice(0, 120));
}
(async () => {
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://localhost:${PORT}/index.html?url=${encodeURIComponent(ALN_URL)}&title=t`, { waitUntil: 'load' });
  await waitFor(page, () => typeof state !== 'undefined' && state.seqs && state.seqs.length > 0, null, 120000);
  { const n = await page.evaluate(() => state.seqs.length); if (n !== NSEQ) console.log(`note: ${n} sequences loaded (expected ${NSEQ})`); }
  await page.waitForTimeout(1000);
  // Force the requested DOM mode: tall alignments open in Canvas by default, and the
  // "large alignment" dialog awaits a click, so answer it from here.
  await page.evaluate((m) => { window.showLargeAlignmentDialog = async () => 'proceed'; document.getElementById('modeCanvas').checked = false; document.getElementById('modeSingle').checked = (m === 'single'); document.getElementById('modeBlocks').checked = (m === 'blocks'); return onModeChange(); }, mode);
  await waitFor(page, () => document.querySelector('.block-block'), null, 120000);
  if (mode === 'single') await waitFor(page, () => { const c = document.getElementById('alignmentContainer'); return c.scrollWidth > c.clientWidth + 1000; }, null, 120000);
  await page.waitForTimeout(1200);
  if (process.env.INJECT_CSS) { await page.evaluate(css => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }, process.env.INJECT_CSS); await page.waitForTimeout(500); console.log('injected:', process.env.INJECT_CSS); }
  const cdp = await page.context().newCDPSession(page);
  let layers = null; cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; });
  await cdp.send('DOM.enable'); await cdp.send('DOM.getDocument', { depth: 0 });
  await cdp.send('LayerTree.enable');
  const events = [];
  cdp.on('Tracing.dataCollected', d => events.push(...d.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack', transferMode: 'ReportEvents' });
  const axis = mode === 'single' ? 'scrollLeft' : 'scrollTop'; const step = mode === 'single' ? 120 : 300;
  await page.evaluate(async ({ axis, step }) => {
    const c = document.getElementById('alignmentContainer'); c[axis] = 500;
    for (let i = 0; i < 12; i++) { c[axis] += step; await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 30)))); }
  }, { axis, step });
  await cdp.send('Tracing.end');
  await new Promise(r => cdp.once('Tracing.tracingComplete', r));
  const agg = {};
  for (const e of events) {
    if (e.ph !== 'X' || !e.dur) continue;
    const n = e.name; if (!['Layout', 'UpdateLayoutTree', 'Paint', 'FunctionCall', 'HitTest', 'PrePaint', 'Layerize', 'Commit', 'TimerFire', 'EventDispatch', 'MinorGC', 'MajorGC', 'ParseHTML'].includes(n)) continue;
    agg[n] = agg[n] || { ms: 0, n: 0, max: 0 }; agg[n].ms += e.dur / 1000; agg[n].n++; agg[n].max = Math.max(agg[n].max, e.dur / 1000);
  }
  console.log(`[${mode}] 12 scroll steps, trace totals:\n  ` + Object.entries(agg).sort((a, b) => b[1].ms - a[1].ms).map(([k, v]) => `${k.padEnd(18)} total ${v.ms.toFixed(0).padStart(5)} ms  n=${String(v.n).padStart(4)}  max ${v.max.toFixed(0)} ms`).join('\n  '));
  const fc = {};
  for (const e of events) { if (e.name !== 'FunctionCall' || e.ph !== 'X') continue; const d = e.args?.data || {}; const k = (d.functionName || '?') + ' @' + String(d.url || '').split('/').pop() + ':' + (d.lineNumber ?? '?'); fc[k] = fc[k] || { ms: 0, n: 0 }; fc[k].ms += e.dur / 1000; fc[k].n++; }
  console.log('  top FunctionCall sites:\n    ' + Object.entries(fc).sort((a, b) => b[1].ms - a[1].ms).slice(0, 8).map(([k, v]) => `${v.ms.toFixed(0).padStart(5)} ms n=${String(v.n).padStart(3)}  ${k}`).join('\n    '));
  const lays = events.filter(e => e.name === 'Layout' && e.ph === 'X');
  const forced = lays.filter(e => e.args?.beginData?.stackTrace?.length);
  console.log(`  Layout events ${lays.length} (dirty objects: ${lays.map(e => e.args?.beginData?.dirtyObjects).join(',')}), forced from JS: ${forced.length}; forcing frames:`, [...new Set(forced.map(e => e.args.beginData.stackTrace.slice(0, 3).map(f => f.functionName + ':' + f.lineNumber).join(' < ')))].slice(0, 8).join(' | ') || 'none');
  const rs = events.filter(e => e.name === 'UpdateLayoutTree' && e.ph === 'X' && e.args?.beginData?.stackTrace?.length).map(e => e.args.beginData.stackTrace.slice(0, 2).map(f => f.functionName + ':' + f.lineNumber).join(' < '));
  console.log('  style recalc forced from JS:', [...new Set(rs)].slice(0, 8).join(' | ') || 'none');
  // Paint events are per document (layerId 0), so their clip only says how much was painted.
  const paints = events.filter(e => e.name === 'Paint' && e.ph === 'X').map(e => (e.args?.data?.clip || []).join(',')).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  console.log('  paint clip rects (count x rect):', Object.entries(paints).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${v}x[${k}]`).join('  '));
  if (layers) {
    for (const l of layers) {
      let reasons = []; try { reasons = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasons || []; } catch (e) {}
      if (!reasons.length) continue;
      let desc = 'node ' + l.backendNodeId;
      try { const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: l.backendNodeId }); const r = await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: `function(){ return this.tagName+'#'+this.id+'.'+String(this.className).slice(0,40); }`, returnByValue: true }); desc = r.result.value; } catch (e) {}
      console.log(`  layer ${l.layerId} ${desc} ${l.width}x${l.height} drawsContent=${l.drawsContent} [${reasons.join('; ')}]`);
    }
  }
  await browser.close(); srv.kill();
})().catch(e => { console.error(e); process.exit(1); });
