'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ALIGN_SOURCE = path.join(__dirname, '..', '..', 'script' + '.js');
const DRAW_SOURCE = path.join(__dirname, '..', '..', 'tree-draw' + '.js');
const ALIGN_BASENAME = path.basename(ALIGN_SOURCE);
const DRAW_BASENAME = path.basename(DRAW_SOURCE);

const FIXTURES = [
  { id: 'ident-raw', a: 'ACGTACGT', b: 'ACGTACGT', model: 'raw' },
  { id: 'ident-jc', a: 'ACGTACGT', b: 'ACGTACGT', model: 'jc69' },
  { id: 'ident-k80', a: 'ACGTACGT', b: 'ACGTACGT', model: 'k80' },
  { id: 'ti-raw', a: 'ACGTACGT', b: 'GCGTACGT', model: 'raw' },
  { id: 'ti-jc', a: 'ACGTACGT', b: 'GCGTACGT', model: 'jc69' },
  { id: 'ti-k80', a: 'ACGTACGT', b: 'GCGTACGT', model: 'k80' },
  { id: 'tv-raw', a: 'ACGTACGT', b: 'CCGTACGT', model: 'raw' },
  { id: 'tv-jc', a: 'ACGTACGT', b: 'CCGTACGT', model: 'jc69' },
  { id: 'tv-k80', a: 'ACGTACGT', b: 'CCGTACGT', model: 'k80' },
  { id: 'sat-jc', a: 'ACGTACGT', b: 'TGCATGCA', model: 'jc69' },
  { id: 'sat-k80', a: 'ACGTACGT', b: 'TGCATGCA', model: 'k80' },
  { id: 'gap-raw', a: 'ACGTACGT', b: '--------', model: 'raw' },
  { id: 'utrans', a: 'ACGUACGU', b: 'ACGTACGT', model: 'raw' },
  { id: 'ambig', a: 'ACGTACGN', b: 'ACGTACGT', model: 'raw' }
];

const TREE_SEQS = [
  { header: 'Alpha one', seq: 'ACGTACGT' },
  { header: 'Alpha two', seq: 'ACGTACGT' },
  { header: 'beta', seq: 'GCGTACGT' },
  { header: "O'Brien", seq: 'ACGTACGT' }
];

function loadTreeFns() {
  const src = fs.readFileSync(ALIGN_SOURCE, 'utf8');
  const start = src.indexOf('function _treeIsBase');
  const end = src.indexOf('function getTreeInputSequences');
  if (start < 0 || end < 0 || end <= start) throw new Error('tree functions not found');
  const sandbox = {};
  vm.runInNewContext(src.slice(start, end), sandbox, { filename: 'tree-fns.js' });
  return sandbox;
}

function cite(text, re) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return { line: i + 1, quote: lines[i].trim() };
  }
  throw new Error('cite failed: ' + re);
}

function collectAudit() {
  throw new Error('NotImplementedError');
}

function main() {
  const audit = collectAudit();
  const text = JSON.stringify(audit, function (_key, value) {
    return value === Infinity || value === -Infinity ? 'Infinity' : value;
  });
  fs.writeFileSync(path.join(__dirname, 'audit-report.json'), text);
  process.stdout.write(text + '\n');
}

module.exports = {
  FIXTURES, TREE_SEQS, ALIGN_BASENAME, DRAW_BASENAME, loadTreeFns, collectAudit
};

if (require.main === module) main();
