// Scroll cost of the windowed DOM renderer (Full or Block mode) on one alignment:
// per-step wall time, refresh JS time, DOM churn, block replacements, frame gaps during
// continuous scrolling, and a content check of every rendered row afterwards.
//
//   node measure_scroll_windowed.js <single|blocks> <alignment url> <nSeq> [port]
//
// <alignment url> is fetched by the viewer: an http(s) URL, or a path relative to the
// repo root (this script serves the repo root on <port>, default 3019). Examples:
//   node measure_scroll_windowed.js blocks /oma_test.fas 621
//   node measure_scroll_windowed.js single https://raw.githubusercontent.com/Toki-bio/Tal/main/sicista/mito/alignments/sicista_mitogenomes.aln.fa 62
// Env: DUMP=1 prints every step; NOOP=1 replaces the scroll refresh by a no-op (what the
// browser costs with no renderer work at all); INJECT_CSS='...' adds a style sheet first.
const path = require('path');
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const mode = process.argv[2] || 'single';
const ALN = process.argv[3] || '/oma_test.fas';
// A leading slash is rewritten to a Windows path by Git Bash (MSYS), so a served path may be given
// without it: 'oma_test.fas' means '/oma_test.fas'.
const ALN_URL = /^https?:/.test(ALN) || ALN.startsWith('/') ? ALN : '/' + ALN;
const NSEQ = +(process.argv[4] || 621);
const PORT = +(process.argv[5] || 3019);
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
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
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
  if (process.env.NOOP) { await page.evaluate(() => { window._refreshUnifiedWindowOnScroll = function () {}; }); console.log('refresh no-op'); }
  const info = await page.evaluate(() => {
    const cont = document.getElementById('alignmentContainer');
    const row0 = cont.querySelector('.seq-line[data-seq-index="0"] .seq-data');
    return { blocks: cont.querySelectorAll('.block-block').length, rows: cont.querySelectorAll('.seq-line').length, spansRow0: row0 ? row0.childElementCount : -1,
      totalSpans: cont.querySelectorAll('.seq-data > *').length, scrollWidth: cont.scrollWidth, clientWidth: cont.clientWidth, scrollHeight: cont.scrollHeight, clientHeight: cont.clientHeight,
      single: document.getElementById('modeSingle')?.checked, blockWidth: _unifiedWindowRenderParams?.blockWidth };
  });
  console.log(`[${mode}] initial`, JSON.stringify(info));
  await page.evaluate(() => {
    const cont = document.getElementById('alignmentContainer');
    window.__m = { steps: [], added: 0, removed: 0 };
    new MutationObserver(muts => { for (const m of muts) { window.__m.added += m.addedNodes.length; window.__m.removed += m.removedNodes.length; } }).observe(cont, { childList: true, subtree: true });
    const orig = _refreshUnifiedWindowOnScroll;
    window._refreshUnifiedWindowOnScroll = function (c) { const t0 = performance.now(); const b0 = c.querySelector('.block-block'); orig(c); const b1 = c.querySelector('.block-block'); window.__m.steps.push({ ms: +(performance.now() - t0).toFixed(1), blockReplaced: b0 !== b1 }); };
    window.__cont = cont;
  });
  const axis = mode === 'single' ? 'scrollLeft' : 'scrollTop';
  const step = mode === 'single' ? 120 : 300;
  const stepRes = [];
  for (let i = 0; i < 40; i++) {
    const r = await page.evaluate(async ({ axis, step }) => {
      const c = window.__cont; const a0 = window.__m.added, r0 = window.__m.removed, n0 = window.__m.steps.length;
      const t0 = performance.now();
      c[axis] += step;
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 0))));
      const st = window.__m.steps.slice(n0);
      return { refreshes: st.length, ms: st.reduce((s, x) => s + x.ms, 0), wall: +(performance.now() - t0).toFixed(0), replaced: st.some(x => x.blockReplaced), added: window.__m.added - a0, removed: window.__m.removed - r0 };
    }, { axis, step });
    stepRes.push(r);
  }
  if (process.env.DUMP) console.log(`[${mode}] per step (wall/refresh/added/removed):`, stepRes.map(s => `${s.wall}/${s.ms}/${s.added}/${s.removed}`).join(' '));
  const srt = k => stepRes.map(s => s[k]).sort((a, b) => a - b);
  const ms = srt('ms'), wall = srt('wall');
  console.log(`[${mode}] 40 steps of ${step}px: refresh ms/step median ${ms[20]} p90 ${ms[36]} max ${ms[39]} | wall ms/step (incl. layout+paint): median ${wall[20]} p90 ${wall[36]} max ${wall[39]}`);
  console.log(`[${mode}]   block element replaced on ${stepRes.filter(s => s.replaced).length}/40 steps; DOM nodes added/removed per step: median ${srt('added')[20]}/${srt('removed')[20]}, max ${srt('added')[39]}/${srt('removed')[39]}`);
  const jank = await page.evaluate(async ({ axis }) => {
    const c = window.__cont; c[axis] = 1000;
    const gaps = []; let last = performance.now(); let run = true;
    (function tick() { const t = performance.now(); gaps.push(t - last); last = t; if (run) requestAnimationFrame(tick); })();
    for (let i = 0; i < 90; i++) { c[axis] += 30; await new Promise(res => setTimeout(res, 16)); }
    run = false; await new Promise(res => setTimeout(res, 50)); gaps.shift();
    return { frames: gaps.length, meanGapMs: (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1), maxGapMs: Math.max(...gaps).toFixed(0), framesOver33ms: gaps.filter(g => g > 33).length, framesOver100ms: gaps.filter(g => g > 100).length };
  }, { axis });
  console.log(`[${mode}] continuous (90 x 30px at 16ms):`, JSON.stringify(jank));
  await page.waitForTimeout(600);   // let chunked follow-up work finish before checking content
  const ok = await page.evaluate(() => {
    const c = window.__cont; const cw = _measureUnifiedColumnMetrics(null).charWidthPx;
    const rows = [...c.querySelectorAll('.seq-line[data-seq-index]')].filter(r => +r.dataset.seqIndex >= 0 && +r.dataset.seqIndex < state.seqs.length);
    const perBlock = new Map(); let dups = 0, bad = 0, checked = 0, padBad = 0, orderBad = 0;
    for (const r of rows) {
      const i = +r.dataset.seqIndex; const b = r.closest('.block-block')?.dataset.blockIndex || '0';
      const k = b + ':' + i; if (perBlock.has(k)) dups++; perBlock.set(k, 1);
      const d = r.querySelector('.seq-data'); const spans = [...d.querySelectorAll(':scope > span[data-pos]')];
      if (!spans.length) continue;
      const first = +spans[0].dataset.pos; const txt = spans.map(s => s.textContent).join('');
      const exp = state.seqs[i].seq.slice(first, first + txt.length);
      checked += txt.length; if (exp !== txt) bad++;
      for (let j = 1; j < spans.length; j++) if (+spans[j].dataset.pos !== first + j) { orderBad++; break; }
      const pad = parseFloat(d.style.paddingLeft || '0'); const bw = _unifiedWindowRenderParams?.blockWidth || 0;
      const expectedPad = (first - (+b) * bw) * cw;
      if (d.style.paddingLeft && Math.abs(pad - expectedPad) > 0.6) padBad++;
    }
    return { rows: rows.length, residuesChecked: checked, rowsWithWrongText: bad, duplicateRows: dups, rowsWithNonContiguousPos: orderBad, rowsWithWrongPadding: padBad };
  });
  console.log(`[${mode}] content check after scrolling:`, JSON.stringify(ok));
  await browser.close(); srv.kill();
})().catch(e => { console.error(e); process.exit(1); });
