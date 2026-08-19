// Shared headless-Chrome launch helper for the test suite. Drives the
// system-installed Chrome directly via playwright-core (no browser
// download) - see AIDER-PLAYBOOK.md / CLAUDE.md global rules for why this
// pattern is used instead of a full Playwright install.
const { chromium } = require('playwright-core');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findChrome() {
  const fs = require('fs');
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No local Chrome/Edge install found at expected paths - see tests/lib/browser.js CHROME_CANDIDATES');
}

async function launch() {
  return chromium.launch({ executablePath: findChrome(), headless: true });
}

// Generates a synthetic FASTA alignment of nSeq sequences x nCol columns.
// Deterministic (seeded by index), no randomness, so results are reproducible.
// Only used for small sizes passed directly as a string - see
// loadSyntheticFasta for large sizes, which builds the string inside the
// page instead of serializing it over CDP (multi-million-char page.evaluate
// arguments are slow to serialize as JSON across the CDP connection - this
// was measured directly: a 6M-residue regression check took 40+ minutes
// with the string built in Node and passed as an argument, vs seconds when
// built in-page).
function makeFasta(nSeq, nCol, alphabet = 'ACGT') {
  let fasta = '';
  for (let i = 0; i < nSeq; i++) {
    let s = '';
    for (let j = 0; j < nCol; j++) s += alphabet[(i * 7 + j) % alphabet.length];
    fasta += `>seq${i}\n${s}\n`;
  }
  return fasta;
}

// The "Large alignment, proceed?" dialog only ever appears above
// ALIGN_CRAZY_VOLUME. Waiting the full timeout on every small-alignment
// load/mode-switch (dialog never appears) was the dominant cost in the
// regression suite (a 3-mode-switch check took 62s doing this three times).
// Read the real threshold from the page and only wait for the dialog when
// the current alignment could plausibly trigger it.
async function _mightShowProceedDialog(page) {
  return page.evaluate(() => {
    try {
      const n = (state.seqs?.length || 0) * (state.seqs?.[0]?.seq?.length || 0);
      return typeof ALIGN_CRAZY_VOLUME === 'undefined' || n >= ALIGN_CRAZY_VOLUME * 0.9;
    } catch { return true; }
  }).catch(() => true);
}
async function _dismissProceedDialogIfPresent(page) {
  const timeout = (await _mightShowProceedDialog(page)) ? 8000 : 300;
  const dlg = await page.waitForSelector('#alignLoadProceed', { timeout }).then(() => true).catch(() => false);
  if (dlg) await page.click('#alignLoadProceed');
}

// Loads a FASTA string into the app via the same UI path a real user would
// use (textarea + parseAndRender), including the "Large alignment" proceed
// dialog if it appears. Assumes page is already navigated to the app.
async function loadFasta(page, fasta) {
  await page.evaluate((fasta) => {
    document.getElementById('fastaInput').value = fasta;
    window.__loadPromise = parseAndRender(false);
  }, fasta);
  await _dismissProceedDialogIfPresent(page);
  await page.evaluate(() => window.__loadPromise);
  await page.waitForTimeout(200);
}

// Same as loadFasta, but builds the synthetic FASTA string INSIDE the page
// (only nSeq/nCol cross the CDP boundary, not the multi-million-char
// string itself). Use this for any size that would produce a large string
// (roughly >500K residues) - see the comment on makeFasta above.
async function loadSyntheticFasta(page, nSeq, nCol, alphabet = 'ACGT') {
  await page.evaluate(({ nSeq, nCol, alphabet }) => {
    let fasta = '';
    for (let i = 0; i < nSeq; i++) {
      const chars = new Array(nCol);
      for (let j = 0; j < nCol; j++) chars[j] = alphabet[(i * 7 + j) % alphabet.length];
      fasta += `>seq${i}\n${chars.join('')}\n`;
    }
    document.getElementById('fastaInput').value = fasta;
    window.__loadPromise = parseAndRender(false);
  }, { nSeq, nCol, alphabet });
  // nSeq*nCol is known here without a page round-trip.
  const timeout = (nSeq * nCol >= 4_500_000) ? 8000 : 300;
  const dlg = await page.waitForSelector('#alignLoadProceed', { timeout }).then(() => true).catch(() => false);
  if (dlg) await page.click('#alignLoadProceed');
  await page.evaluate(() => window.__loadPromise);
  await page.waitForTimeout(200);
}

async function setMode(page, mode) {
  const id = { full: 'modeSingle', block: 'modeBlocks', canvas: 'modeCanvas' }[mode];
  if (!id) throw new Error(`unknown mode: ${mode}`);
  await page.evaluate((id) => { document.getElementById(id).checked = true; onModeChange(); }, id);
  await _dismissProceedDialogIfPresent(page);
  await page.waitForTimeout(200);
}

module.exports = { launch, makeFasta, loadFasta, loadSyntheticFasta, setMode, findChrome };
