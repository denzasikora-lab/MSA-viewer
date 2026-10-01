// JS (kmer-tree.js) vs the scipy oracle: distance matrices, merge heights and every cut must agree.
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const KT = require('../../kmer-tree.js'), { simulate } = require('./sim.js'), { ari, cutLabels } = require('./metrics.js');
const CASES = +process.env.CASES || 12; let bad = 0, cases = 0, ambiguous = 0;
for (let c = 0; c < CASES; c++) {
  const p = { groups: 2 + (c % 6), perGroup: 5 + (c % 7), between: 0.1 + (c % 5) * 0.1, within: 0.01 + (c % 4) * 0.02, truncate: c % 3 === 0 ? 0.5 : 0, singletons: c % 4, length: 150 + (c % 5) * 80, structure: c % 2 ? 'nested' : 'star' };
  const sim = simulate(p, 100 + c), n = sim.seqs.length, k = 3 + (c % 10);
  const file = path.join(os.tmpdir(), `kt_oracle_${c}.fa`); fs.writeFileSync(file, sim.seqs.map(s => `>${s.header}\n${s.seq}\n`).join(''));
  const r = spawnSync('python', [path.join(__dirname, 'oracle_scipy.py'), file, String(k)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.log('oracle failed', r.stderr.slice(0, 300)); process.exit(2); }
  const O = JSON.parse(r.stdout), t = KT.guideTree(sim.seqs, k);
  let maxDD = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) maxDD = Math.max(maxDD, Math.abs(O.dist[i][j] - t.dist[i][j]));
  const hJs = t.merges.map(m => m.d).sort((a, b) => a - b), hPy = O.heights.slice().sort((a, b) => a - b);
  let maxDH = 0; hJs.forEach((v, i) => { maxDH = Math.max(maxDH, Math.abs(v - hPy[i])); });
  // partitions at every cut must be the same wherever the cut is not inside a tie (equal merge heights)
  let cutBad = 0, cutChecked = 0;
  for (let g = 2; g < n; g++) {
    const m = n - g; const tie = (t.merges[m - 1].d === t.merges[m].d) || Math.abs(hPy[m - 1] - hPy[m]) < 1e-6;
    if (tie) continue; cutChecked++;
    if (ari(O.cuts[String(g)], cutLabels(t.merges, n, g)) < 1 - 1e-9) cutBad++;
  }
  cases++;
  if (O.margin < 1e-6) { ambiguous++; if (maxDD >= 1e-6) { bad++; console.log('DISTANCE MISMATCH', c); } continue; }   // tie: no unique tree to compare
  const ok = maxDD < 1e-6 && maxDH < 1e-5 && cutBad === 0;
  if (!ok) { bad++; console.log('MISMATCH case', c, { n, k, maxDD, maxDH, cutBad, cutChecked }); }
}
console.log(`${cases} cases vs scipy, ${bad} different (${ambiguous} had ties between candidate merges and were compared on distances only)`);
process.exit(bad ? 1 : 0);
