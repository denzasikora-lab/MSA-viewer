# macse-align.js tests

`macse-align.js` is a port of MACSE v2.07 `alignSequences` (official jar, sha256
`96873a1465f1e1aa9d0c462d469eee6954d36e8639727f69f34a72fcb6583963`). Its only goal is to give the same output
as MACSE. Do not tune or "improve" it: any change must keep every check below identical.

| script | what it checks |
|---|---|
| `run_fixtures.js [dir] [id,id,...]` | runs the port on `tests/codon-align/fixtures/<id>.in.fna` and compares with MACSE's raw output `<id>.macse_NT.fna` as strings (names, row order, every `!` and `-`); exits 1 on any difference. The regression suite runs 3 small genes; run it without arguments for all 24. |
| `worker_test.js` | the ViewAlign worker wrapper: input row order and names restored, user letters kept (case, U, IUPAC), `!` written as `-` (or kept with `frameRestored: false`), progress messages, protein and single-sequence input refused, fast engine still reachable. |
| `macse-align.reference.js` | the first version that matched MACSE on all 24 fixtures, before the dynamic-programming loop was optimised; kept for comparing outputs after future optimisations. |

Full-scale check (2026-10-04): the port against MACSE's own alignments of 2,636 four-species hamster BUSCO genes
(re-predicted gene models, default settings), on the DRAGEN server, `/staging/tmp/sok_genes/macse_port/`
(`shard.js`, results in `shards/out_*.tsv`): 2,636 of 2,636 alignments identical to MACSE's raw output, 0 different,
0 errors (the 25 genes MACSE could not align, 22 timeouts and 3 failures, were not compared).

To compare against MACSE on new data, run MACSE and the port on the same FASTA (same sequence order) and compare
the parsed records:

```
java -jar macse_v2.07.jar -prog alignSequences -seq in.fna -out_NT macse_NT.fna -out_AA macse_AA.faa
node -e "const M=require('./macse-align.js'),fs=require('fs');process.stdout.write(M.toFasta(M.alignSequences(M.parseFasta(fs.readFileSync('in.fna','utf8'))).nt))" > port_NT.fna
```
