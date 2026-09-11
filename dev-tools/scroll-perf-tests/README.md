# Scroll/render performance test harness

Playwright-core scripts used to diagnose and verify fixes to the windowed
DOM alignment renderer (`renderUnifiedWindowedDom`, `_refreshUnifiedWindowOnScroll`,
`_buildUnifiedBlock`, `_incrementalUpdateBlockRows` in `script.js`) and the
Canvas-mode scroll-position handoff (`onModeChange` in `script.js`).

See `../../CURSOR_HANDOFF_SCROLL_PERF.md` at the repo root for full context:
what's been tried, what's fixed, what's still reported as glitchy, and how
to use these scripts productively.

## Setup (one-time)

`playwright-core` is already a repo dependency (see the root `package.json`) -
if `npm install` has been run at the repo root, these scripts work as-is
(Node resolves `require('playwright-core')` up to the repo root's
`node_modules`).

Playwright drives the **already-installed system Chrome**, not a downloaded
browser — no extra download needed. Confirm the path in each script matches
your machine (`C:/Program Files/Google/Chrome/Application/chrome.exe` on
Windows; adjust `executablePath` if Chrome lives elsewhere, e.g.
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` for Edge,
or drop `executablePath` entirely on macOS/Linux to let Playwright find a
browser itself — untested on those platforms, this harness was built on
Windows).

## Test fixture

These scripts assume a real, large (~600-seq) alignment is reachable at
`http://localhost:3000/oma_test.fas` (i.e. dropped in the repo root, which
`server.js`'s `express.static('.')` serves automatically). Get one via:

```bash
curl -s "https://raw.githubusercontent.com/Toki-bio/SINE-discriminator/main/alignments/CURATE__oma__subfam600_23seeds.aln.fa" -o ../../oma_test.fas
```

(621 sequences x 1928 columns, ~1.2M residues - past `ALIGN_WINDOWED_DOM_THRESHOLD`
but below `ALIGN_CRAZY_VOLUME`, i.e. exactly the size class these bugs live in.
Don't commit this fixture file to git - it's a large third-party file, fetch it
fresh each time.)

Start the app server first: `node server.js` from the repo root (default port 3000).

## Scripts

- **`profile_scroll.js`** - CPU-profiles 15 vertical scroll steps via Chrome's
  DevTools Protocol Profiler, prints top self-time functions. Use this FIRST
  when investigating "scrolling feels slow" - it tells you whether the cost
  is JS (a specific function will dominate) or native browser work (shows as
  `(program)` with almost no JS self-time - was the case here, see the
  handoff doc for what that means and why C++/GPU rewrites don't help it the
  way you'd expect).
- **`test_scroll_perf.js`** - simpler: just measures wall-clock ms per scroll
  step (no CPU profile), useful for a quick before/after number.
- **`test_scroll_bottom_bug.js`** - scrolls to `container.scrollHeight` and
  reports whether the container's actual bottom shows real content or blank
  space (the reported "blank page when scrolling to bottom" bug class).
- **`test_correctness_after_scroll.js`** - after a scripted back-and-forth
  scroll pattern, checks for duplicate rendered rows and rendered-text-vs-
  actual-sequence-data mismatches. Run this after ANY change to the
  windowed-DOM renderer - it's the fastest way to catch a correctness
  regression from an optimization.
- **`test_mode_switch_scroll.js`** - scrolls in Block/Full (DOM) mode, then
  switches to Canvas mode, and checks whether the same alignment rows are
  visible before/after (catches the "view jumps when switching modes" bug
  class).
- **`test_zoom_window_geometry.js`** - changes a windowed DOM alignment from
  100% to 50% zoom, checks both the immediate and settled viewport geometry,
  scrolls with a real wheel event, then pressure-tests 200% and Full mode.
  It fails if stale row-height caches leave a blank lower viewport or if
  rendered rows become duplicated or disagree with sequence data.
- **`test_vertical_scrollbar.js`** - verifies that the right-side scrollbar is
  visible, aligned and scrollable in windowed Block, Full and Canvas modes,
  and that DOM-mode scrolling stays synchronized in both directions.
- **`test_block_450_scroll_stability.js`** - reproduces the wide-viewport,
  50%-zoom Block-mode defect around position 450, verifies every column in
  the block is rendered, and records whether virtualization adjusts
  `scrollTop` after each requested scroll.
- **`test_zoom_100_tick.js`** - checks that the zoom track has a visible 100%
  mark at the log midpoint, that clicking the mark restores 100%, and that
  a mutated slider min/max cannot move that mark to the left edge.

Each script prints its own pass/fail-shaped JSON to stdout - read the
comments at the top of each for exactly what it's asserting.

## Adding a new repro script

Copy the pattern from an existing script: launch Chrome headless, `goto`
`http://localhost:3000/?url=/oma_test.fas`, `waitForTimeout` for the initial
render (the classic `waitForSelector`-based readiness check does NOT work
here - see the handoff doc's note on `state` not being a `window` property).
Prefer `page.screenshot()` liberally and actually look at the image with an
image-capable tool - several "bugs" in this codebase's history turned out to
be broken tests, not broken app behavior, and a screenshot is the fastest way
to tell which one you're looking at.
