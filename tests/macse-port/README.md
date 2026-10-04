# macse-align.js tests

`macse-align.js` is a port of MACSE v2.07 `alignSequences` (official jar, sha256
`96873a1465f1e1aa9d0c462d469eee6954d36e8639727f69f34a72fcb6583963`). Its only goal is to give the same output
as MACSE. Do not tune or "improve" its results: any change must keep every check below identical.

## Checks

| script | what it checks |
|---|---|
| `run_fixtures.js [dir] [id,id,...] [--async=N]` | the port on `tests/codon-align/fixtures/<id>.in.fna` against MACSE's raw output `<id>.macse_NT.fna` as strings (names, row order, every `!` and `-`); `--async=N` runs the parallel path with an N-thread pool. Exits 1 on any difference. |
| `run_corpus.js [--async N] [--dir d] [--opts JSON] [id,...]` | the same on random coding-sequence sets (`corpus/`, 60 sets of 2 to 16 sequences with frameshifts, stops, codon indels, truncated ends, N/R/Y, lower case; MACSE outputs in `corpus/out`), nucleotides and amino acids. `--opts '{"tileSize":9,"tileMinCells":0}'` forces every profile alignment into small tiles. |
| `worker_test.js` | `macse-worker.js` and `codon-align-worker.js` in Node vm contexts: input order, names and letters (case, U, IUPAC) kept, `!` written as `-`, progress, refusals, the pool-member role, fast engine separate. |
| `make_corpus.js out [count] [seed] [scale]` | generates corpora (default: the 60 sets in `corpus/`; `200 777 2` gives the larger 200-set corpus used on the cluster, up to 24 sequences and 2.4 kb). |
| `shard.js macse_dir ids out.tsv [threads]` | full-scale runner for the hamster gene set (MACSE inputs in `in/`, outputs in `aln_NT/`). |
| `macse-align.reference.js` | the first version that matched MACSE on all 24 fixtures, before any speed-up; kept for comparisons. |

## Speed-ups (all lossless)

- `gen_dp.js` writes the dynamic-programming kernel unrolled, in JavaScript (`dpCore`, `dpTile` in `macse-align.js`)
  and AssemblyScript (`dpcore.ts`); `build_wasm.js` compiles the latter to `macse-dp-wasm.js` (needs `npx`).
  Same moves, order and comparisons as MACSE's `ProfileAligner.findBestMovement`.
- `alignSequencesAsync` keeps MACSE's control flow and order but computes ahead, in parallel: guide-tree merges whose
  subtrees are finished, and the refinement cuts after the last accepted one (results are used in MACSE's order and
  dropped when an earlier cut is accepted). Large profile alignments are split into tiles (each tile needs the last
  3 rows and columns of its neighbours) and each tile builds its own profile range.
- `node_pool.js` is the Node thread pool; `macse-worker.js` has the browser one (nested workers).

## Results

- 2026-10-04, first port: 2,636 of 2,636 hamster BUSCO alignments identical to MACSE (DRAGEN), 24/24 fixtures, 60/60
  corpus sets, and identical with changed `-fs`, `-stop`, `-gap_op`, `-optim 1`, `-max_refine_iter 0`.
- 2026-10-04, parallel version before tiling: 200/200 sets of the larger corpus identical (Monsoon).
- Final checks of the tiled parallel version: see the Hamster project notes.

To compare against MACSE on new data, run MACSE and the port on the same FASTA (same sequence order):

```
java -jar macse_v2.07.jar -prog alignSequences -seq in.fna -out_NT macse_NT.fna -out_AA macse_AA.faa
node -e "const M=require('./macse-align.js'),fs=require('fs');process.stdout.write(M.toFasta(M.alignSequences(M.parseFasta(fs.readFileSync('in.fna','utf8'))).nt))" > port_NT.fna
```
