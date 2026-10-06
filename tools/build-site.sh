#!/usr/bin/env bash
# Assembles the public GitHub Pages site in a folder (default: _site): the
# viewer, its workers and WebAssembly, the manual, example data, figures,
# vendored code and licence files. Everything else in the repository (server,
# tests, development notes, drafts, sequence databases) stays out.
#
#   tools/build-site.sh [out_dir]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
rm -rf "$OUT"
mkdir -p "$OUT"

APP_FILES=(
  index.html manual.html styles.css version.json .nojekyll
  script.js a11y.js ab1-parser.js bam-parser.js block-bicluster.js block-mask.js
  chromatogram-viewer.js cluster.js kmer-tree.js peel.js realign-region.js tree-draw.js
  mafft-wasm.js mafft-worker.js disttbfast.js disttbfast.wasm
  blast-worker.js doter-worker.js doter-word-worker.js
  codon-align-worker.js codon-align.js
  macse-worker.js macse-align.js macse-dp-wasm.js
  example-colour-names.fa
  README.md LICENSE LICENSE-MACSE LICENSE-MAFFT THIRD_PARTY_NOTICES.md
)
for f in "${APP_FILES[@]}"; do cp "$f" "$OUT/"; done
for d in img examples vendor; do cp -r "$d" "$OUT/"; done
mkdir -p "$OUT/snapshots"
cp snapshots/README.md snapshots/index.json "$OUT/snapshots/"
echo "site assembled in $OUT ($(find "$OUT" -type f | wc -l) files)"
