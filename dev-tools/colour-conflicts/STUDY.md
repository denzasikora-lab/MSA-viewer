# Colouring and marking conflicts: study (2026-09-30, v214)

What happens when a user runs several colouring or marking operations on the same alignment,
measured in a real browser, and the options for resolving it. Nothing here has been changed
in the app yet: section 6 lists the decisions needed first.

Files: `probe.js` (pair matrix), `anchor-probe.js` (edits), `analyze.js`, `results.json`,
`anchor-results.json`, `matrix.md` (full generated tables).

## 1. Method

**Layers.** Every feature that colours or marks residues, names or rows, driven through the
app's own functions (what its buttons call, or the state + redraw path a snapshot uses):
row / column / residue selection, the Type-tool edit cell, search hits, TSD marks (colour and
bold), repeat highlights, SNP groups (name colours + diagnostic letters), Colour Names, trim
preview, soft trim, Highlight diffs, Variable sites only, codon analysis, 2D block mask,
and a colour scheme (Nucleotide) against the default monochrome shading.

**Pair matrix (136 pairs).** For every pair A, B on a fresh page: A then B; a redraw; clear B;
clear A. Separately B then A; clear A. At each step the computed style of one target residue
(background, text colour, weight, opacity, visibility, underline, outline), its name cell and
its row is recorded. Each layer alone is the reference. A pair conflicts if one layer cannot
be seen when both are on (**hidden**), the look depends on which ran last (**order**),
removing one does not give back the other (**clear breaks**), or a redraw changes the look.
Canvas mode was sampled per layer (pixel at the target cell and name).

**Anchoring (9 layers x 7 actions).** Each mark is recorded as (sequence name, residue number
counted without gaps). After a redraw, a gap column inserted to the left, a GeneDoc gap
inserted in all rows or in one row, deleting a row above, moving the row to the top, and
insert-then-undo, the marks are compared: does each still sit on the same residue of the same
sequence?

**Why pairs and anchoring cover arbitrary action sequences.** If every layer is drawn from
state (not painted once) and layers combine by a fixed rule, the screen depends only on
which layers are on and where their marks are, not on the order of the steps that got there.
Then any sequence of actions reduces to (a) the set of active layers, where pairwise rules
decide visibility, and (b) where each layer's marks are after the edits, which is the
anchoring question. Order dependence and "clear breaks" in the matrix are exactly the places
where this assumption fails, so they point to the code that must change for the reduction to
hold.

Limits: one target cell (a variable column, shaded light grey), Full view, one alignment.
Soft trim, variable sites and codon analysis do not mark that cell, so their pair results
cover only their interaction with the cell's neighbours. Consensus row not tested.

## 2. Inventory: how each layer is drawn and what it is tied to

| Layer | Drawn as | Channel | Tied to | Canvas | In Selections panel |
|---|---|---|---|---|---|
| Conservation shading | CSS class `!important` | fill + text | derived from sequences | yes | - |
| Colour scheme (Nucleotide, AA...) | CSS, id selector `!important` | fill + text | derived | yes | - |
| Row selection | `.selected` class `!important` | fill (row), name fill | row index (kept by row moves) | yes | yes |
| Column selection | class `!important` | fill | column number | yes | yes |
| Residue selection | class `!important` | fill + text | row index + column | yes | yes |
| Edit cell (Type) | class `!important` | fill + outline | row index + column | yes | - |
| Search hit | class in injected `<style>` `!important` | fill + bold | derived from sequences | yes | yes |
| TSD mark, colour | inline style, **not** `!important` | fill + bold | row index + column | yes | yes |
| TSD mark, bold | class | bold + underline | row index + column | yes | yes |
| Repeat highlight | inline `!important`, painted once | fill (tint) | row index + columns | **no** | yes |
| SNP groups: letters | inline `!important`, painted once | fill + text + bold | column + sequence name | **no** | no |
| SNP groups: names | inline `!important`, painted once | name fill | sequence name | **no** | no |
| Colour Names | inline style attribute (whole attribute) | name fill | sequence name | **no** | yes |
| Trim preview | class `!important` | fill (tint) | column numbers | **no** | no |
| Soft trim | class (consensus row) | dim | column numbers | no | no |
| Highlight diffs | body class | dims others, bolds diffs | derived | **no** | no |
| Variable sites only | body class | hides columns | derived | no | no |
| Codon analysis | classes + extra rows | fill (stops), underline | derived | partly | no |
| 2D block mask | overlay elements | rectangles | sequence names + columns | **no** | no |

Three drawing mechanisms coexist, and that is the root of most conflicts:

1. **CSS classes with `!important`.** The winner is decided by selector specificity and file
   order, not by any intent. The colour schemes use an id selector, so they outrank every
   class-based mark.
2. **Inline styles with `!important`** (repeats, SNP letters and names, Colour Names). These
   beat every class, and between themselves the last one painted wins.
3. **Painted once** (repeats, SNP groups, Colour Names). They are re-applied only by
   specific calls, so a redraw or another feature's clear can drop or reorder them.

## 3. Visibility: who hides whom (verified)

| Hidden layer | Hidden by | Why |
|---|---|---|
| Row selection (fill and name) | SNP groups | inline `!important` beats `.selected` |
| Column selection | SNP groups, repeat highlight, trim preview, Nucleotide colours | inline / higher specificity |
| Residue selection | column selection, SNP groups, Nucleotide colours | same fill channel, lower rank |
| Search hit | SNP groups | inline `!important` |
| TSD mark (colour) | search hit, SNP groups, and **conservation shading** | its fill is inline without `!important`: on any shaded residue only the bold shows |
| Trim preview | SNP groups, Nucleotide colours | same fill channel |
| Highlight diffs (bold) | search, TSD, SNP groups | all use bold (minor) |

The two most serious: **selections are invisible** under SNP letters and under any colour
scheme (users select, then act on something they cannot see), and **TSD colour marks are
invisible in DOM views wherever the residue is shaded** (Canvas shows them), which is
most TSD positions in a conserved flank.

## 4. Order, restore and redraw (verified)

- **SNP-group name colours vs Colour Names** on the same name: the last one run wins;
  clearing Colour Names does not bring the group colour back; a redraw flips it to the group
  colour (redraw applies Colour Names first, then groups).
- **Repeat highlights vs SNP letters:** both inline `!important`, last painted wins.
- **Repeat highlights disappear on any redraw** (a bug: the row builder calls
  `_applyLineHighlights` before the data element is attached to its row, so row-specific
  repeats fail the row test). Every feature that redraws (trim, soft trim, diffs, variable
  sites, codon, colour scheme, 2D mask, Colour Names, any edit) therefore erases them; the
  results table still lists them as highlighted.
- **Highlight diffs and Variable sites only** are silently exclusive: turning one on unticks
  the other.
- Side observation, to check separately: with default settings every column counted as
  variable, including fully identical ones.

## 5. Anchoring: do marks stay on their residues after edits? (verified)

| Layer | Redraw | Gap column left | Gap all rows (Edit) | Gap one row (Edit) | Delete row above | Move row | Undo |
|---|---|---|---|---|---|---|---|
| Search | ok | ok | ok | ok | ok | ok | ok |
| Colour Names | ok | ok | ok | ok | ok | ok | ok |
| Row selection | ok | ok | ok | ok | cleared | not measured* | ok |
| Column selection | ok | n/a* | **other residues** | **other residue** | ok | ok | not measured* |
| Residue selection | ok | **other residues** | **other residues** | **other residues** | **other sequence** | **other sequence** | cleared |
| TSD marks | ok | **other residues** | **other residues** | **other residues** | **other sequence** | **other sequence** | ok |
| Repeat highlight | **lost** | lost | lost | lost | lost | lost | lost |
| SNP letters | ok | **lost** | **lost** | lost in that row | ok | ok | ok |
| Trim preview | ok | **other columns** | **other columns** | shifted in that row | ok | ok | ok |

\* The probe action itself set or cleared that selection (Insert gap column uses the selected
column as its position), so these cells say nothing about the layer.

"Other sequence" is the dangerous case: TSD marks and residue selections are stored by row
number, so deleting or moving a row puts them on a different sequence, silently. TSD marks
are analysis results, so this corrupts what the user sees as data.

## 6. Resolution options

### 6.1 Visibility (who is on top)

- **A. One channel per kind of mark (recommended).** Stop fighting over the fill. Give each
  family its own visual channel, so several can show at once:
  | Family | Channel |
  |---|---|
  | Background meaning (shading, colour scheme, SNP letters, trim tint) | fill |
  | Search hits, repeats | fill tint, drawn above background meaning |
  | Selections (row, column, residue, edit cell) | outline / inset border, always on top |
  | TSD marks | underline bar or box, never hidden |
  | Highlight diffs | dimming of the others (as now) |
  With selections as outlines, "select, then act on what you cannot see" disappears.
- **B. Explicit stacking order.** Keep fills, but make the order an explicit rule (for
  example: selection > edit cell > search > TSD > repeats > SNP letters > trim > scheme >
  shading), implemented in one place, identical in DOM and Canvas. The Selections panel
  could show it (list order = stacking order, drag to reorder), and mark covered items
  "covered by X".
- **C. Warn at the moment of conflict.** When a new layer would hide an existing one:
  "Search hits are covered by SNP letters here: show search on top / switch SNP letters off
  / keep". Useful on top of A or B for the fill cases that remain; noisy on its own.
- **D. Refuse / force exclusive.** Only for true modes (Highlight diffs vs Variable sites
  already works this way, but should say so when it unticks the other).

### 6.2 Order and redraw

Whatever is chosen above, the painted-once layers (repeats, SNP letters and names, Colour
Names) have to be drawn from state in the row builder and in every in-place repaint, like
search hits since v212. That alone removes all order and "clear breaks" findings and the
repeat redraw bug, and makes Canvas able to draw them.

### 6.3 Anchoring

- **Tie residue marks to (sequence, residue number)** instead of (row, column): TSD marks,
  residue selection, repeat highlights. Then they follow gaps, deletes and moves by
  construction. Stored by sequence object with a name fallback, as the Selections stash
  already does.
- **Column-level marks** (column selection, trim boundaries, SNP letter columns): shift them
  with inserted / deleted columns (as done for switched-off columns in v213), or clear them
  with a notice. SNP letters could instead be recomputed from the groups (they are derived
  data).
- When a mark cannot be kept (its residue was deleted), drop it and say so, never move it
  onto another sequence.

## 7. Decisions needed

1. Visibility: channels (A), stacking order (B), or A for selections and TSD marks plus B
   for the remaining fills? Should the stacking order be user-adjustable in the Selections
   panel?
2. Warnings (C): wanted at all, and if so only when a mark becomes completely invisible?
3. Anchoring: should residue marks follow their residues through edits (recommended), and
   column selection / trim boundaries shift with inserted columns?
4. Scope of the first step. Suggested order: (i) bugs that lose or misplace data (repeat
   redraw, TSD / residue selection landing on another sequence, TSD colour invisible),
   (ii) move painted-once layers to state-derived drawing (DOM and Canvas), (iii) the
   visibility scheme chosen in 1.

## 8. Decisions (author, 2026-09-30)

- Agreed: 1 = channels for selections and TSD marks + explicit order for the remaining fills;
  3 = marks follow their residues through edits, column marks shift with inserted columns;
  4 = order of work (data bugs, then state-derived drawing in DOM and Canvas, then channels).
- Added by the author: use text properties as channels, by default or when a conflict is
  possible, and tell the user. Examples given: TSD marks bold AND a distinct font;
  restriction sites in italics.

Channel plan that follows from it:

| Layer | Primary channel | Kept when its fill is covered |
|---|---|---|
| Selections (row, column, residue, edit cell) | outline / inset lines, never fill | always visible |
| Search hit | fill (search colour) | - (top fill) |
| Restriction site | fill + *italic* | italic |
| TSD mark | **bold + second font (sans-serif)**, colour fill optional | bold + font |
| Repeat highlight | fill tint | overline in the repeat colour |
| SNP letters | fill + text colour | text colour + bold |
| Trim preview | ~~strike-through~~ + tint | strike-through |
| Name cell | Colour Names = fill; SNP groups = coloured stripe | both |

A layer whose colour is covered somewhere says so in the Selections panel. A second font
changes glyph width, so marked residue boxes are locked to the normal residue width (checked
by measuring every box).

## 9. Progress

- Phase 1 (data-losing bugs), done in the working tree after v214:
  - TSD marks are stored per sequence and residue number (`ResidueMarks`, behind the
    `state.tsdMarks` accessor, same Map-like read API); the row/column view is derived, so
    marks follow gap inserts, row deletes/moves and undo (copies found again by name).
  - Repeat highlights: fixed the redraw loss (the row builder applied them before attaching
    the row); row-specific repeats are anchored to (sequence, residue range); the layer is
    derived per row (cache keyed by sequence object, not letters: rows with identical letters
    made a letters-keyed cache paint the wrong sequence) and drawn by the row builder, every
    in-place repaint and Canvas (which did not draw repeats before).
  - Residue selection and the Type-tool cell follow their sequence through row
    deletes/moves/sorts/undo (identity remap at the start of every render). Within a row they
    stay on their columns (a region, like the column selection).
  - Check "Marks follow their residues ..." fails on v214.
- Phase 1 released as v215.
- Phase 2+3 (working tree): one residue-overlay rule for search hits, TSD marks, repeats and
  SNP letters (`residueOverlay`), used by the row builder, every in-place repaint and Canvas.
  Fill order search > TSD colour > repeat > SNP letter; TSD always bold + sans-serif (box
  width locked to the grid, measured: 0 of 60 boxes move); restriction sites italic; covered
  repeat -> overline; covered SNP letter -> group-coloured text; trim -> strike-through.
  Selections are CSS background-image tints (row green, column blue, residue yellow + frame,
  edit cell blue) stacked over any fill; Canvas uses the same tints. Name cells: one painter,
  Colour Names fill + group stripe (group fill when no Colour Name), in DOM and Canvas.
  The imperative SNP painter (`highlightDiagnosticMutations`) is gone; its leakage tooltips
  moved into the derived map.
- Clearing repeats resyncs the overlay (the old clear removed only the background and left the
  overlay's text colour behind: 17 of the remaining pair "conflicts" in the phase-2 re-run).
- Telling the user: `overlayCoverage()` counts residues where one mark covers another's colour;
  the Selections items say "colour under a search at N; shown bold, second font" / "tint under
  other marks at N; shown as an overline", and a search that lands on existing marks says so
  in its message.
- Selections tint also applies on the consensus row (a selected column shows there).
- Remaining "hidden" entries in the matrix, all by design: the colour scheme / shading under a
  mark (marks sit above base colouring); Highlight diffs' bold at a diff column when another
  mark is also bold; TSD colour vs TSD bold (one layer, global style); SNP groups vs soft trim
  (soft trim changes what grouping sees); Highlight diffs vs Variable sites (mutually
  exclusive options, the other is unticked silently: to be made explicit).
- Performance correction (after the author asked whether the logic was really simple and
  quick). Measured on 300 x 1500 with a quarter of residues marked, the first version was
  slower than v215 (redraw 1.31 s vs 0.96 s, with marks 2.38 s vs 1.28 s, row click 128 vs
  38 ms). Causes and fixes: the selection-tint rule applied to every residue (now only to
  selected ones); each marked residue got its own inline style (now one generated CSS class
  per distinct look, memoised per combination of marks); the residue width was measured by a
  forced layout on each redraw (now from font metrics, once per font size); the "colour
  covered" count ran on every selection click (now cached until marks or sequences change).
  After: redraw 0.78-0.85 s (v215 0.89), with marks 1.27-1.30 s (v215 1.05-1.28), row click
  26-31 ms (v215 27). Measured by scratch/_claude_cost.js against a v215 worktree.

- Open items closed (v218): Highlight diffs and Variable sites only now pause each other with a
  message (Variable sites only pauses Highlight diffs and restores it when turned off; messages
  are re-shown after the redraw, which writes its own status line). The "every column variable"
  observation was the default threshold 0 = unfiltered (documented): the two options did nothing
  when ticked. Default is now count >= 1 (a column is variable when at least one sequence
  differs); 0 still means unfiltered. The 'both cleared, left behind: weight' probe result was a
  probe artifact (its clear step clicked the checkbox, which toggles).

## 10. Closed in v219

- Column-keyed state follows column edits (`applyColumnEdit`): column selection, stash, trim and
  soft-trim boundaries, SNP-group features, column-wide repeats, residue selection / pending
  click / edit cell. Hooked into Insert gap column, GeneDoc gap tools (All -> everything, Seq /
  Other -> residue selections of the edited rows), Delete columns, Remove gap columns, hard
  trim. Undo/Redo and trim-undo restore the column state saved on the entry. Clearing a soft
  trim (or hard-trimming under one) no longer shifts SNP letters by the window offset.
- TSD and repeat results are tied to (sequence, residues): go-to, Mark in alignment, lowercase
  undo and the repeat table follow rows/columns edited after the search.
- Final matrix on this code: 11 of 136 pairs, all by design (marks over the colour scheme, bold
  overlapping Highlight diffs, TSD colour vs TSD bold being one setting, SNP groups vs soft trim,
  Highlight diffs vs Variable sites now with a message).
- Not done: 2D block mask does not follow column edits; marks through reverse-complement of rows
  not probed; Copy table has no flank columns.
