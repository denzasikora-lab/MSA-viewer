// Correctness checks for the pre-submission audit fixes: consensus, parsers,
// exports and rendering. Each check loads input through the app's real entry
// points in headless Chromium and asserts the exact expected output.
//
//   node tests/correctness/run.js
//   CHECK_FILTER=consensus node tests/correctness/run.js
const { start } = require('../lib/static-server');
const { launch, loadFasta } = require('../lib/browser');

const CHECKS = [];
function check(name, fn) { CHECKS.push({ name, fn }); }

// Load text through the file picker (format auto-detection, as a user would)
async function openText(page, name, text) {
  await page.setInputFiles('#fileInput', { name, mimeType: 'text/plain', buffer: Buffer.from(text) });
  await page.waitForFunction(() => window.state && state.seqs && state.seqs.length > 0, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  return page.evaluate(() => ({
    names: state.seqs.map(s => s.header),
    seqs: state.seqs.map(s => s.seq),
    message: document.getElementById('statusMessage')?.textContent || document.getElementById('message')?.textContent || '',
  }));
}

// ---------- consensus ----------

async function consensusFor(page, fasta, { threshold = 50, type = 'normal', fallback = 'gap', coverage = 0 } = {}) {
  await loadFasta(page, fasta);
  return page.evaluate(({ threshold, type, fallback, coverage }) => {
    setConsensusThresholdUI(threshold);
    document.querySelector(`input[name="consensusType"][value="${type}"]`).checked = true;
    document.getElementById('consensusFallback').value = fallback;
    const cov = document.getElementById('consensusMinCoverage');
    if (cov) cov.value = coverage;
    return computeConsensusForSequences(state.seqs.map(s => s.seq));
  }, { threshold, type, fallback, coverage });
}

const fa = rows => rows.map((s, i) => `>s${i + 1}\n${s}\n`).join('');

check('consensus: protein majority residue wins (not the most frequent of A/C/G/T)', async (page) => {
  const got = await consensusFor(page, fa(['MLKWVA', 'MLKWVA', 'MLKWVT', 'MAKWVG', 'MAKWCG']), { threshold: 50 });
  return { pass: got === 'MLKWV-', detail: got };
});

check('consensus: L,L,L,A at 70% is L', async (page) => {
  const got = await consensusFor(page, fa(['L', 'L', 'L', 'A']), { threshold: 70 });
  return { pass: got === 'L', detail: got };
});

check('consensus: N,N,N,A at 70% is N (A is only 25%)', async (page) => {
  const got = await consensusFor(page, fa(['ACN', 'ACN', 'ACN', 'ACA']), { threshold: 70 });
  return { pass: got === 'ACN', detail: got };
});

check('consensus: nucleotide majority, gaps count in the denominator', async (page) => {
  // col1 AAAG 75%; col2 AA-- 50% (passes 50 only); col3 ACGT 25% (fails)
  const got = await consensusFor(page, fa(['AAA', 'AAC', 'A-G', 'G-T']), { threshold: 50 });
  return { pass: got === 'AA-', detail: got };
});

check('consensus: ties prefer a definite base over N, then alphabetical', async (page) => {
  const got = await consensusFor(page, fa(['AN', 'AG', 'NA', 'NG']), { threshold: 50 });
  // col1 A,A,N,N -> A ; col2 N,G,A,G -> G (50%)
  return { pass: got === 'AG', detail: got };
});

check('consensus: ambiguous mode gives the IUPAC code for a tie', async (page) => {
  const got = await consensusFor(page, fa(['AC', 'AC', 'GT', 'GT']), { threshold: 50, type: 'ambiguous' });
  return { pass: got === 'RY', detail: got };
});

check('consensus: nucleotide fallbacks below the threshold', async (page) => {
  const rows = fa(['A', 'C', 'G', 'G']);
  const gap = await consensusFor(page, rows, { threshold: 70, fallback: 'gap' });
  const n = await consensusFor(page, rows, { threshold: 70, fallback: 'n' });
  const iupac = await consensusFor(page, rows, { threshold: 70, fallback: 'iupac' });
  return { pass: gap === '-' && n === 'N' && iupac === 'V', detail: JSON.stringify({ gap, n, iupac }) };
});

check('consensus: protein fallbacks give X and B/Z/J, never A/C/G/T codes', async (page) => {
  const rows = fa(['MDEIW', 'MNQLF', 'MDEIY', 'MNQLH']);
  const n = await consensusFor(page, rows, { threshold: 70, fallback: 'n' });
  const iupac = await consensusFor(page, rows, { threshold: 70, fallback: 'iupac' });
  return { pass: n === 'MXXXX' && iupac === 'MBZJX', detail: JSON.stringify({ n, iupac }) };
});

check('consensus: displayed consensus row and Copy selected consensus use the same rule', async (page) => {
  await loadFasta(page, fa(['MLKWVA', 'MLKWVA', 'MLKWVT', 'MAKWVG', 'MAKWCG']));
  const r = await page.evaluate(async () => {
    setConsensusThresholdUI(50);
    document.getElementById('showConsensus').checked = true;
    await renderAlignment();
    let copied = null;
    navigator.clipboard.writeText = async (t) => { copied = t; };
    state.selectedRows = new Set([0, 1, 2, 3, 4]);
    copySelectedConsensus();
    await new Promise(r => setTimeout(r, 50));
    const row = document.querySelector('.consensus-line .seq-data');
    return { shown: row ? row.textContent.replace(/\s/g, '').replace(/\d+$/, '') : null, copied };
  });
  const ok = r.copied === '>Selected_Consensus\nMLKWV' && (r.shown === null || r.shown.toUpperCase() === 'MLKWV-');
  return { pass: ok, detail: JSON.stringify(r) };
});

async function main() {
  const { server, baseUrl } = await start();
  const filter = process.env.CHECK_FILTER ? process.env.CHECK_FILTER.toLowerCase() : null;
  const active = filter ? CHECKS.filter(c => c.name.toLowerCase().includes(filter)) : CHECKS;
  const browser = await launch();
  let failed = 0;
  try {
    for (const { name, fn } of active) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let outcome;
      try {
        await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
        outcome = await fn(page);
        if (outcome.pass && errors.length) outcome = { pass: false, detail: 'page errors: ' + errors.join(' | ') };
      } catch (e) {
        outcome = { pass: false, detail: 'threw: ' + e.message };
      }
      if (!outcome.pass) failed++;
      console.log(`[${outcome.pass ? 'PASS' : 'FAIL'}] ${name}${outcome.detail && !outcome.pass ? ' - ' + outcome.detail : ''}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${active.length - failed}/${active.length} passed`);
  process.exit(failed ? 1 : 0);
}

module.exports = { check, openText };
if (require.main === module) main().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });
