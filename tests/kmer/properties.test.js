// Properties that must hold for ANY data: the grouping must not depend on things that carry no information.
const KT = require('../../kmer-tree.js'), { simulate } = require('./sim.js'), { ari } = require('./metrics.js');
let failed = 0, checks = 0;
function labelsOf(seqs, opts, groups = 'auto', min = 3) {
  const t = KT.guideTree(seqs, opts.k || 6, { metric: opts.metric }), c = KT.cutTree(t, groups, min), out = new Array(seqs.length);
  c.groups.forEach((g, gi) => g.forEach(i => { out[i] = 'g' + gi; })); c.unassigned.forEach(i => { out[i] = 'u' + i; }); return { out, c };
}
const same = (a, b) => ari(a, b) > 1 - 1e-9;
function prop(name, ok, detail) { checks++; if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + (detail || '')}`); }
const map = (seqs, f) => seqs.map(s => ({ header: s.header, seq: f(s.seq) }));
const COMP = { A: 'T', C: 'G', G: 'C', T: 'A', a: 't', c: 'g', g: 'c', t: 'a', U: 'A', u: 'a' };

const scen = [
  simulate({ groups: 6, perGroup: 10, between: 0.25, within: 0.03, singletons: 12 }, 21),
  simulate({ groups: 4, perGroup: 15, between: 0.15, within: 0.02, truncate: 0.5, length: 500 }, 22),
  simulate({ groups: 8, perGroup: 6, between: 0.3, within: 0.04, structure: 'nested' }, 23),
];
for (const metric of ['pdist', 'jaccard']) for (const k of [5, 8]) {
  if (metric === 'pdist' && k !== 5) continue;
  const tag = `${metric}${metric === 'jaccard' ? ' k=' + k : ''}`;
  scen.forEach((sim, si) => {
    const base = labelsOf(sim.seqs, { metric, k }).out;
    const n = sim.seqs.length;
    // reverse every sequence (reading order): k-mers are reversed one-to-one, columns just mirror
    prop(`${tag} s${si}: reversed sequences give the same groups`, same(base, labelsOf(map(sim.seqs, s => s.split('').reverse().join('')), { metric, k }).out));
    // complement every base
    prop(`${tag} s${si}: complemented bases give the same groups`, same(base, labelsOf(map(sim.seqs, s => s.replace(/[ACGTUacgtu]/g, c => COMP[c])), { metric, k }).out));
    // case and U/T carry no information
    prop(`${tag} s${si}: lower case + U for T give the same groups`, same(base, labelsOf(map(sim.seqs, s => s.toLowerCase().replace(/t/g, 'u')), { metric, k }).out));
    // all-gap columns added anywhere change nothing (aligned distance), or only shift (k-mer)
    prop(`${tag} s${si}: extra all-gap columns give the same groups`, same(base, labelsOf(map(sim.seqs, s => '----' + s.slice(0, 50) + '--' + s.slice(50) + '-----'), { metric, k }).out));
    // row order
    const idx = sim.seqs.map((_, i) => i); let x = 99 + si; for (let i = n - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const shuf = labelsOf(idx.map(i => sim.seqs[i]), { metric, k }).out;
    const back = new Array(n); idx.forEach((orig, pos) => { back[orig] = shuf[pos]; });
    prop(`${tag} s${si}: shuffled rows give the same groups`, same(base, back));
  });
}
// the aligned-columns distance does not use k at all
scen.forEach((sim, si) => prop(`pdist s${si}: result does not depend on k`, same(labelsOf(sim.seqs, { metric: 'pdist', k: 4 }).out, labelsOf(sim.seqs, { metric: 'pdist', k: 11 }).out)));
// asking for the number of groups that Auto found gives the same groups
scen.forEach((sim, si) => {
  const a = labelsOf(sim.seqs, { metric: 'pdist' }); const G = a.c.groups.length;
  prop(`pdist s${si}: asking for Auto's own number (${G}) gives Auto's groups`, same(a.out, labelsOf(sim.seqs, { metric: 'pdist' }, G).out));
});
// every sequence is in exactly one group or unassigned; sizes respect Min size
scen.forEach((sim, si) => {
  for (const min of [1, 2, 3, 5]) {
    const c = KT.cutTree(KT.guideTree(sim.seqs, 6, { metric: 'pdist' }), 'auto', min), seen = new Set(); let dup = 0;
    c.groups.forEach(g => g.forEach(i => { if (seen.has(i)) dup++; seen.add(i); })); c.unassigned.forEach(i => { if (seen.has(i)) dup++; seen.add(i); });
    prop(`s${si} min ${min}: partition covers every sequence once, groups >= min`, dup === 0 && seen.size === sim.seqs.length && c.groups.every(g => g.length >= min));
  }
});
// degenerate inputs found by the GLM audit: one sequence must not throw; identical sequences are ONE group
{
  const S = 'ACGTTGCAAGCTTAGGCTAACGTTAGCTAGCTAAGCTTGACG', mk = n => [...Array(n).keys()].map(i => ({ id: 'r' + i, seq: S }));
  let ok1 = true; try { const c = KT.cutTree(KT.guideTree(mk(1), 6, { metric: 'jaccard' }), 'auto', 1); ok1 = c.groups.length === 1; } catch (e) { ok1 = false; }
  prop('one sequence: cutTree does not throw, gives one group', ok1);
  for (const [n, min] of [[2, 1], [3, 1], [5, 2], [12, 3]]) {
    const c = KT.cutTree(KT.guideTree(mk(n), 6, { metric: 'jaccard' }), 'auto', min);
    prop(`${n} identical sequences, min ${min}: one group of ${n}`, c.groups.length === 1 && c.groups[0].length === n);
  }
}
// chain (single) linkage: heights match a naive single-linkage reference and never decrease
{
  const naive = (D, n) => { let cl = Array.from({ length: n }, (_, i) => [i]); const hs = [];
    while (cl.length > 1) { let b = Infinity, bi = 0, bj = 1;
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { let m = Infinity; cl[i].forEach(x => cl[j].forEach(y => { if (D[x][y] < m) m = D[x][y]; })); if (m < b) { b = m; bi = i; bj = j; } }
      hs.push(b); cl[bi] = cl[bi].concat(cl[bj]); cl.splice(bj, 1); }
    return hs; };
  let okH = true, okMono = true, okPerm = true;
  for (let seed = 1; seed <= 6; seed++) {
    const sim = simulate({ groups: 4, perGroup: 6, between: 0.2, within: 0.04, truncate: 0.6, length: 300 }, seed), n = sim.seqs.length;
    const t = KT.guideTree(sim.seqs, 6, { metric: 'pdist', linkage: 'single' }), ref = naive(t.dist, n);
    t.merges.forEach((m, i) => { if (Math.abs(m.d - ref[i]) > 1e-6) okH = false; if (i && m.d < t.merges[i - 1].d - 1e-9) okMono = false; });
    if (new Set(t.order).size !== n) okPerm = false;
  }
  prop('chain linkage: merge heights equal a naive single-linkage reference', okH);
  prop('chain linkage: heights never decrease', okMono);
  prop('chain linkage: leaf order is a permutation', okPerm);
}
process.exit(failed ? 1 : 0);
