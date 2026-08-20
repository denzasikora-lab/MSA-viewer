#!/usr/bin/env bash
# Writes version.json with the current HEAD commit hash, then commits it.
# Run this as the LAST step before pushing, after all other changes are
# already committed - version.json can only ever describe the commit
# right before it (a file can't contain the hash of the commit that
# creates it), so running this first and committing other changes after
# would leave it one commit behind again.
set -euo pipefail
cd "$(dirname "$0")"
HASH=$(git rev-parse HEAD)
DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '{"commit":"%s","date":"%s"}\n' "$HASH" "$DATE" > version.json
git add version.json
git commit -m "chore: update version.json to $HASH"
echo "version.json now points to $HASH - push it now."
