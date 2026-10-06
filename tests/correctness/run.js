// Correctness checks for the pre-submission audit fixes: consensus, parsers,
// exports and rendering. Each check loads input through the app's real entry
// points in headless Chromium and asserts the exact expected output.
//
//   node tests/correctness/run.js
//   CHECK_FILTER=consensus node tests/correctness/run.js
const fs = require('fs');
const path = require('path');
const { start } = require('../lib/static-server');
const ROOT = path.join(__dirname, '..', '..');
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

// Open bytes through the file picker and wait for the final status message
async function openBytes(page, name, buffer) {
  await page.setInputFiles('#fileInput', { name, mimeType: 'application/octet-stream', buffer });
  let msg = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    msg = await page.evaluate(() => (document.getElementById('statusMessage') || {}).innerText || '');
    if (msg && !/^(Scanning|Parsing|Loading|Reading|Detected|Decoding|Fetching)/i.test(msg.trim())) break;
  }
  return page.evaluate((msg) => ({
    names: state.seqs.map(s => s.header), seqs: state.seqs.map(s => s.seq), message: msg,
  }), msg);
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

// ---------- MSF ----------

const msf = (type, rows, names = rows.map(r => r[0])) => [
  'PileUp', '',
  ` MSF: ${rows[0][1].length}  ${type ? 'Type: ' + type + '  ' : ''}Check: 0 ..`, '',
  ...names.map(n => ` Name: ${n}  Len: ${rows[0][1].length}  Check: 0  Weight: 1.00`),
  '', '//', '',
  ...rows.map(([n, s]) => `${n.padEnd(10)} ${s}`), '',
].join('\n');

check('MSF: a name that is a prefix of another name keeps both rows', async (page) => {
  const r = await openText(page, 't.msf', msf('N', [['seq1', 'ACGTACGT'], ['seq10', 'TTTTGGGG']]));
  const ok = JSON.stringify(r.names) === '["seq1","seq10"]' && JSON.stringify(r.seqs) === '["ACGTACGT","TTTTGGGG"]';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('MSF: names listed short-first and long-first both work', async (page) => {
  const r = await openText(page, 't.msf', msf('N', [['seq10', 'TTTTGGGG'], ['seq1', 'ACGTACGT']]));
  const ok = JSON.stringify(r.seqs) === '["TTTTGGGG","ACGTACGT"]';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('MSF: protein residues survive a missing Type line', async (page) => {
  const r = await openText(page, 't.msf', msf(null, [['p1', 'MKVLEFGIQP'], ['p2', 'MKV-EFGIQP']]));
  return { pass: r.seqs[0] === 'MKVLEFGIQP' && r.seqs[1] === 'MKV-EFGIQP', detail: JSON.stringify(r.seqs) };
});

check('MSF: protein residues survive "Type:P" written without a space', async (page) => {
  const text = msf(null, [['p1', 'MKVLEFGIQP'], ['p2', 'MKVLEFGIQP']]).replace(' MSF: 10  Check', ' MSF: 10  Type:P  Check');
  const r = await openText(page, 't.msf', text);
  return { pass: r.seqs[0] === 'MKVLEFGIQP', detail: JSON.stringify(r.seqs) };
});

check('MSF: ~ and . gaps become -', async (page) => {
  const r = await openText(page, 't.msf', msf('N', [['a', 'AC~~GT..'], ['b', 'ACGTGTAC']]));
  return { pass: r.seqs[0] === 'AC--GT--', detail: JSON.stringify(r.seqs) };
});

// ---------- NEXUS ----------

const nexus = (format, matrix, dims = 'ntax=2 nchar=16') =>
  `#NEXUS\nbegin data;\n  dimensions ${dims};\n  format ${format};\n  matrix\n${matrix}\n  ;\nend;\n`;

check('NEXUS: a sequential matrix wrapped over several lines is read whole', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna missing=? gap=-',
    't1 ACGTACGT\n   ACGTACGT\nt2 TTTTGGGG\n   CCCCAAAA'));
  const ok = JSON.stringify(r.names) === '["t1","t2"]' && r.seqs[0] === 'ACGTACGTACGTACGT' && r.seqs[1] === 'TTTTGGGGCCCCAAAA';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('NEXUS: wrapped continuation lines with spaced groups are not taken as taxa', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna',
    't1 ACGT ACGT\n   ACGT ACGT\nt2 TTTT GGGG\n   CCCC AAAA'));
  const ok = JSON.stringify(r.names) === '["t1","t2"]' && r.seqs[1] === 'TTTTGGGGCCCCAAAA';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('NEXUS: a name on its own line, sequence below', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna', 't1\nACGT\nt2\nTTGG', 'ntax=2 nchar=4'));
  const ok = JSON.stringify(r.names) === '["t1","t2"]' && r.seqs[0] === 'ACGT' && r.seqs[1] === 'TTGG';
  return { pass: ok, detail: JSON.stringify(r) };
});

check('NEXUS: MATCHCHAR is resolved against the first taxon', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna missing=? gap=- matchchar=.',
    't1 ACGTACGT\nt2 ..A.-..?', 'ntax=2 nchar=8'));
  return { pass: r.seqs[1] === 'ACAT-CG?', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: MATCHCHAR keeps gaps in the second taxon', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna gap=- matchchar=.',
    't1 ACGTACGT\nt2 ..A.-..T', 'ntax=2 nchar=8'));
  return { pass: r.seqs[1] === 'ACAT-CGT', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: polymorphisms {AG} and (CT) are one IUPAC column each', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna', 't1 A{AG}G(CT)\nt2 ACGT', 'ntax=2 nchar=4'));
  return { pass: r.seqs[0] === 'ARGY' && r.seqs[1] === 'ACGT', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: a custom gap symbol becomes a gap, not a deleted column', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna gap=~', 't1 AC~T\nt2 ACGT', 'ntax=2 nchar=4'));
  return { pass: r.seqs[0] === 'AC-T', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: interleaved blocks still join per taxon', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna interleave',
    't1 ACGT\nt2 TTTT\n\nt1 GGGG\nt2 CCCC', 'ntax=2 nchar=8'));
  return { pass: r.seqs[0] === 'ACGTGGGG' && r.seqs[1] === 'TTTTCCCC', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: a DISTANCES block before DATA is not taken for the alignment', async (page) => {
  const text = '#NEXUS\nbegin distances;\n dimensions ntax=2;\n matrix\n t1 0\n t2 0.5 0\n ;\nend;\n' +
    nexus('datatype=dna', 't1 ACGT\nt2 TTGG', 'ntax=2 nchar=4').replace('#NEXUS\n', '');
  const r = await openText(page, 't.nex', text);
  return { pass: r.seqs.length === 2 && r.seqs[0] === 'ACGT', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: datatype=standard keeps digit states', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=standard symbols="012"', 't1 0120\nt2 1?21', 'ntax=2 nchar=4'));
  return { pass: r.seqs[0] === '0120' && r.seqs[1] === '1?21', detail: JSON.stringify(r.seqs) };
});

check('NEXUS: NCHAR mismatch is reported, not silent', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna interleave', 't1 ACGT\nt2 TTGG', 'ntax=2 nchar=6'));
  return { pass: /NCHAR=6/.test(r.message), detail: r.message };
});

check('NEXUS: quoted names with spaces and comments still work', async (page) => {
  const r = await openText(page, 't.nex', nexus('datatype=dna', "'Homo sapiens' ACGT [c;omment]\n'it''s' TTGG", 'ntax=2 nchar=4'));
  const ok = r.names[0] === 'Homo_sapiens' && r.seqs[0] === 'ACGT' && r.seqs[1] === 'TTGG';
  return { pass: ok, detail: JSON.stringify(r) };
});

// ---------- PHYLIP ----------

check('PHYLIP: a stale header length is reported and names keep their residues', async (page) => {
  const r = await openBytes(page, 't.phy', Buffer.from('2 10\nalpha ACGTACGT\nbeta  ACGAACGA\n'));
  const ok = JSON.stringify(r.names) === '["alpha","beta"]' && r.seqs[0] === 'ACGTACGT' && /PHYLIP header says 10 columns/.test(r.message);
  return { pass: ok, detail: JSON.stringify(r) };
});

check('PHYLIP: position numbers at line ends are not residues', async (page) => {
  const r = await openBytes(page, 't.phy', Buffer.from('2 8\nseqA ACGT ACGT 8\nseqB TTTT GGGG 8\n'));
  return { pass: r.names[0] === 'seqA' && r.seqs[0] === 'ACGTACGT' && r.seqs[1] === 'TTTTGGGG', detail: JSON.stringify(r) };
});

check('PHYLIP: too few sequences for the header gives a specific error', async (page) => {
  const r = await openBytes(page, 't.phy', Buffer.from('3 4\na ACGT\nb ACGT\n'));
  return { pass: /PHYLIP header says 3 sequences/.test(r.message), detail: r.message };
});

check('PHYLIP: strict 10-character names still load', async (page) => {
  const r = await openBytes(page, 't.phy', Buffer.from('2 8\nHomo sapieACGTACGT\nPan trogloTTTTGGGG\n'));
  return { pass: r.seqs[0] === 'ACGTACGT' && r.seqs[1] === 'TTTTGGGG', detail: JSON.stringify(r) };
});

// ---------- FASTA family ----------

check('A3M: lowercase insertions are expanded so rows line up', async (page) => {
  const r = await openBytes(page, 't.a3m', Buffer.from('>q\nACDEFGHIK\n>h1\nACdeDEFGHIK\n>h2\nAC-EFGHIKw\n'));
  const ok = JSON.stringify(r.seqs) === '["AC--DEFGHIK-","ACdeDEFGHIK-","AC---EFGHIKw"]';
  return { pass: ok && /A3M detected/.test(r.message), detail: JSON.stringify(r) };
});

check('FASTA: unknown punctuation keeps its column (becomes N), ? is missing data', async (page) => {
  const r = await openBytes(page, 't.fa', Buffer.from('>a\nACGT!ACGT\n>b\nACGT?ACGT\n'));
  return { pass: r.seqs[0] === 'ACGTNACGT' && r.seqs[1] === 'ACGTNACGT', detail: JSON.stringify(r.seqs) };
});

check('FASTA: header words "#NEXUS" or "begin data" do not switch the format', async (page) => {
  const r = await openBytes(page, 't.fa', Buffer.from('>seq1 converted from #NEXUS\nACGT\n>seq2 how to begin data analysis\nACGA\n'));
  return { pass: JSON.stringify(r.names) === '["seq1","seq2"]' && r.seqs[1] === 'ACGA', detail: JSON.stringify(r) };
});

check('PIR/NBRF: the title line is not read as sequence and * ends the sequence', async (page) => {
  const r = await openBytes(page, 't.pir', Buffer.from('>P1;CRAB_ANAPL\nALPHA CRYSTALLIN B CHAIN\nMDITIHNPLI\nRRPFS*\n>P1;CRAB_BOVIN\nALPHA CRYSTALLIN B CHAIN\nMDIAIHHPWI\nRRPFF*\n'));
  const ok = JSON.stringify(r.names) === '["CRAB_ANAPL","CRAB_BOVIN"]' && r.seqs[0] === 'MDITIHNPLIRRPFS' && r.seqs[1] === 'MDIAIHHPWIRRPFF';
  return { pass: ok, detail: JSON.stringify(r) };
});

// ---------- encodings ----------

check('UTF-16LE files (Windows "Unicode") load', async (page) => {
  const text = '>séq1\nACGT\n>seq2\nACGA\n';
  const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const r = await openBytes(page, 't.fa', buf);
  return { pass: JSON.stringify(r.names) === '["séq1","seq2"]' && r.seqs[0] === 'ACGT', detail: JSON.stringify(r) };
});

check('Latin-1 names keep their accents', async (page) => {
  const r = await openBytes(page, 't.fa', Buffer.from('>séq1\nACGT\n>seq2\nACGA\n', 'latin1'));
  return { pass: r.names[0] === 'séq1', detail: JSON.stringify(r.names) };
});

// ---------- Stockholm, SAM, GenBank ----------

check('Stockholm: a file with two alignments says only the first is shown', async (page) => {
  const sto = '# STOCKHOLM 1.0\na ACGT\nb ACGA\n//\n# STOCKHOLM 1.0\nc TTTT\nd TTTA\n//\n';
  const r = await openBytes(page, 't.sto', Buffer.from(sto));
  return { pass: r.seqs.length === 2 && /holds 2 alignments/.test(r.message), detail: JSON.stringify(r) };
});

check('SAM without header whose first read is unmapped is still SAM', async (page) => {
  const sam = ['u1\t4\t*\t0\t0\t*\t*\t0\t0\tACGT\t*', 'r1\t0\tref\t1\t60\t4M\t*\t0\t0\tACGT\t*', 'r2\t0\tref\t3\t60\t4M\t*\t0\t0\tGTAC\t*'].join('\n');
  const r = await openBytes(page, 't.txt', Buffer.from(sam));
  return { pass: r.seqs.length === 3 && !/No valid sequences/.test(r.message), detail: JSON.stringify(r) };
});

check('GenBank: a feature key outside the old list (ncRNA) starts its own feature', async (page) => {
  const gb = [
    'LOCUS       TEST1                     12 bp    DNA     linear   SYN 01-JAN-2000',
    'FEATURES             Location/Qualifiers',
    '     gene            1..10',
    '                     /gene="abc"',
    '     ncRNA           3..8',
    '                     /ncRNA_class="miRNA"',
    'ORIGIN',
    '        1 acgtacgtac gt',
    '//', ''].join('\n');
  await openBytes(page, 't.gb', Buffer.from(gb));
  const f = await page.evaluate(() => state.seqs[0]._genbank.features.map(x => ({ type: x.type, loc: x.location, q: x.qualifiers })));
  const ok = f.length === 2 && f[0].q.gene === 'abc' && f[1].type === 'ncRNA' && f[1].loc === '3..8' && f[1].q.ncRNA_class === 'miRNA';
  return { pass: ok, detail: JSON.stringify(f) };
});

// ---------- truncated BAM / CRAM ----------

async function readsAfterReference(page, name, bytes) {
  await openBytes(page, 'htslib_ce_CHROMOSOME_II.fa', fs.readFileSync(path.join(ROOT, 'examples/real/htslib_ce_CHROMOSOME_II.fa')));
  return openBytes(page, name, bytes);
}

check('BAM: a complete file loads all 34 reads without a truncation warning', async (page) => {
  const r = await readsAfterReference(page, 'range.bam', fs.readFileSync(path.join(ROOT, 'examples/real/htslib_range.bam')));
  return { pass: /Loaded 34 reads/.test(r.message) && !/truncated/.test(r.message), detail: r.message };
});

check('BAM: a truncated file says it is truncated (not "Failed to fetch")', async (page) => {
  const full = fs.readFileSync(path.join(ROOT, 'examples/real/htslib_range.bam'));
  const r = await readsAfterReference(page, 'range.bam', full.subarray(0, Math.floor(full.length * 2 / 3)));
  return { pass: /truncated/.test(r.message) && !/Failed to fetch/.test(r.message), detail: r.message };
});

check('CRAM: a complete file has no truncation warning', async (page) => {
  const r = await readsAfterReference(page, 'range.cram', fs.readFileSync(path.join(ROOT, 'examples/real/htslib_range.cram')));
  return { pass: /Loaded 34 reads/.test(r.message) && !/truncated/.test(r.message), detail: r.message };
});

check('CRAM: a truncated file says it is truncated', async (page) => {
  const full = fs.readFileSync(path.join(ROOT, 'examples/real/htslib_range.cram'));
  const r = await readsAfterReference(page, 'range.cram', full.subarray(0, Math.floor(full.length * 2 / 3)));
  return { pass: /truncated/.test(r.message), detail: r.message };
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
