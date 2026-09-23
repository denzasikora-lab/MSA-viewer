// Input-compatibility check: opens every file in examples/synthetic/,
// examples/compat/ and examples/real/ through the real file picker in headless Chrome and compares
// what the viewer loaded with the expected answer (expected.json in each
// folder; synthetic/ and real/ answers come from Biopython, see scratch/build_real_expected.py).
//
//   node tests/compat/run.js            # all files
//   ONLY=phylip node tests/compat/run.js
//
// Writes tests/compat/report.json and prints one line per file. Exit code is
// the number of files whose result disagrees with the expectation.
const fs = require('fs');
const path = require('path');
const { start } = require('../lib/static-server');
const { launch } = require('../lib/browser');

const ROOT = path.join(__dirname, '..', '..');
const norm = s => String(s || '').toUpperCase().replace(/[.~]/g, '-');
const residues = s => norm(s).replace(/-/g, '');

async function openFile(page, file) {
  await page.setInputFiles('#fileInput', file);
  // Wait for the status line to leave its transient states
  let msg = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    msg = await page.evaluate(() => (document.getElementById('statusMessage') || {}).innerText || '');
    if (msg && !/^(Scanning|Parsing|Loading|Reading|Detected)/i.test(msg.trim())) break;
  }
  const seqs = await page.evaluate(() => (state.seqs || []).map(s => ({ name: s.header, full: s.fullHeader || '', seq: s.seq })));
  return { msg: msg.trim().replace(/\s+/g, ' ').slice(0, 220), seqs };
}

function compareSeqs(exp, got, aligned) {
  const problems = [];
  if (got.length !== exp.seqs.length) problems.push(`rows ${got.length}, expected ${exp.seqs.length}`);
  const n = Math.min(got.length, exp.seqs.length);
  let nameDiff = 0, resDiff = 0, alnDiff = 0, firstName = '', firstRes = '';
  for (let i = 0; i < n; i++) {
    const nm = s => String(s).replace(/_/g, ' '); // NEXUS/short names use '_' for a space
    if (nm(got[i].name) !== nm(exp.names[i])) { nameDiff++; if (!firstName) firstName = `"${got[i].name}" vs "${exp.names[i]}"`; }
    if (residues(got[i].seq) !== residues(exp.seqs[i])) {
      resDiff++;
      if (!firstRes) {
        const a = residues(got[i].seq), b = residues(exp.seqs[i]);
        let k = 0; while (k < a.length && a[k] === b[k]) k++;
        firstRes = `row ${i + 1} ${exp.names[i]}: ${a.length} vs ${b.length} residues, first difference at ${k + 1}`;
      }
    } else if (aligned && norm(got[i].seq).replace(/-+$/, '') !== norm(exp.seqs[i]).replace(/-+$/, '')) alnDiff++;
  }
  if (resDiff) problems.push(`${resDiff} row(s) with different residues (${firstRes})`);
  if (alnDiff) problems.push(`${alnDiff} row(s) with same residues but different gap placement`);
  const warnings = nameDiff ? [`${nameDiff} name(s) differ, e.g. ${firstName}`] : [];
  return { problems, warnings };
}

async function main() {
  const { server, baseUrl } = await start();
  const browser = await launch();
  const only = (process.env.ONLY || '').toLowerCase();
  const report = [];
  const jobs = [];
  for (const dir of ['synthetic', 'compat', 'real']) {
    const exp = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', dir, 'expected.json'), 'utf8'));
    for (const [name, e] of Object.entries(exp)) jobs.push({ dir, name, e });
  }
  for (const { dir, name, e } of jobs) {
    if (only && !name.toLowerCase().includes(only)) continue;
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('dialog', d => d.accept());
    await page.goto(baseUrl + '/index.html', { waitUntil: 'networkidle' });
    const file = path.join(ROOT, 'examples', dir, name);
    let res, problems = [], warnings = [];
    try {
      if (e.reference_file) {
        await openFile(page, path.join(ROOT, 'examples', dir, e.reference_file));
        res = await openFile(page, file);
        const m = res.msg.match(/Loaded (\d+) reads/);
        if (!m || +m[1] !== e.reads_on_reference) problems.push(`expected "Loaded ${e.reads_on_reference} reads", got: ${res.msg}`);
      } else if (e.reads_needs_reference) {
        res = await openFile(page, file);
        if (!/reference first/.test(res.msg)) problems.push(`expected guidance to open the reference first, got: ${res.msg}`);
      } else if (e.primary_mapped_reads !== undefined) {
        res = await openFile(page, file);
        // SAM alone: one pileup reference row plus one row per primary mapped read
        const want = e.primary_mapped_reads + 1;
        if (res.seqs.length !== want) problems.push(`rows ${res.seqs.length}, expected ${want} (pileup + ${e.primary_mapped_reads} reads on ${e.shown_reference})`);
        // Every aligned read base must sit in its reference position's column.
        // REF shows '-' only in insertion columns (uncovered positions are 'N'),
        // so its non-gap columns are reference positions start, start+1, ...
        const ref = res.seqs[0] || { seq: '', full: '' };
        const start = +((ref.full.match(/^REF_(\d+)-/) || [])[1] || 0);
        const refCols = [];
        for (let c = 0; c < ref.seq.length; c++) if (ref.seq[c] !== '-') refCols.push(c);
        let misplaced = 0, firstBad = '';
        (e.placed_bases || []).forEach(([qname, bases], k) => {
          const row = res.seqs[k + 1];
          if (!row) return;
          for (const [pos, b] of Object.entries(bases)) {
            const got = (row.seq[refCols[+pos - start]] || '').toUpperCase();
            if (got !== b) { misplaced++; if (!firstBad) firstBad = `${qname} at ${pos}: shows "${got}", read has "${b}"`; }
          }
        });
        if (misplaced) problems.push(`${misplaced} read base(s) not in their reference column (${firstBad})`);
        if (e.references.length > 1 && !/references; showing/.test(res.msg)) problems.push(`reads on ${e.references.join(', ')} but no note saying only ${e.shown_reference} is shown; message: ${res.msg}`);
      } else if (e.rows !== undefined) {
        res = await openFile(page, file);
        if (res.seqs.length !== e.rows) problems.push(`rows ${res.seqs.length}, expected ${e.rows}`);
      } else if (e.reject || e.error !== undefined) {
        res = await openFile(page, file);
        if (res.seqs.length) problems.push(`expected a refusal, but ${res.seqs.length} row(s) loaded (first: ${res.seqs[0].name}); message: ${res.msg}`);
      } else {
        res = await openFile(page, file);
        const aligned = !/\.(ab1|gb|gbk)$/i.test(name) && !/unaligned|f002|dups|pearson|flowers|ex1\.fa/i.test(name);
        ({ problems, warnings } = compareSeqs(e, res.seqs, aligned));
      }
    } catch (err) {
      problems.push('harness error: ' + err.message);
      res = res || { msg: '', seqs: [] };
    }
    if (errors.length) problems.push('page error: ' + errors[0]);
    const ok = problems.length === 0;
    report.push({ dir, name, what: e.what || e.biopython_format || '', ok, problems, warnings, message: res.msg, rows: res.seqs.length });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${dir}/${name}${problems.length ? '\n      ' + problems.join('\n      ') : ''}${warnings.length ? '\n      note: ' + warnings.join('; ') : ''}`);
    await page.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
  const failed = report.filter(r => !r.ok).length;
  console.log(`\n${report.length - failed}/${report.length} files behave as expected`);
  process.exit(failed);
}

main().catch(e => { console.error(e); process.exit(99); });
