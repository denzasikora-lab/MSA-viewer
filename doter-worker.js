/* ── Doter scoring worker ──────────────────────────────────────
   Diagonal prefix-sum scoring.  O(N·M) total, no inner window loop.
   Returns raw Int16 scores for rendering on main thread.
   Based on https://github.com/Toki-bio/doter                    */

self.addEventListener('message', (event) => {
  try {
    const { seqA, seqB, windowSize, mode } = event.data;
    const N = seqA.length;
    const M = seqB.length;
    // Split unevenly for even windowSize (e.g. 4 -> 1 before, 2 after) so the
    // window actually spans windowSize positions instead of always rounding down.
    const halfBefore = (windowSize - 1) >> 1;
    const halfAfter = windowSize - 1 - halfBefore;
    const mismatch = mode === 'dna-simple' ? -1 : 0;

    const aEnc = new Uint8Array(N);
    const bEnc = new Uint8Array(M);
    for (let i = 0; i < N; i++) aEnc[i] = seqA.charCodeAt(i);
    for (let j = 0; j < M; j++) bEnc[j] = seqB.charCodeAt(j);

    const scores = new Int16Array(N * M);
    const maxDiagLen = Math.max(N, M);
    const prefix = new Int32Array(maxDiagLen + 1);

    let globalMin = 0x7FFF;
    let globalMax = -0x8000;

    const diagCount = N + M - 1;
    for (let dd = 0; dd < diagCount; dd++) {
      const d = dd - (N - 1);
      const iStart = d < 0 ? -d : 0;
      const jStart = d < 0 ? 0 : d;
      const len = Math.min(N - iStart, M - jStart);

      prefix[0] = 0;
      for (let k = 0; k < len; k++) {
        prefix[k + 1] = prefix[k] + (aEnc[iStart + k] === bEnc[jStart + k] ? 1 : mismatch);
      }

      for (let k = 0; k < len; k++) {
        const lo = k - halfBefore;
        const hi = k + halfAfter + 1;
        const loClamped = lo > 0 ? lo : 0;
        const hiClamped = hi < len ? hi : len;
        const actualLen = hiClamped - loClamped;
        const raw = prefix[hiClamped] - prefix[loClamped];
        // Near the ends of a diagonal (or on diagonals shorter than windowSize)
        // the window gets clamped to fewer than windowSize positions. Scale the
        // raw sum back up to windowSize-equivalent units so a clamped edge window
        // is comparable to a full centered window instead of always reading lower
        // and drawing a fake similarity gradient toward the plot's edges.
        const s = actualLen > 0 ? Math.round(raw * windowSize / actualLen) : 0;
        scores[(iStart + k) * M + (jStart + k)] = s;
        if (s < globalMin) globalMin = s;
        if (s > globalMax) globalMax = s;
      }
    }

    self.postMessage(
      { scores, rows: N, cols: M, min: globalMin, max: globalMax },
      [scores.buffer]
    );
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
});
