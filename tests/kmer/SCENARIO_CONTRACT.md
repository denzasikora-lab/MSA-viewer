# Scenario contract (tests/kmer/scenarios/*.js)

A scenario is a CommonJS module that builds one synthetic ALIGNMENT with KNOWN group labels:

```js
module.exports = {
  id: 'short-kebab-id',
  title: 'one line',
  describe: 'what biological situation this models and what makes it hard (2-4 sentences)',
  // seed: a positive integer. The function must be deterministic in `seed` (use your own PRNG).
  generate(seed) {
    return {
      seqs: [{ header: 'name', seq: 'ACGT-...' }, ...],   // aligned: ALL seq strings have the same length
      labels: [0, 0, 1, 2, ...],                           // labels[i] = true group of seqs[i] (integers)
      minSize: 3,                                          // groups with fewer members than this are "noise":
                                                           // give each noise sequence its OWN unique label
      notes: 'free text: expected difficulty, known limits'
    };
  }
};
```

Rules:
- No `require`, no file or network access, no Math.random (write a small seeded PRNG, e.g. mulberry32).
- 30 <= number of sequences <= 400; alignment length between 60 and 3000 columns.
- Characters: A C G T and gap '-' mainly. A scenario may deliberately use lower case, U, N, other IUPAC codes, or '.'
  as gap, when that is the point of the scenario.
- At least 2 true groups with >= minSize members, unless the scenario is explicitly a "no structure" test
  (then say so in `notes` and make all labels distinct or one label, as appropriate).
- Group members must be MORE similar to each other than to members of other groups on average
  (otherwise the labels mean nothing), except in scenarios that are explicitly adversarial (say so in `notes`).
- Shuffle the row order (file order must not matter).
- Keep the function reasonably fast (< 1 s).

See tests/kmer/sim.js for a worked example of a generator (you may copy ideas, but write your own code).
