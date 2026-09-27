// content-visibility on rows: is anything the user sees or the code measures different?
// For each file x mode: record geometry and screenshots at top / middle / bottom with the
// feature on, then switch it off (content-visibility: visible) and record again.
const fs = require('fs');
const { launch } = require('../../tests/lib/browser');
const { start } = require('../../tests/lib/static-server');
const OFF = '.block-block.cv-block .seq-line > .seq-data { content-visibility: visible !important; contain-intrinsic-size: none !important; }';
const RSI = 'https://raw.githubusercontent.com/Toki-bio/Tal/main/rhin/alignments/rsi_subfam_input_30k.aln.fa';
(async () => {
  const { server, baseUrl } = await start();
  const b = await launch();
  const results = {};
  for (const [fid, src] of [['svk', 'examples/svk_k4.fa'], ['rsi', RSI]]) {
    for (const mode of ['modeBlocks', 'modeSingle']) {
      const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
      if (src.startsWith('http')) {
        await p.goto(baseUrl + '/index.html?url=' + encodeURIComponent(src), { waitUntil: 'networkidle' });
        await p.waitForFunction(() => state.seqs && state.seqs.length > 100, null, { timeout: 120000 });
      } else {
        await p.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
        await p.setInputFiles('#fileInput', src);
      }
      await p.waitForTimeout(2000);
      await p.evaluate((m) => { const r = document.getElementById(m); if (!r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } }, mode);
      await p.waitForTimeout(2500);
      const geo = () => p.evaluate(() => {
        const c = document.getElementById('alignmentContainer');
        const lines = [...c.querySelectorAll('.seq-line:not(.scale-ruler-line)')];
        const pick = [0, 1, Math.floor(lines.length / 2), lines.length - 2, lines.length - 1].filter(i => i >= 0 && i < lines.length);
        return {
          cvBlocks: c.querySelectorAll('.cv-block').length,
          docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth,
          cH: c.scrollHeight, cW: c.scrollWidth,
          rows: pick.map(i => { const r = lines[i].getBoundingClientRect(); const d = lines[i].querySelector('.seq-data').getBoundingClientRect(); return [i, Math.round(r.top + scrollY), Math.round(r.height * 10) / 10, Math.round(d.width * 10) / 10]; }),
        };
      });
      const shots = async () => {
        const out = [];
        for (const f of [0, 0.5, 1]) {
          await p.evaluate((f) => { const H = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, Math.round(H * f)); const c = document.getElementById('alignmentContainer'); c.scrollTop = Math.round((c.scrollHeight - c.clientHeight) * f); c.scrollLeft = Math.round((c.scrollWidth - c.clientWidth) * f); }, f);
          await p.waitForTimeout(700);
          out.push(await p.screenshot());
        }
        return out;
      };
      const gOn = await geo(); const sOn = await shots();
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.addStyleTag({ content: OFF }); await p.waitForTimeout(1500);
      const gOff = await geo(); const sOff = await shots();
      const same = sOn.map((x, i) => x.equals(sOff[i]));
      sOn.forEach((x, i) => { if (!same[i]) { fs.writeFileSync(`_cvv_${fid}_${mode}_${i}_on.png`, x); fs.writeFileSync(`_cvv_${fid}_${mode}_${i}_off.png`, sOff[i]); } });
      results[fid + ':' + mode] = { geoSame: JSON.stringify({ ...gOn, cvBlocks: 0 }) === JSON.stringify({ ...gOff, cvBlocks: 0 }), cvBlocks: gOn.cvBlocks, shotsSame: same, ...(JSON.stringify({ ...gOn, cvBlocks: 0 }) === JSON.stringify({ ...gOff, cvBlocks: 0 }) ? {} : { gOn, gOff }) };
      await p.close();
    }
  }
  console.log(JSON.stringify(results, null, 1));
  await b.close(); server.close();
})();
