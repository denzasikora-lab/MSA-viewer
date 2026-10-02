// Loads and VALIDATES the scenario modules in tests/kmer/scenarios/ (written by GLM to tests/kmer/SCENARIO_CONTRACT.md),
// then scores every valid one. Usage:  node tests/kmer/scenarios.js [--validate] [--seeds 2]
const fs = require('fs'), path = require('path');
const KT = require('../../kmer-tree.js'), { ari } = require('./metrics.js');
const DIR = path.join(__dirname, 'scenarios');
const args = process.argv.slice(2);
const SEEDS = +(args[args.indexOf('--seeds') + 1] || 2) || 2, VALIDATE_ONLY = args.includes('--validate');

function pDist(a, b) { let d = 0, n = 0; for (let i = 0; i < a.length; i++) { const x = a[i].toUpperCase(), y = b[i].toUpperCase(); if (!'ACGTU'.includes(x) || !'ACGTU'.includes(y)) continue; n++; if (x.replace('U', 'T') !== y.replace('U', 'T')) d++; } return n >= 20 ? d / n : null; }

function validate(mod, file) {
  const errs = [], info = {};
  if (!mod || typeof mod.generate !== 'function') return { errs: ['no generate()'], info };
  for (const f of ['id', 'title', 'describe']) if (typeof mod[f] !== 'string' || !mod[f]) errs.push('missing ' + f);
  let r1, r2, ms;
  try { const t0 = Date.now(); r1 = mod.generate(1); ms = Date.now() - t0; r2 = mod.generate(1); } catch (e) { return { errs: ['generate threw: ' + e.message], info }; }
  if (ms > 3000) errs.push('slow: ' + ms + ' ms');
  if (JSON.stringify(r1) !== JSON.stringify(r2)) errs.push('not deterministic in the seed');
  if (JSON.stringify(mod.generate(2)) === JSON.stringify(r1)) errs.push('seed has no effect');
  const { seqs, labels } = r1 || {};
  if (!Array.isArray(seqs) || !Array.isArray(labels)) return { errs: errs.concat('seqs/labels not arrays'), info };
  if (seqs.length !== labels.length) errs.push(`seqs ${seqs.length} != labels ${labels.length}`);
  if (seqs.length < 30 || seqs.length > 400) errs.push('sequence count ' + seqs.length + ' outside 30-400');
  if (!seqs.every(s => s && typeof s.seq === 'string' && typeof s.header === 'string')) return { errs: errs.concat('bad seq entries'), info };
  const L = seqs[0].seq.length;
  if (!seqs.every(s => s.seq.length === L)) errs.push('rows have different lengths');
  if (L < 60 || L > 3000) errs.push('length ' + L + ' outside 60-3000');
  if (!labels.every(Number.isInteger)) errs.push('labels not integers');
  if (new Set(seqs.map(s => s.header)).size < seqs.length) errs.push('duplicate headers');
  const minSize = Number.isInteger(r1.minSize) ? r1.minSize : 3;
  const cnt = new Map(); labels.forEach(l => cnt.set(l, (cnt.get(l) || 0) + 1));
  const big = [...cnt.entries()].filter(([, v]) => v >= minSize).map(([l]) => l);
  info.n = seqs.length; info.L = L; info.groups = big.length; info.noise = labels.filter(l => cnt.get(l) < minSize).length;
  const lax = /no structure|no real group|adversarial|arbitrary|defeat|continuum/i.test((r1.notes || '') + ' ' + (mod.describe || ''));
  if (big.length < 2 && !lax) errs.push('fewer than 2 true groups');
  // realised divergence: within vs between (groups >= minSize), sampled pairs
  let w = 0, wn = 0, b = 0, bn = 0;
  for (let t = 0; t < 4000; t++) {
    const i = Math.floor(((t * 7919) % 100003) / 100003 * seqs.length), j = Math.floor(((t * 104729 + 13) % 100019) / 100019 * seqs.length);
    if (i === j || !big.includes(labels[i]) || !big.includes(labels[j])) continue;
    const d = pDist(seqs[i].seq, seqs[j].seq); if (d === null) continue;
    if (labels[i] === labels[j]) { w += d; wn++; } else { b += d; bn++; }
  }
  info.within = wn ? w / wn : null; info.between = bn ? b / bn : null;
  if (!lax && wn && bn && info.within >= info.between) errs.push(`labels meaningless: within ${info.within.toFixed(3)} >= between ${info.between.toFixed(3)}`);
  const alpha = new Set(seqs.flatMap(s => s.seq.split('')));
  info.alphabet = [...alpha].sort().join('');
  return { errs, info, sample: r1 };
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort() : [];
const valid = [];
console.log('validation');
for (const f of files) {
  let mod; try { mod = require(path.join(DIR, f)); } catch (e) { console.log(`  REJECT ${f}: load error ${e.message.slice(0, 120)}`); continue; }
  const v = validate(mod, f);
  const i = v.info;
  console.log(`  ${v.errs.length ? 'REJECT' : 'ok    '} ${f.padEnd(28)} n=${i.n} L=${i.L} groups=${i.groups} noise=${i.noise} within=${i.within != null ? i.within.toFixed(3) : '-'} between=${i.between != null ? i.between.toFixed(3) : '-'} ${v.errs.length ? ' <- ' + v.errs.join('; ') : ''}`);
  if (!v.errs.length) valid.push(mod);
}
console.log(`${valid.length} of ${files.length} scenarios valid`);
if (VALIDATE_ONLY) process.exit(0);

const CONFIGS = [['pdist', 6], ['jaccard', 4], ['jaccard', 6], ['jaccard', 8]];
console.log('\nrecovery (ARI vs the scenario labels; noise sequences = unassigned is correct)');
console.log('scenario'.padEnd(26) + CONFIGS.map(([m, k]) => (m === 'pdist' ? 'aligned' : 'k=' + k).padStart(10) + '/auto' + ''.padStart(1)).join('') + CONFIGS.map(([m, k]) => ((m === 'pdist' ? 'aligned' : 'k=' + k) + '/given').padStart(16)).join(''));
const totals = CONFIGS.map(() => [0, 0]);
for (const mod of valid) {
  const row = [], row2 = [];
  CONFIGS.forEach(([metric, k], ci) => {
    let a = 0, g = 0, cnt = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = mod.generate(seed), n = r.seqs.length, minSize = Number.isInteger(r.minSize) ? r.minSize : 3;
      const c = new Map(); r.labels.forEach(l => c.set(l, (c.get(l) || 0) + 1));
      const truth = r.labels.map((l, i) => c.get(l) >= minSize ? 'g' + l : 'n' + i), G = [...c.values()].filter(v => v >= minSize).length;
      const t = KT.guideTree(r.seqs, k, { metric, canonical: !!process.env.CANON });
      const lab = cut => { const out = new Array(n); cut.groups.forEach((gr, gi) => gr.forEach(i => { out[i] = 'g' + gi; })); cut.unassigned.forEach(i => { out[i] = 'u' + i; }); return out; };
      a += ari(truth, lab(KT.cutTree(t, 'auto', minSize))); g += ari(truth, lab(KT.cutTree(t, Math.max(1, G), minSize))); cnt++;
    }
    row.push(a / cnt); row2.push(g / cnt); totals[ci][0] += a / cnt; totals[ci][1] += g / cnt;
  });
  console.log(mod.id.padEnd(26) + row.map(v => v.toFixed(2).padStart(15)).join('') + row2.map(v => v.toFixed(2).padStart(16)).join(''));
}
if (valid.length) console.log('MEAN'.padEnd(26) + totals.map(t => (t[0] / valid.length).toFixed(2).padStart(15)).join('') + totals.map(t => (t[1] / valid.length).toFixed(2).padStart(16)).join(''));
