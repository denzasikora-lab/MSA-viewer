#!/usr/bin/env bash
# Entry point for both humans and BROWSER_CHECK_CMD (see AIDER-PLAYBOOK.md).
# Exits 0 if all regression checks pass, 1 otherwise. Fast (~1-2 min) -
# intended to run after every GLM commit. Run tests/benchmark/run-all.js
# separately (slower, prints numbers, not a pass/fail gate).
set -euo pipefail
cd "$(dirname "$0")/.."
node tests/realign-region/run.js
node tests/clustering/svk_subset.test.js
node tests/clustering/guided_small.test.js
node tests/clustering/multi_dataset.test.js
node tests/bicluster/oracle.js
node tests/regression/run-all.js
