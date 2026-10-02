// Runs every hand-built tree in tests/kmer/adversarial/trees*.js through the product cutTree.
// A tree is first validated (n-1 merges, non-decreasing d, each merge joins two different clusters).
const fs = require('fs'), path = require('path'), KT = require('../../../kmer-tree.js');
let bad = 0, miss = 0, total = 0;
for (const f of fs.readdirSync(__dirname).filter(x => /^trees.*\.js$/.test(x)).sort()) {
  for (const t of require(path.join(__dirname, f))) {
    total++;
    const par = Array.from({ length: t.n }, (_, i) => i), find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
    let err = t.merges.length !== t.n - 1 ? 'merges != n-1' : '';
    t.merges.forEach((m, k) => { if (err) return; if (k && m.d < t.merges[k - 1].d) err = 'heights decrease'; const a = find(m.i), b = find(m.j); if (a === b) err = 'merge within one cluster'; else par[b] = a; });
    if (err) { bad++; console.log('INVALID ', f, t.name, err); continue; }
    let r; try { r = KT.cutTree({ n: t.n, merges: t.merges, order: [...Array(t.n).keys()], k: 6, metric: 'jaccard' }, 'auto', t.minSize || 1); } catch (e) { bad++; console.log('THROWS  ', f, t.name, e.message); continue; }
    const got = r.groups.length, ok = got === t.expected;
    if (!ok) miss++;
    console.log((ok ? 'ok      ' : 'DIFFERS ') + `${f} ${t.name}: expected ${t.expected}, got ${got}  warn=[${(r.warnings || []).map(w => w.code || w).join(',')}]${ok ? '' : '  // ' + t.why}`);
  }
}
console.log(`${total} trees, ${bad} invalid/throwing, ${miss} differ from the human count`);
