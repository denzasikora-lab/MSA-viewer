const { chromium } = require('playwright-core');

(async () => {
  const baseUrl = process.env.VIEWALIGN_BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto(`${baseUrl}/?url=/oma_test.fas&title=oma%20grp080`, {
    waitUntil: 'load',
    timeout: 60000
  });
  await page.waitForFunction(
    () => typeof state !== 'undefined' && state.seqs?.length > 0,
    null,
    { timeout: 60000 }
  );
  await page.waitForTimeout(500);

  async function measure(label) {
    return page.evaluate(currentLabel => {
      const container = document.getElementById('alignmentContainer');
      const containerRect = container.getBoundingClientRect();
      const rows = [...container.querySelectorAll('.seq-line[data-seq-index]')]
        .filter(row => Number(row.dataset.seqIndex) >= 0);
      const visibleRows = rows.filter(row => {
        const rect = row.getBoundingClientRect();
        return rect.bottom > containerRect.top && rect.top < containerRect.bottom;
      });
      const lastVisibleRow = visibleRows[visibleRows.length - 1];
      return {
        label: currentLabel,
        buildTag: typeof BUILD_TAG !== 'undefined' ? BUILD_TAG : null,
        zoomText: document.getElementById('zoomVal')?.textContent,
        container: {
          clientHeight: container.clientHeight,
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop
        },
        cached: {
          rowHeight: typeof _unifiedRowHeightPx !== 'undefined' ? _unifiedRowHeightPx : null,
          blockHeight: typeof _unifiedBlockHeightPx !== 'undefined' ? _unifiedBlockHeightPx : null
        },
        rendered: {
          visibleRows: visibleRows.length,
          firstIndex: rows[0] ? Number(rows[0].dataset.seqIndex) : null,
          lastVisibleIndex: lastVisibleRow ? Number(lastVisibleRow.dataset.seqIndex) : null,
          actualRowHeight: rows[0]?.getBoundingClientRect().height ?? null,
          blankBelowRows: lastVisibleRow
            ? Math.max(0, containerRect.bottom - lastVisibleRow.getBoundingClientRect().bottom)
            : containerRect.height
        }
      };
    }, label);
  }

  const before = await measure('before zoom');
  await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '50%');
  const afterZoomHandler = await measure('immediately after zoom handler');
  await page.waitForTimeout(200);
  const afterZoom = await measure('after zoom 50 settled');
  await page.screenshot({ path: __dirname + '/zoom_50_before_scroll.png' });

  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  const afterWheel = await measure('after wheel');
  await page.screenshot({ path: __dirname + '/zoom_50_after_scroll.png' });

  await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.value = '100';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '200%');
  const afterZoom200 = await measure('Block at 200%');

  await page.evaluate(async () => {
    document.getElementById('modeSingle').checked = true;
    await onModeChange();
  });
  await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '50%');
  const fullAtZoom50 = await measure('Full at 50%');

  const contentCheck = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#alignmentContainer .seq-line[data-seq-index]')]
      .filter(row => Number(row.dataset.seqIndex) >= 0);
    const indices = rows.map(row => Number(row.dataset.seqIndex));
    const duplicates = indices.filter((index, position) => indices.indexOf(index) !== position);
    const mismatches = [];
    for (const row of rows.slice(0, 30)) {
      const index = Number(row.dataset.seqIndex);
      const spans = [...row.querySelectorAll('.seq-data span[data-pos]')];
      if (!spans.length) continue;
      const firstPosition = Number(spans[0].dataset.pos);
      const rendered = spans.map(span => span.textContent).join('');
      const expected = state.seqs[index].seq.slice(firstPosition, firstPosition + rendered.length);
      if (rendered !== expected) mismatches.push(index);
    }
    return { duplicateCount: duplicates.length, mismatchCount: mismatches.length };
  });

  const failures = [];
  for (const measurement of [afterZoomHandler, afterZoom, afterWheel, afterZoom200, fullAtZoom50]) {
    if (measurement.rendered.blankBelowRows > 40) {
      failures.push(
        `${measurement.label} leaves ${measurement.rendered.blankBelowRows}px blank below rendered rows`
      );
    }
    if (Math.abs(measurement.cached.rowHeight - measurement.rendered.actualRowHeight) > 1) {
      failures.push(
        `${measurement.label}: cached row height ${measurement.cached.rowHeight}px does not match actual ${measurement.rendered.actualRowHeight}px`
      );
    }
  }
  if (contentCheck.duplicateCount || contentCheck.mismatchCount) {
    failures.push(`content check failed: ${JSON.stringify(contentCheck)}`);
  }
  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    before,
    afterZoomHandler,
    afterZoom,
    afterWheel,
    afterZoom200,
    fullAtZoom50,
    contentCheck,
    errors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
