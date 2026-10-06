#!/usr/bin/env bash
# Quick run of every suite (MACSE subsets only). The full run is
# `npm test` (node tests/run-all.js). Exits 0 if all suites pass.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node tests/run-all.js --quick "$@"
