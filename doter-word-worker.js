/* ── Doter Word-Match worker (SPIN/dottup style) ─────────────────
   Exact k-mer (word) matching. Every cell covered by a word that occurs in
   both sequences is marked. Words containing an unknown residue (N, or X in
   protein) are skipped, so runs of N do not match each other.         */
self.addEventListener('message', (event) => {
  try {
    const { seqA, seqB, wordSize, unknown } = event.data;
    const N = seqA.length, M = seqB.length;
    const W = wordSize || 3;
    const unk = new Set(String(unknown || 'N'));

    // Start positions whose word contains no unknown residue
    const cleanStarts = (s) => {
      const ok = new Uint8Array(Math.max(0, s.length - W + 1));
      let lastBad = -1;
      for (let i = 0; i < s.length; i++) {
        if (unk.has(s[i])) lastBad = i;
        const start = i - W + 1;
        if (start >= 0 && lastBad < start) ok[start] = 1;
      }
      return ok;
    };
    const okA = cleanStarts(seqA), okB = cleanStarts(seqB);

    // Build word -> position map for seqB (horizontal axis)
    const bMap = new Map();
    for (let j = 0; j <= M - W; j++) {
      if (!okB[j]) continue;
      const w = seqB.slice(j, j + W);
      if (!bMap.has(w)) bMap.set(w, []);
      bMap.get(w).push(j);
    }

    // For each word in seqA, mark every cell of each matching word
    const matchMap = new Uint8Array(N * M); // 1 = cell lies in an exact word match
    for (let i = 0; i <= N - W; i++) {
      if (!okA[i]) continue;
      const hits = bMap.get(seqA.slice(i, i + W));
      if (!hits) continue;
      for (const j of hits) {
        for (let k = 0; k < W; k++) matchMap[(i + k) * M + (j + k)] = 1;
      }
    }

    // Transfer to main thread
    self.postMessage(
      { matchMap, rows: N, cols: M, wordSize: W },
      [matchMap.buffer]
    );
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
});
