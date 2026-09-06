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
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const display = document.getElementById('display-controls');
    if (display) display.style.display = 'block';
    const section = display?.closest('.menu-section');
    if (section) section.classList.add('hover-active');
    _placeZoom100Tick();
  });

  async function measure() {
    return page.evaluate(() => {
      const slider = document.getElementById('zoomSlider');
      const tick = document.getElementById('zoom100Tick');
      const sliderRect = slider.getBoundingClientRect();
      const tickRect = tick.getBoundingClientRect();
      const tickCenter = (tickRect.left + tickRect.right) / 2;
      const thumb = 8;
      const expectedCenter = sliderRect.left + thumb / 2 + Math.max(0, sliderRect.width - thumb) * 0.5;
      return {
        zoomText: document.getElementById('zoomVal')?.textContent,
        sliderMin: slider.min,
        sliderMax: slider.max,
        sliderValue: Number(slider.value),
        mappedZoom: _sliderToZoom(Number(slider.value)),
        tickDisplay: getComputedStyle(tick).display,
        tickOffsetPx: +(tickCenter - expectedCenter).toFixed(1)
      };
    });
  }

  const initial = await measure();

  await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '50%');
  const at50 = await measure();

  await page.locator('#zoom100Tick').click();
  await page.waitForFunction(() => document.getElementById('zoomVal')?.textContent === '100%');
  const afterTickClick = await measure();

  const afterMutatedRange = await page.evaluate(() => {
    const slider = document.getElementById('zoomSlider');
    slider.min = '3';
    slider.max = '400';
    slider.value = '50';
    updateSliderBackground(slider);
    setZoom(100);
    const sliderRect = slider.getBoundingClientRect();
    const tick = document.getElementById('zoom100Tick');
    const tickRect = tick.getBoundingClientRect();
    const tickCenter = (tickRect.left + tickRect.right) / 2;
    const thumb = 8;
    const expectedCenter = sliderRect.left + thumb / 2 + Math.max(0, sliderRect.width - thumb) * 0.5;
    return {
      zoomText: document.getElementById('zoomVal')?.textContent,
      sliderMin: slider.min,
      sliderMax: slider.max,
      sliderValue: Number(slider.value),
      tickOffsetPx: +(tickCenter - expectedCenter).toFixed(1)
    };
  });

  const failures = [];
  if (initial.tickDisplay === 'none') failures.push('100% tick is hidden');
  if (Math.abs(initial.tickOffsetPx) > 6) {
    failures.push(`100% tick is ${initial.tickOffsetPx}px from the 100% thumb`);
  }
  if (at50.zoomText !== '50%') failures.push(`zoom-out left label at ${at50.zoomText}`);
  if (afterTickClick.zoomText !== '100%' || afterTickClick.sliderValue !== 50) {
    failures.push(`tick click did not restore 100%: ${JSON.stringify(afterTickClick)}`);
  }
  if (afterMutatedRange.sliderMin !== '0' || afterMutatedRange.sliderMax !== '100') {
    failures.push(`setZoom(100) did not restore slider range: ${afterMutatedRange.sliderMin}-${afterMutatedRange.sliderMax}`);
  }
  if (Math.abs(afterMutatedRange.tickOffsetPx) > 6) {
    failures.push(`after range mutation, 100% tick is ${afterMutatedRange.tickOffsetPx}px from the 100% thumb`);
  }
  if (errors.length) failures.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({
    initial,
    at50,
    afterTickClick,
    afterMutatedRange,
    errors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
