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
const { launch, loadFasta, loadSyntheticFasta, setMode } = require('../lib/browser');

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

// ---------- exports ----------

// Run an export and capture the file it would download
async function captureExport(page, fnName) {
  return page.evaluate(async (fnName) => {
    let file = null;
    window._downloadBlob = async (blob, name) => { file = { name, text: await blob.text() }; };
    await window[fnName]();
    for (let i = 0; i < 100 && !file; i++) await new Promise(r => setTimeout(r, 50));
    return file;
  }, fnName);
}

// RTF -> plain text lines (drops control words and groups)
function rtfLines(rtf) {
  const body = rtf.replace(/^\{\\rtf1[\s\S]*?\\f0\\fs18\n/, '').replace(/\}\s*$/, '');
  return body.split('\\line').map(l => l.replace(/\n/g, '').replace(/\\[a-z]+-?\d* ?/g, '').replace(/[{}]/g, ''));
}

check('export: full SVG of a windowed alignment holds every residue (600 x 1000)', async (page) => {
  await loadSyntheticFasta(page, 600, 1000);
  await setMode(page, 'full');
  const file = await captureExport(page, 'exportFullAlignmentAsSvg');
  if (!file) return { pass: false, detail: 'no file' };
  // residue runs are the <text> elements with an x list that are not the ruler (#666666) or names (x="2")
  let residues = 0;
  for (const m of file.text.matchAll(/<text x="([^"]+)"[^>]*fill="(#[0-9a-f]{6})"[^>]*>([^<]*)<\/text>/g)) {
    if (m[1] === '2' || m[2] === '#666666') continue;
    residues += m[3].length;
  }
  // every residue, plus the consensus row when it is shown
  const consensusShown = await page.evaluate(() => document.getElementById('showConsensus').checked);
  const want = 600000 + (consensusShown ? 1000 : 0);
  return { pass: residues === want, detail: `${residues} cells in the SVG (want ${want}), ${(file.text.length / 1e6).toFixed(1)} MB` };
});

check('export: cell colours equal the screen in every colour scheme', async (page) => {
  await loadFasta(page, '>p1\nMEFILPQWX*\n>p2\nMEFILPQWXA\n>p3\nMEFILPQAKA\n>n1\nACGTRYSWKM\n');
  const r = await page.evaluate(async () => {
    const out = [];
    for (const scheme of ['monochrome', 'nucleotide', 'nucleotide-cb', 'ambiguity', 'purine-pyrimidine', 'aa-clustal', 'aa-jalview']) {
      document.getElementById('colorSchemeSelect').value = scheme;
      await renderAlignment();
      const len = Math.max(...state.seqs.map(q => q.seq.length));
      const config = getSequenceRenderConfig();
      const cons = preCalculateConservation(state.seqs, len, config.shadeMode);
      const probe = _makeCellStyleProbe();
      for (const span of document.querySelectorAll('.seq-line[data-seq-index] .seq-data span[data-pos]')) {
        const row = +span.closest('.seq-line').dataset.seqIndex;
        if (!(row >= 0)) continue;
        const pos = +span.dataset.pos;
        const st = probe.style(_exportCellClass(state.seqs[row].seq[pos] || '-', cons[pos], config));
        const cs = getComputedStyle(span);
        const bg = _cssColourToHex(cs.backgroundColor) || '#ffffff', fg = _cssColourToHex(cs.color) || '#000000';
        if (bg !== st.bg || fg !== st.fg) out.push(`${scheme} row ${row} pos ${pos} '${span.textContent}': screen ${bg}/${fg}, export ${st.bg}/${st.fg}`);
      }
      probe.dispose();
    }
    return out;
  });
  return { pass: r.length === 0, detail: r.slice(0, 5).join('; ') + (r.length > 5 ? ` (+${r.length - 5})` : '') };
});

check('export: RTF ruler, consensus and sequences start in the same column', async (page) => {
  await loadFasta(page, '>alpha\nACGTACGTACGTACGTACGTA\n>beta\nACGTACGTACGTACGTACGTA\n>gamma\nACGAACGTACGTACGTACGTT\n');
  await page.evaluate(async () => {
    document.getElementById('showConsensus').checked = true;
    document.getElementById('blockSizeSlider').value = 100;
    await renderAlignment();
  });
  const file = await captureExport(page, 'exportAlignmentAsRtf');
  const lines = rtfLines(file.text).filter(l => l.trim());
  const nameLen = await page.evaluate(() => effectiveNameLength());
  const scale = await page.evaluate(() => generateScale(21, 10, 0));
  const want = [
    ' '.repeat(nameLen + 1) + scale,
    'Consensus'.padEnd(nameLen).substring(0, nameLen) + ' ' + 'ACGTACGTACGTACGTACGTA',
    'alpha'.padEnd(nameLen) + ' ' + 'ACGTACGTACGTACGTACGTA',
    'beta'.padEnd(nameLen) + ' ' + 'ACGTACGTACGTACGTACGTA',
    'gamma'.padEnd(nameLen) + ' ' + 'ACGAACGTACGTACGTACGTT',
  ];
  const got = lines.slice(0, 5).map((l, i) => i === 1 ? l.toUpperCase() : l);
  const ok = JSON.stringify(got) === JSON.stringify(want.map((l, i) => i === 1 ? l.toUpperCase() : l));
  return { pass: ok, detail: JSON.stringify({ got, want }) };
});

check('export: RTF gives shaded cells their text colour (white on black)', async (page) => {
  await loadFasta(page, '>a\nACGT\n>b\nACGT\n>c\nACGT\n');
  await page.evaluate(async () => { document.getElementById('colorSchemeSelect').value = 'monochrome'; await renderAlignment(); });
  const file = await captureExport(page, 'exportAlignmentAsRtf');
  const table = file.text.match(/\{\\colortbl;([^}]*)\}/)[1].split(';').filter(Boolean);
  const idx = c => table.indexOf(c) + 1;
  const black = idx('\\red0\\green0\\blue0'), white = idx('\\red255\\green255\\blue255');
  const ok = black > 0 && white > 0 && file.text.includes(`\\chcbpat${black}\\cb${black}\\cf${white}`);
  return { pass: ok, detail: JSON.stringify({ table, sample: file.text.slice(file.text.indexOf('\\chcbpat'), file.text.indexOf('\\chcbpat') + 60) }) };
});

check('export: RTF escapes \\ { } and non-ASCII in names', async (page) => {
  await loadFasta(page, '>a{b}\\cé\nACGT\n>d\nACGT\n');
  await page.evaluate(() => { document.getElementById('nameLengthNoLimit').checked = true; });
  const file = await captureExport(page, 'exportAlignmentAsRtf');
  return { pass: file.text.includes('a\\{b\\}\\\\c\\u233?'), detail: file.text.split('\n').find(l => l.includes('a\\{')) || file.text.slice(0, 400) };
});

// ---------- rendering ----------

async function cellStyle(page, row, pos) {
  return page.evaluate(({ row, pos }) => {
    const span = document.querySelector(`.seq-line[data-seq-index="${row}"] .seq-data span[data-pos="${pos}"]`);
    if (!span) return null;
    const cs = getComputedStyle(span);
    return { cls: span.className, bg: _cssColourToHex(cs.backgroundColor) || '#ffffff', fg: _cssColourToHex(cs.color) || '#000000' };
  }, { row, pos });
}

async function setScheme(page, scheme) {
  await page.evaluate(async (scheme) => { document.getElementById('colorSchemeSelect').value = scheme; await renderAlignment(); }, scheme);
}

check('rendering: conserved protein residues are shaded in monochrome, not flagged as artifacts', async (page) => {
  await loadFasta(page, '>p1\nMEFILPQW\n>p2\nMEFILPQW\n>p3\nMEFILPQW\n');
  await setScheme(page, 'monochrome');
  const cells = [];
  for (let pos = 0; pos < 8; pos++) cells.push(await cellStyle(page, 2, pos));
  const bad = cells.filter(c => c.bg !== '#000000' || c.fg !== '#ffffff' || /artifact|ambiguous/.test(c.cls));
  return { pass: bad.length === 0, detail: JSON.stringify(bad) };
});

check('rendering: Canvas draws the same colours as Full view (IUPAC codes, protein, gaps)', async (page) => {
  const cases = [
    ['ambiguity', '>n1\nARYSWKMN-A\n>n2\nARYSWKMN-A\n>n3\nACGTACGT-A\n'],
    ['monochrome', '>p1\nMEFILPQWX-\n>p2\nMEFILPQWX-\n>p3\nMEFILPQAK-\n'],
    ['aa-clustal', '>p1\nMEFILPQWX*\n>p2\nMEFILPQWXB\n'],
  ];
  const problems = [];
  for (const [scheme, fasta] of cases) {
    await loadFasta(page, fasta);
    await setScheme(page, scheme);
    await setMode(page, 'full');
    const dom = [];
    for (let pos = 0; pos < 10; pos++) dom.push(await cellStyle(page, 0, pos));
    await setMode(page, 'canvas');
    await page.waitForTimeout(300);
    const px = await page.evaluate(() => {
      const c = document.getElementById('alignmentCanvas');
      const m = _canvasState.metrics;
      const ctx = c.getContext('2d');
      const dpr = c.width / c.clientWidth;
      const out = [];
      for (let pos = 0; pos < 10; pos++) {
        const x = Math.floor((m.nameW + pos * m.charW - _canvasState.offsetX + 1) * dpr);
        // bottom-left corner of the cell: background, below uppercase glyphs
        const y = Math.floor((m.headerH - _canvasState.offsetY + m.charH - 2) * dpr);
        const d = ctx.getImageData(x, y, 1, 1).data;
        // an unshaded cell is left transparent on the white page
        out.push(d[3] === 0 ? '#ffffff' : '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''));
      }
      return out;
    });
    dom.forEach((d, pos) => { if (d && d.bg !== px[pos]) problems.push(`${scheme} col ${pos + 1}: Full ${d.bg}, Canvas ${px[pos]}`); });
  }
  return { pass: problems.length === 0, detail: problems.join('; ') };
});

check('rendering: a column of N (masked) is not shaded as conserved', async (page) => {
  await loadFasta(page, '>a\nANNA\n>b\nANNA\n>c\nANNA\n');
  await setScheme(page, 'monochrome');
  const n = await cellStyle(page, 0, 1), a = await cellStyle(page, 0, 0);
  return { pass: n.bg === '#ffffff' && a.bg === '#000000', detail: JSON.stringify({ n, a }) };
});

check('rendering: a column of X in a protein alignment is not shaded as conserved', async (page) => {
  await loadFasta(page, '>a\nMXXL\n>b\nMXXL\n>c\nMXXL\n');
  await setScheme(page, 'monochrome');
  const x = await cellStyle(page, 0, 1);
  return { pass: x.bg === '#ffffff', detail: JSON.stringify(x) };
});

check('rendering: X/B/Z/J get a neutral colour, not Gly/Pro/Cys\'s', async (page) => {
  await loadFasta(page, '>p1\nGXBZJ\n>p2\nGXBZJ\n');
  await setScheme(page, 'aa-clustal');
  const g = await cellStyle(page, 0, 0);
  const others = [];
  for (let pos = 1; pos < 5; pos++) others.push(await cellStyle(page, 0, pos));
  return { pass: others.every(o => o.bg === '#dddddd' && o.bg !== g.bg), detail: JSON.stringify({ g, others }) };
});

check('rendering: one X or * does not turn a nucleotide alignment into protein', async (page) => {
  await loadFasta(page, '>a\nACGTXACGT\n>b\nACGT*ACGT\n>c\nACGTACGTA\n');
  const r = await page.evaluate(() => isProteinAlignment());
  await loadFasta(page, '>p\nMKVLAAGW\n>q\nMKVLAAGW\n');
  const p = await page.evaluate(() => isProteinAlignment());
  return { pass: r === false && p === true, detail: JSON.stringify({ nucleotide: r, protein: p }) };
});

check('rendering: ungapped copies keep internal stop codons (*)', async (page) => {
  await loadFasta(page, '>a\nMK*L*-\n>b\nMKWLA-\n');
  const r = await page.evaluate(() => degapResidues(state.seqs[0].seq));
  return { pass: r === 'MK*L*', detail: r };
});

// ---------- layout ----------

async function hbar(page) {
  return page.evaluate(() => {
    window._syncHorizontalScrollbar && window._syncHorizontalScrollbar();
    const bar = document.querySelector('.horizontal-scrollbar');
    return { visible: getComputedStyle(bar).visibility !== 'hidden', overflow: bar.scrollWidth - bar.clientWidth };
  });
}

check('layout: the empty start page shows no horizontal scrollbar', async (page) => {
  const plain = await hbar(page);
  // the reported case: the bar a few pixels narrower than the alignment area
  await page.evaluate(() => { document.querySelector('.horizontal-scrollbar').style.width = 'calc(100% - 3px)'; });
  const narrower = await hbar(page);
  const ok = !plain.visible && plain.overflow <= 0 && !narrower.visible && narrower.overflow <= 0;
  return { pass: ok, detail: JSON.stringify({ plain, narrower }) };
});

check('layout: an alignment that fits shows no horizontal scrollbar; a wide one does', async (page) => {
  await loadFasta(page, '>a\nACGTACGTAC\n>b\nACGTACGTAA\n');
  await setMode(page, 'full');
  const fits = await hbar(page);
  await loadFasta(page, '>a\n' + 'ACGT'.repeat(1500) + '\n>b\n' + 'ACGA'.repeat(1500) + '\n');
  await setMode(page, 'full');
  await page.waitForTimeout(300);
  const wide = await hbar(page);
  await setMode(page, 'canvas');
  await page.waitForTimeout(300);
  const canvas = await hbar(page);
  const ok = !fits.visible && wide.visible && wide.overflow > 0 && canvas.visible && canvas.overflow > 0;
  return { pass: ok, detail: JSON.stringify({ fits, wide, canvas }) };
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
