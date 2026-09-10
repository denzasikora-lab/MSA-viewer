/*
 * Parity test: block-mask.js computeBlockMask() must reproduce the committed
 * reference/emit_fixture.py output for each fixture under tests/fixtures/blockmask/.
 *
 * Run:  node tests/blockmask/parity.js
 * Exits 0 if all fixtures match, 1 otherwise.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var BM = require('../../block-mask.js');

var FIXDIR = path.join(__dirname, '..', 'fixtures', 'blockmask');
var PRESETS = require('../../reference/granularity_presets.json');

var FIXTURES = ['oma_SINE16b', 'synth_unbalanced', 'synth_gradient'];

function loadFixture(name) {
  var fasta = fs.readFileSync(path.join(FIXDIR, name + '.aln.fa'), 'utf8');
  var expected = JSON.parse(fs.readFileSync(path.join(FIXDIR, name + '.expected.json'), 'utf8'));
  return { fasta: fasta, expected: expected };
}

function arrEq(a, b) {
  if (a === 'all' || b === 'all') return a === b;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function diffBlocks(got, exp) {
  var problems = [];
  if (got.length !== exp.length) {
    problems.push('block count: got ' + got.length + ', expected ' + exp.length);
  }
  var n = Math.min(got.length, exp.length);
  for (var i = 0; i < n; i++) {
    var g = got[i], e = exp[i];
    var fields = ['type', 'col_start', 'col_end'];
    for (var f = 0; f < fields.length; f++) {
      var k = fields[f];
      if (g[k] !== e[k]) problems.push('block[' + i + '].' + k + ': got ' + JSON.stringify(g[k]) + ', expected ' + JSON.stringify(e[k]));
    }
    var gr = g.hasOwnProperty('group_rank') ? g.group_rank : undefined;
    var er = e.hasOwnProperty('group_rank') ? e.group_rank : undefined;
    if (gr !== er) problems.push('block[' + i + '].group_rank: got ' + JSON.stringify(gr) + ', expected ' + JSON.stringify(er));
    if (!arrEq(g.rows, e.rows)) {
      problems.push('block[' + i + '].rows: got ' + JSON.stringify(g.rows) + ', expected ' + JSON.stringify(e.rows));
    }
  }
  return problems;
}

function run() {
  var failed = 0;
  FIXTURES.forEach(function (name) {
    var fx;
    try {
      fx = loadFixture(name);
    } catch (err) {
      console.log('FAIL ' + name + ' — cannot load fixture: ' + err.message);
      failed++;
      return;
    }
    var presetName = fx.expected.preset || 'V3_medium';
    var preset = PRESETS[presetName];
    if (!preset) {
      console.log('FAIL ' + name + ' — unknown preset ' + presetName);
      failed++;
      return;
    }
    var got = BM.computeBlockMask(fx.fasta, preset, { alignmentId: fx.expected.alignment_id, preset: presetName });
    var exp = fx.expected;
    var problems = [];

    ['n_rows', 'n_cols', 'elem_col_start', 'elem_col_end'].forEach(function (k) {
      if (got[k] !== exp[k]) problems.push(k + ': got ' + got[k] + ', expected ' + exp[k]);
    });
    if (!arrEq(got.row_headers, exp.row_headers)) {
      problems.push('row_headers differ (got ' + got.row_headers.length + ', expected ' + exp.row_headers.length + ')');
    }
    problems = problems.concat(diffBlocks(got.blocks, exp.blocks));

    if (problems.length) {
      console.log('FAIL ' + name + ' (' + presetName + ')');
      problems.slice(0, 20).forEach(function (p) { console.log('   ' + p); });
      if (problems.length > 20) console.log('   ... +' + (problems.length - 20) + ' more');
      failed++;
    } else {
      console.log('PASS ' + name + ' (' + presetName + ') — ' + got.blocks.length + ' blocks');
    }
  });

  console.log('');
  console.log(failed ? (failed + ' fixture(s) FAILED') : 'all fixtures PASS');
  process.exit(failed ? 1 : 0);
}

run();
