// Runs every test suite and prints a summary; exits 1 if any suite fails.
//
//   node tests/run-all.js            # everything (all MACSE fixtures and corpus sets)
//   node tests/run-all.js --quick    # MACSE subsets only (a few minutes faster)
//   node tests/run-all.js --no-browser   # skip the suites that need Chromium
//
// Browser suites drive a local Chrome/Chromium through playwright-core (see
// tests/lib/browser.js; set BROWSER_PATH if it is not found).
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const quick = process.argv.includes('--quick');
const noBrowser = process.argv.includes('--no-browser');

const MACSE_FIXTURES_QUICK = '202190at40674,167757at40674,162343at40674';
const MACSE_CORPUS_QUICK = 'r001,r002,r003,r004,r005,r006,r007,r008,r010,r011';

const SUITES = [
  { name: 'k-mer grouping: equivalence with the old implementation', args: ['tests/kmer/equiv-old.js'] },
  { name: 'k-mer grouping: planted-family recovery', args: ['tests/kmer/recovery.test.js'] },
  { name: 'k-mer grouping: properties', args: ['tests/kmer/properties.test.js'] },
  { name: 'k-mer grouping: tree cut vs reference', args: ['tests/kmer/cut-reference-check.js'] },
  { name: 'realign region', args: ['tests/realign-region/run.js'] },
  { name: 'codon alignment (fast engine)', args: ['tests/codon-align/run.js'] },
  { name: 'MACSE port: worker', args: ['tests/macse-port/worker_test.js'] },
  { name: 'MACSE port: identical to MACSE v2.07 on gene fixtures',
    args: ['tests/macse-port/run_fixtures.js', 'tests/codon-align/fixtures', ...(quick ? [MACSE_FIXTURES_QUICK] : [])] },
  { name: 'MACSE port: identical to MACSE v2.07 on the random corpus',
    args: ['tests/macse-port/run_corpus.js', ...(quick ? [MACSE_CORPUS_QUICK] : [])] },
  { name: 'MACSE port: thread pool', args: ['tests/macse-port/run_corpus.js', '--async', '4', 'r002,r012,r013'] },
  { name: 'clustering: SVK subset', args: ['tests/clustering/svk_subset.test.js'] },
  { name: 'clustering: guided small cases', args: ['tests/clustering/guided_small.test.js'] },
  { name: 'clustering: multiple data sets', args: ['tests/clustering/multi_dataset.test.js'] },
  { name: 'bicluster oracle', args: ['tests/bicluster/oracle.js'] },
  { name: 'optional server security', args: ['tests/server/security.test.js'] },
  { name: 'release version consistency', args: ['tests/meta/version.test.js'] },
  { name: 'correctness (consensus, parsers, exports, rendering)', args: ['tests/correctness/run.js'], browser: true },
  { name: 'input compatibility (examples/)', args: ['tests/compat/run.js'], browser: true },
  { name: 'functional', args: ['tests/functional/run-all.js'], browser: true },
  { name: 'regression', args: ['tests/regression/run-all.js'], browser: true },
  { name: 'accessibility (keyboard, names, axe-core)', args: ['tests/a11y/check.js'], browser: true },
  { name: 'browser support (fallbacks, file://)', args: ['tests/browser-support/check.js'], browser: true },
  { name: 'layout: no stray scrollbars', args: ['tests/layout/stray-scrollbars.test.js'], browser: true },
  { name: 'layout: toolbar items never overlap', args: ['tests/layout/toolbar.test.js'], browser: true },
  { name: 'ui: no stale overlays after load or realign', args: ['tests/ui/stale-state.test.js'], browser: true },
  { name: 'ui: menus and windows (clipped text, Tree window, Load anyway)', args: ['tests/ui/menus-windows.test.js'], browser: true },
  { name: 'public site (tools/build-site.sh)', args: ['tests/site/check.js'], browser: true },
];

const results = [];
for (const suite of SUITES) {
  if (suite.browser && noBrowser) { results.push({ ...suite, status: 'skipped' }); continue; }
  console.log(`\n=== ${suite.name}: node ${suite.args.join(' ')}`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, suite.args, { cwd: ROOT, stdio: 'inherit' });
  results.push({ ...suite, status: r.status === 0 ? 'pass' : 'FAIL', seconds: ((Date.now() - t0) / 1000).toFixed(0) });
}

console.log('\n=== Summary');
for (const r of results) console.log(`${r.status.padEnd(7)} ${r.seconds ? (r.seconds + ' s').padStart(6) : '      '}  ${r.name}`);
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(failed ? `\n${failed} suite(s) failed` : '\nall suites passed');
process.exit(failed ? 1 : 0);
