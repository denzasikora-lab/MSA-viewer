// The release version must agree everywhere it is written: package.json,
// script.js (RELEASE_VERSION, shown in the viewer), CITATION.cff and
// .zenodo.json when present, and the git tag when HEAD is tagged.
//
//   node tests/meta/version.test.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const found = {};
found['package.json'] = JSON.parse(read('package.json')).version;
found['script.js RELEASE_VERSION'] = (read('script.js').match(/const RELEASE_VERSION = '([^']+)'/) || [])[1];
if (fs.existsSync(path.join(ROOT, 'CITATION.cff'))) {
  found['CITATION.cff'] = (read('CITATION.cff').match(/^version:\s*"?([^"\n]+)"?/m) || [])[1];
}
if (fs.existsSync(path.join(ROOT, '.zenodo.json'))) {
  found['.zenodo.json'] = JSON.parse(read('.zenodo.json')).version;
}
try {
  const tags = execFileSync('git', ['tag', '--points-at', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(t => /^v\d+\.\d+\.\d+/.test(t));
  if (tags.length) found['git tag'] = tags[0].replace(/^v/, '');
} catch (_) { /* not a git checkout */ }

const values = new Set(Object.values(found));
const semver = /^\d+\.\d+\.\d+$/.test(found['package.json'] || '');
console.log(Object.entries(found).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
if (values.size === 1 && !values.has(undefined) && semver) {
  console.log('version is consistent');
} else {
  console.log('FAIL: version differs between files (or is not x.y.z)');
  process.exit(1);
}
