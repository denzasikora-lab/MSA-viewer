// Hand-built UPGMA merge lists on which the automatic number-of-groups choice has one obvious
// answer. Shape follows kmer-tree.js: merges are {i, j, d} in merge order with non-decreasing d,
// exactly n - 1 of them, and merge m joins the cluster holding leaf i to the (different) cluster
// holding leaf j. Every tree is assembled the same way: each block of leaves chains internally at
// tiny heights, blocks fuse with each other much higher, and size-1 strays latch on at the very
// top, so the wanted answer is the number of blocks with >= minSize leaves below the one large
// gap (the nested cases name the level that is wanted in `why`).

const LOW = 0.01, SLOW = 0.005; // within a block: 0.01, 0.015, 0.02 ...
const MID = 0.50, GAP = 0.05; // first block-to-block fusion at 0.50, then a shallow ramp
const TOP = 0.90; // strays latch on from here upwards

// blocks: list of block sizes (1 = a stray leaf, [size, low, step] overrides the within-heights).
// joins: list of [blockA, blockB, d] fusions of whole blocks.
function build(blocks, joins) {
  const rep = [], seq = [];
  let next = 0, o = 0;
  for (const b of blocks) {
    const size = Array.isArray(b) ? b[0] : b, lo = Array.isArray(b) ? b[1] : LOW, st = Array.isArray(b) ? b[2] : SLOW;
    rep.push(next);
    for (let t = 1; t < size; t++) seq.push({ i: next, j: next + t, d: lo + st * (t - 1), o: o++ });
    next += size;
  }
  for (const [a, b, d] of joins) seq.push({ i: rep[a], j: rep[b], d, o: o++ });
  seq.sort((x, y) => x.d - y.d || x.o - y.o); // heights never go back down
  return { n: next, merges: seq.map(m => ({ i: m.i, j: m.j, d: m.d })) };
}

// Fuse each of `ks` into block 0's growing cluster, one fusion per height: first, first + step, ...
const latch = (first, step, ks) => ks.map((k, i) => [0, k, first + step * i]);
const strays = k => Array.from({ length: k }, () => 1);
const upto = (a, b) => { const r = []; for (let k = a; k <= b; k++) r.push(k); return r; };

function T(name, blocks, joins, minSize, expected, why) {
  const b = build(blocks, joins);
  return { name, n: b.n, merges: b.merges, minSize, expected, why };
}

module.exports = [
  T('three-tight-groups', [5, 5, 5], latch(MID, GAP, [1, 2]), 3, 3,
    'The three blocks all close by 0.02 and none touches another before 0.50, so the cut goes just below that jump and each block is a group.'),
  T('six-blocks-uneven', [2, 3, 4, 5, 6, 9], latch(MID, GAP, upto(1, 5)), 2, 6,
    'Blocks of every size from 2 to 9 finish their own chains at 0.01 but wait until 0.50 to fuse, so six uneven groups is the answer.'),
  T('four-blocks-20-strays', [4, 4, 4, 4, ...strays(20)], latch(MID, GAP, [1, 2, 3]).concat(latch(TOP, GAP, upto(4, 23))), 3, 4,
    'Four tight blocks of 4 form below 0.02 while the 20 strays sit alone until 0.90, and with minSize 3 a lone leaf can never count.'),
  T('one-block-only', [12], [], 2, 1,
    'All eleven merges happen inside the single block between 0.01 and 0.06, so the only qualifying cluster is the whole set and the answer is one group.'),
  T('twenty-near-identical', [[20, 0.02, 0]], [], 2, 1,
    'All 19 merges share the single height 0.02, the signature of 20 near-identical leaves, so there is exactly one group.'),
  T('two-blocks-only', [8, 8], latch(0.60, GAP, [1]), 2, 2,
    'Two chains of 8 close at 0.01 and the single fusion between them is at 0.60, so the count is two and not one.'),
  T('nested-outer-level', [3, 3, 3, 3], [[0, 1, 0.08], [2, 3, 0.09], [0, 2, 0.55]], 3, 2,
    'The outer level is wanted: four tight triples pair off at 0.08 to 0.09, barely above their own chains, while the two pairs only meet at 0.55.'),
  T('nested-inner-level', [4, 4, 4, 4], [[0, 1, 0.20], [2, 3, 0.22], [0, 2, 0.24]], 3, 4,
    'The inner level is wanted: the pair fusions at 0.20 and 0.22 and the root fusion at 0.24 sit in one narrow band well above the 0.01 to 0.02 chains, so nothing above the four blocks is worth reporting.'),
  T('ten-triples', Array.from({ length: 10 }, () => 3), latch(MID, GAP, upto(1, 9)), 3, 10,
    'Every triple closes at 0.015 and the first 3-with-3 fusion waits until 0.50, so the obvious count is ten.'),
  T('one-jump-flat-below', Array.from({ length: 5 }, () => [4, 0.10, 0]), latch(0.60, 0.005, upto(1, 4)), 3, 5,
    'The fifteen within-group merges all sit at the identical height 0.10 and the four fusions just above 0.60, so one jump carries all the signal and the cut belongs just below it.'),
  T('giant-plus-two', [30, 3, 4], latch(MID, GAP, [1, 2]), 3, 3,
    'A 30-member block and two small blocks all pass minSize at 0.015 and stay apart until 0.50, so the truth is three groups and not one giant group.'),
  T('twelve-pairs', Array.from({ length: 12 }, () => 2), latch(MID, 0.04, upto(1, 11)), 2, 12,
    'Twelve pairs close at 0.01 and only start fusing with each other at 0.50, so with minSize 2 all twelve count.'),
  T('satellites-below-minsize', [5, 5, 5, 5, 2, 2, 2], latch(MID, GAP, [1, 2, 3]).concat(latch(0.80, GAP, upto(4, 6))), 3, 4,
    'Four blocks of 5 qualify near 0.015 while the three size-2 satellites never reach minSize 3 and join the rest only at 0.80 and above, so four groups.'),
  T('tight-and-loose', [[10, 0.005, 0.005], [10, 0.15, 0.01]], latch(MID, GAP, [1]), 2, 2,
    'A tight chain rising to 0.045 and a loose chain spanning 0.15 to 0.23 both stand well clear of their 0.50 fusion, so a group of each tightness is reported.')
];

// Run directly to check that every export is a legal UPGMA merge list: node tests/kmer/adversarial/trees1.js
if (require.main === module) {
  let bad = 0;
  for (const c of module.exports) {
    const p = Array.from({ length: c.n }, (_, i) => i);
    const f = x => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    let roots = c.n, err = '';
    if (c.merges.length !== c.n - 1) err = c.merges.length + ' merges for ' + c.n + ' leaves';
    for (let k = 0; !err && k < c.merges.length; k++) {
      const m = c.merges[k];
      if (m.i === m.j || m.i < 0 || m.j < 0 || m.i >= c.n || m.j >= c.n) err = 'merge ' + k + ' has a bad leaf index';
      else if (k && c.merges[k - 1].d > m.d + 1e-12) err = 'height drops at merge ' + k;
      else { const a = f(m.i), b = f(m.j); if (a === b) err = 'merge ' + k + ' fuses a cluster with itself'; else { p[b] = a; roots--; } }
    }
    if (!err && roots !== 1) err = roots + ' clusters left at the end';
    if (err) { bad++; console.log(c.name + ': ' + err); }
  }
  console.log(module.exports.length + ' trees, ' + bad + ' bad');
  process.exit(bad ? 1 : 0);
}
