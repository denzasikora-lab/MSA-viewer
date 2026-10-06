# Figures

The manual's screenshots are regenerated from the example data in `examples/`
with the viewer itself (headless Chromium via `tests/lib/browser.js`; set
`BROWSER_PATH` if no Chrome/Chromium is found). Python 3 with Pillow labels and
assembles the captures.

| Figure | Input | Command |
|---|---|---|
| `img/interface-layout.png`, `img/codon-example.png`, `img/move-slide-example.png`, `img/tree-example.png` | `examples/svk_k4.fa`, `examples/synthetic/` | `node tools/figures/build_manual_figures.js && python3 tools/figures/build_manual_figures.py` |
| `img/dotplot-example.png` | `examples/svk_k4.fa` | `node tools/figures/build_dotplot_figure.js` |
| `img/colour-names-example.png` | `example-colour-names.fa` | `node tools/figures/build_colour_names_figure.js` |

Raw captures go to `tools/figures/_fig/` (not committed). Screenshots depend on
the browser's fonts and version, so a regenerated image matches the committed
one in content and layout, not byte for byte.
