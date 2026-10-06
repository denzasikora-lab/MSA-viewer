# Third-party components and data

ViewAlign's own code is MIT-licensed (`LICENSE`). The components and data below
come from elsewhere; each keeps its own licence.

## Code shipped with the viewer

| Component | Files | Licence | Notice |
|---|---|---|---|
| MAFFT v7.525 core (Katoh & Standley), compiled to WebAssembly | `disttbfast.js`, `disttbfast.wasm` | BSD | `LICENSE-MAFFT` |
| Emscripten runtime (generated glue code inside `disttbfast.js`) | `disttbfast.js` | MIT (Emscripten authors) | https://github.com/emscripten-core/emscripten/blob/main/LICENSE |
| MACSE v2.07 `alignSequences`, ported to JavaScript (Ranwez et al. 2011, 2018) | `macse-align.js`, `macse-worker.js`, `macse-dp-wasm.js`, `tests/macse-port/*` | CeCILL 2.1 | `LICENSE-MACSE` |
| @gmod/cram v14.1.1 (JBrowse CRAM reader), unmodified browser bundle | `vendor/gmod-cram/` | MIT | `vendor/gmod-cram/LICENSE`, `vendor/gmod-cram/README.md` |
| is-buffer (Feross Aboukhadijeh), inside the CRAM bundle | `vendor/gmod-cram/cram-bundle.js` | MIT | `vendor/gmod-cram/cram-bundle.js.LICENSE.txt` |

### How the CeCILL 2.1 part sits next to the MIT code

The MACSE port runs in its own Web Worker (`macse-worker.js`), which loads only
CeCILL-licensed files. The MIT-licensed viewer starts that worker and exchanges
messages with it (`postMessage`); it does not include or link MACSE code. In
CeCILL 2.1 terms the viewer is an *External Module* (Article 1: not derived from
the Software, running in a separate address space and calling it), which
Article 5.3.3 allows to be distributed under its own licence. The MACSE port
itself, including any change to it, stays under CeCILL 2.1.

## Example and test data

| Files | Source | Licence |
|---|---|---|
| `examples/real/bp_*` | Biopython test suite | Biopython License / BSD 3-Clause (`examples/real/LICENSES/Biopython-LICENSE.rst`) |
| `examples/real/htslib_*` | htslib test data | MIT/Expat (`examples/real/LICENSES/htslib-LICENSE`) |
| `examples/real/pysam_*` | pysam test data | MIT (`examples/real/LICENSES/pysam-COPYING`) |
| `examples/real/ncbi_*` | NCBI RefSeq | public, no NCBI restrictions |
| `examples/real/pfam_*`, `examples/real/rfam_*` | Pfam (InterPro), Rfam | CC0 |
| `examples/synthetic/*`, `examples/compat/*` | generated for ViewAlign | MIT, as ViewAlign |

`examples/real/README.md` lists each file with the exact upstream commit.

## Sequence databases for the optional server

The optional server (`server.js`) can offer local FASTA files as search
databases; none are bundled. RepBase is licensed by the Genetic Information
Research Institute (GIRI) and may not be redistributed: obtain it from GIRI
under its licence and register it with the server yourself (Search panel, or
`blast_dbs.json`). The database files earlier versions of this repository
carried (RepBase_filtered.bnk, SINEBase.nr95.fa, snake_gekko_SINEs_cons.fas,
tua_DL_ASuh_JGrau_repeat.fa) have been removed.
