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

  async function inspect(label) {
    return page.evaluate(currentLabel => {
      const alignment = document.getElementById('alignmentContainer');
      const bar = document.querySelector('.vertical-scrollbar');
      const alignmentRect = alignment.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      return {
        label: currentLabel,
        mode: document.getElementById('modeCanvas')?.checked ? 'Canvas'
          : document.getElementById('modeSingle')?.checked ? 'Full' : 'Block',
        barDisplay: getComputedStyle(bar).display,
        barRect: {
          left: barRect.left,
          right: barRect.right,
          top: barRect.top,
          height: barRect.height
        },
        alignmentRect: {
          right: alignmentRect.right,
          top: alignmentRect.top,
          height: alignmentRect.height
        },
        barScrollTop: bar.scrollTop,
        barScrollHeight: bar.scrollHeight,
        barClientHeight: bar.clientHeight,
        alignmentScrollTop: alignment.scrollTop,
        alignmentScrollHeight: alignment.scrollHeight,
        alignmentClientHeight: alignment.clientHeight,
        canvasOffsetY: typeof _canvasState !== 'undefined' ? _canvasState.offsetY : null
      };
    }, label);
  }

  const initial = await inspect('Block initial');
  await page.evaluate(() => {
    const bar = document.querySelector('.vertical-scrollbar');
    bar.scrollTop = 600;
    bar.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(200);
  const afterBarScroll = await inspect('Block after bar scroll');

  await page.evaluate(() => {
    const alignment = document.getElementById('alignmentContainer');
    alignment.scrollTop = 1200;
    alignment.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(200);
  const afterAlignmentScroll = await inspect('Block after alignment scroll');

  const barBox = await page.locator('.vertical-scrollbar').boundingBox();
  await page.mouse.move(barBox.x + 4, barBox.y + 500);
  await page.mouse.down();
  await page.mouse.move(barBox.x + 4, barBox.y + 400, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterPointerDrag = await inspect('Block after pointer drag');

  await page.evaluate(async () => {
    document.getElementById('modeSingle').checked = true;
    await onModeChange();
  });
  await page.waitForTimeout(200);
  const full = await inspect('Full');

  await page.evaluate(async () => {
    document.getElementById('modeCanvas').checked = true;
    await onModeChange();
  });
  await page.waitForTimeout(200);
  const canvas = await inspect('Canvas');
  await page.screenshot({ path: __dirname + '/vertical_scrollbar.png' });

  const failures = [];
  for (const state of [initial, afterBarScroll, afterAlignmentScroll, afterPointerDrag, full, canvas]) {
    if (state.barDisplay === 'none') failures.push(`${state.label}: scrollbar hidden`);
    if (state.barScrollHeight <= state.barClientHeight) {
      failures.push(`${state.label}: scrollbar has no scrollable range`);
    }
    if (Math.abs(state.barRect.right - state.alignmentRect.right) > 2) {
      failures.push(`${state.label}: scrollbar is not aligned to right edge`);
    }
    if (Math.abs(state.barRect.top - state.alignmentRect.top) > 2) {
      failures.push(`${state.label}: scrollbar top is misaligned`);
    }
    if (Math.abs(state.barRect.height - state.alignmentRect.height) > 2) {
      failures.push(`${state.label}: scrollbar height is misaligned`);
    }
  }
  for (const state of [afterBarScroll, afterAlignmentScroll, afterPointerDrag, full]) {
    if (Math.abs(state.barScrollTop - state.alignmentScrollTop) > 2) {
      failures.push(
        `${state.label}: bar ${state.barScrollTop} is not synchronized with alignment ${state.alignmentScrollTop}`
      );
    }
  }
  if (afterPointerDrag.alignmentScrollTop <= afterAlignmentScroll.alignmentScrollTop + 20) {
    failures.push(
      `DOM pointer drag did not move alignment: ${afterAlignmentScroll.alignmentScrollTop} -> ${afterPointerDrag.alignmentScrollTop}`
    );
  }
  if (afterPointerDrag.canvasOffsetY !== afterAlignmentScroll.canvasOffsetY) {
    failures.push(
      `DOM pointer drag incorrectly changed Canvas offset: ${afterAlignmentScroll.canvasOffsetY} -> ${afterPointerDrag.canvasOffsetY}`
    );
  }
  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    initial,
    afterBarScroll,
    afterAlignmentScroll,
    afterPointerDrag,
    full,
    canvas,
    errors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
