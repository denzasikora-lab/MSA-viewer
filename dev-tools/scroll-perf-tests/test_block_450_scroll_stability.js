const { chromium } = require('playwright-core');

(async () => {
  const baseUrl = process.env.VIEWALIGN_BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
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

  await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '50%');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const container = document.getElementById('alignmentContainer');
    container.scrollTop = _unifiedBlockHeightPx * 2 + 20;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: __dirname + '/block_450_partial_blank.png' });

  const blockCheck = await page.evaluate(() => {
    const inspectBlock = blockIndex => {
      const block = document.querySelector(`.block-block[data-block-index="${blockIndex}"]`);
      const row = block?.querySelector('.seq-line[data-seq-index] .seq-data');
      const spans = row ? [...row.querySelectorAll('span[data-pos]')] : [];
      return {
        blockIndex,
        exists: !!block,
        firstPosition: spans.length ? Number(spans[0].dataset.pos) : null,
        lastPosition: spans.length ? Number(spans[spans.length - 1].dataset.pos) : null,
        renderedColumns: spans.length,
        declaredWidth: row?.getBoundingClientRect().width ?? null,
        textWidth: spans.length
          ? spans[spans.length - 1].getBoundingClientRect().right -
            spans[0].getBoundingClientRect().left
          : null
      };
    };
    return {
      viewportWidth: document.getElementById('alignmentContainer').clientWidth,
      blockWidth: Number(document.getElementById('blockSizeSlider').value),
      charWidth: _unifiedCharWidthPx,
      block2: inspectBlock(2),
      block3: inspectBlock(3)
    };
  });

  const scrollSamples = await page.evaluate(async () => {
    const container = document.getElementById('alignmentContainer');
    container.scrollTop = 0;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const samples = [];
    for (let i = 0; i < 12; i++) {
      const requested = container.scrollTop + 300;
      const started = performance.now();
      container.scrollTop = requested;
      await new Promise(resolve => requestAnimationFrame(resolve));
      const afterFirstFrame = container.scrollTop;
      await new Promise(resolve => requestAnimationFrame(resolve));
      const afterSecondFrame = container.scrollTop;
      samples.push({
        requested,
        afterFirstFrame,
        afterSecondFrame,
        frameMs: +(performance.now() - started).toFixed(1)
      });
    }
    return samples;
  });

  const failures = [];
  if (blockCheck.block2.renderedColumns !== blockCheck.blockWidth) {
    failures.push(
      `position-450 block rendered ${blockCheck.block2.renderedColumns}/${blockCheck.blockWidth} columns`
    );
  }

  const afterHorizontalPan = await page.evaluate(() => {
    const inspectBlock = blockIndex => {
      const block = document.querySelector(`.block-block[data-block-index="${blockIndex}"]`);
      const row = block?.querySelector('.seq-line[data-seq-index] .seq-data');
      const spans = row ? [...row.querySelectorAll('span[data-pos]')] : [];
      return {
        blockIndex,
        renderedColumns: spans.length,
        firstPosition: spans.length ? Number(spans[0].dataset.pos) : null,
        lastPosition: spans.length ? Number(spans[spans.length - 1].dataset.pos) : null
      };
    };
    const container = document.getElementById('alignmentContainer');
    container.scrollLeft = 12000;
    container.scrollTop = _unifiedBlockHeightPx * 2 + 20;
    return {
      scrollLeft: container.scrollLeft,
      block2: inspectBlock(2)
    };
  });
  await page.waitForTimeout(300);
  const afterHorizontalPanSettled = await page.evaluate(() => {
    const block = document.querySelector('.block-block[data-block-index="2"]');
    const row = block?.querySelector('.seq-line[data-seq-index] .seq-data');
    const spans = row ? [...row.querySelectorAll('span[data-pos]')] : [];
    return {
      renderedColumns: spans.length,
      firstPosition: spans.length ? Number(spans[0].dataset.pos) : null,
      lastPosition: spans.length ? Number(spans[spans.length - 1].dataset.pos) : null,
      blockWidth: Number(document.getElementById('blockSizeSlider').value)
    };
  });
  const minColumnsAfterPan = Math.min(afterHorizontalPanSettled.blockWidth, 40);
  if (afterHorizontalPanSettled.renderedColumns < minColumnsAfterPan) {
    failures.push(
      `after horizontal pan, block 2 rendered ${afterHorizontalPanSettled.renderedColumns}/${afterHorizontalPanSettled.blockWidth} columns`
    );
  }

  for (const sample of scrollSamples) {
    if (Math.abs(sample.afterSecondFrame - sample.requested) > 2) {
      failures.push(
        `scroll adjusted ${sample.requested} -> ${sample.afterSecondFrame}`
      );
    }
  }
  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    blockCheck,
    afterHorizontalPan,
    afterHorizontalPanSettled,
    scrollSamples,
    errors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
