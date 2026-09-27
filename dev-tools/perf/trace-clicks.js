// Where does a real click's time go? Wrap every addEventListener handler to time it, then
// click a name (Ctrl) and a residue (Ctrl+Alt) on rsi and list the costly handlers.
const { launch } = require('../../tests/lib/browser');
const { start } = require('../../tests/lib/static-server');
(async () => {
  const { server, baseUrl } = await start();
  const b = await launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1000 } });
  await p.addInitScript(() => {
    window.__lt = [];
    const orig = EventTarget.prototype.addEventListener;
    const wrapped = new WeakMap();
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (typeof fn !== 'function') return orig.call(this, type, fn, opts);
      let w = wrapped.get(fn);
      if (!w) {
        const self = this;
        w = function (ev) {
          const t0 = performance.now();
          try { return fn.apply(this, arguments); } finally {
            const d = performance.now() - t0;
            if (d > 3 && window.__rec) window.__lt.push({ type: ev.type, fn: fn.name || '(anon)', src: String(fn).slice(0, 90), ms: Math.round(d) });
          }
        };
        wrapped.set(fn, w);
      }
      return orig.call(this, type, w, opts);
    };
    const origRm = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function (type, fn, opts) { return origRm.call(this, type, (fn && wrapped.get(fn)) || fn, opts); };
  });
  await p.goto(baseUrl + '/index.html?url=' + encodeURIComponent('https://raw.githubusercontent.com/Toki-bio/Tal/main/rhin/alignments/rsi_subfam_input_30k.aln.fa'), { waitUntil: 'networkidle' });
  await p.waitForFunction(() => state.seqs && state.seqs.length > 100, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  if (process.env.TRACE_CSS) { await p.addStyleTag({ content: process.env.TRACE_CSS }); await p.waitForTimeout(1500); }
  const go = async (label, sel, ks) => {
    const loc = p.locator(sel).first(); await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const bb = await loc.boundingBox();
    await p.mouse.move(bb.x + 3, bb.y + bb.height / 2); await p.waitForTimeout(400);
    for (const k of ks) await p.keyboard.down(k);
    await p.evaluate(() => { window.__lt = []; window.__rec = true; window.__t0 = performance.now(); });
    const cdp = await p.context().newCDPSession(p); const evs = [];
    cdp.on('Tracing.dataCollected', d => evs.push(...d.value));
    const doneP = new Promise(res => cdp.once('Tracing.tracingComplete', res));
    await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink', transferMode: 'ReportEvents' });
    await p.mouse.down(); await p.mouse.up();
    const total = await p.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { window.__rec = false; res(Math.round(performance.now() - window.__t0)); }))));
    await cdp.send('Tracing.end'); await doneP;
    const agg = {};
    for (const e of evs) if (e.ph === 'X' && e.dur > 2000) { agg[e.name] = (agg[e.name] || 0) + e.dur / 1000; }
    console.log(label, Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + '=' + Math.round(v)).join(' '));
    for (const k of ks.slice().reverse()) await p.keyboard.up(k);
    const lt = await p.evaluate(() => window.__lt);
    console.log(label, 'total', total, JSON.stringify(lt, null, 0));
  };
  await go('rowCtrl', '.seq-line[data-seq-index="3"] > .seq-name', ['Control']);
  await go('rowCtrl2', '.seq-line[data-seq-index="5"] > .seq-name', ['Control']);
  await go('colCtrlAlt', '.seq-line[data-seq-index="3"] .seq-data span[data-pos="12"]', ['Control', 'Alt']);
  await go('colCtrlAlt2', '.seq-line[data-seq-index="3"] .seq-data span[data-pos="14"]', ['Control', 'Alt']);
  await b.close(); server.close();
})();
