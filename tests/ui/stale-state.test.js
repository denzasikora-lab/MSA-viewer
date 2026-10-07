// Results computed on one alignment must not be drawn on another: the 2D block
// overlay, group colours and the Groups menu are dropped when a different file
// is loaded or the alignment is realigned, and Codon analysis left on from a
// nucleotide file is switched off for a protein one.
//
//   node tests/ui/stale-state.test.js
const path = require('path');
const { start } = require('../lib/static-server');
const { findChrome } = require('../lib/browser');
const { chromium } = require('playwright-core');
const ROOT = path.join(__dirname, '..', '..');

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failed++; };

const SNAP = () => ({
  layers: document.querySelectorAll('.block-mask-layer').length,
  mask: !!state.blockMask,
  bicluster: !!state._biclusterRaw,
  groups: !!(state.clusterResults && state.clusterResults.clusters && state.clusterResults.clusters.length),
  groupsMenu: !document.getElementById('groups-menu-section').classList.contains('ge-menu-off'),
  codon: document.getElementById('codonAnalysis').checked,
  message: document.getElementById('statusMessage').textContent,
});

(async () => {
  const { server, baseUrl } = await start();
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
  const open = async (rel) => { await page.setInputFiles('#fileInput', path.join(ROOT, rel)); await page.waitForTimeout(1500); };
  const analyse = async () => {
    await page.evaluate(() => document.getElementById('clusterGuideTreeButton').click());
    await page.waitForFunction(() => state.clusterResults && state.clusterResults.clusters, null, { timeout: 30000 });
    await page.evaluate(() => document.getElementById('biclusterComputeButton').click());
    await page.waitForFunction(() => document.querySelectorAll('.block-mask-layer').length > 0, null, { timeout: 30000 });
    await page.evaluate(() => ['clusteringModal'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; }));
  };

  // 1. a different file
  await open('examples/svk_k4.fa');
  await analyse();
  let s = await page.evaluate(SNAP);
  check(s.layers > 0 && s.mask && s.groups && s.groupsMenu, `setup: overlay, groups and Groups menu shown (${JSON.stringify(s)})`);
  await open('examples/real/bp_DOA_prot.msf');
  s = await page.evaluate(SNAP);
  check(s.layers === 0 && !s.mask && !s.bicluster, 'new file: 2D overlay gone');
  check(!s.groups, 'new file: group colours gone');
  check(!s.groupsMenu, 'new file: Groups menu hidden');

  // 2. realign
  await open('examples/svk_k4.fa');
  await analyse();
  await page.evaluate(() => document.getElementById('realignAllButton').click());
  await page.waitForFunction(() => /Aligned \d+ sequences/.test(document.getElementById('statusMessage').textContent), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  s = await page.evaluate(SNAP);
  check(s.layers === 0 && !s.mask && !s.bicluster && !s.groups && !s.groupsMenu, `Realign All: overlay, groups and Groups menu dropped (${JSON.stringify(s)})`);
  check(/cleared: the alignment changed/.test(s.message), `Realign All: says why ("${s.message}")`);

  // 3. codon analysis carried over to a protein file
  await open('examples/synthetic/synth_msa.fa');
  await page.evaluate(() => document.getElementById('codonAnalysis').click());
  await page.waitForTimeout(800);
  check((await page.evaluate(SNAP)).codon, 'setup: codon analysis on for a nucleotide file');
  await open('examples/real/bp_DOA_prot.msf');
  s = await page.evaluate(SNAP);
  check(!s.codon, 'protein file: codon analysis switched off');
  check(!/requires a nucleotide/.test(s.message), `protein file: no codon warning ("${s.message}")`);

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
