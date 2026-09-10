#!/usr/bin/env python3
"""Emit a block-mask JSON fixture from an alignment, using block_schematic's
classify_blocks_2d and mapping its stitched x-axis back to real 0-based
inclusive MSA column indices.

ASSUMPTION: the alignment's flanks are real, fixed-width, column-aligned
(a "filled" alignment) so the stitched x-axis maps linearly to columns:
  element x in [0, L)      -> real col nzc[x]
  left flank  x < 0        -> real col nzc[0] + x
  right flank x >= L       -> real col nzc[-1] + (x - L + 1)
This holds for the fixtures in tests/fixtures/blockmask/. It does NOT hold
for a MAFFT-gapped flank, where each row's flank is its own coordinate.

Usage:  python emit_fixture.py <aln.fa> [preset_name] > <name>.expected.json
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
import block_schematic as BS
import numpy as np

FLANK = 250  # analysis flank; fixtures are built with >= this many real flank cols


def load_preset(name):
    p = os.path.join(os.path.dirname(__file__), "granularity_presets.json")
    presets = json.load(open(p))
    return presets[name]


def main():
    aln = sys.argv[1]
    preset_name = sys.argv[2] if len(sys.argv) > 2 else "V3_medium"
    cfg = load_preset(preset_name)
    for k, v in cfg.items():
        setattr(BS, k, v)

    names, A = BS.read_aln(aln)
    ci = BS.consensus_index(names)
    cons = A[ci]
    nzc = np.where(cons != BS.GAP)[0]
    col0, col1 = int(nzc[0]), int(nzc[-1])
    L = len(nzc)
    n_cols = A.shape[1]

    blocks, bg, L2, n_rows = BS.classify_blocks_2d(aln, flank=FLANK)

    def x_to_col(x):
        if x < 0:
            return col0 + x
        if x < L:
            return int(nzc[x])
        return col1 + (x - L + 1)

    out_blocks = []
    for b in blocks:
        cs = max(0, x_to_col(b["x_start"]))
        ce = min(n_cols - 1, x_to_col(b["x_end"]))
        if ce < cs:
            continue
        entry = {"type": b["type"], "col_start": cs, "col_end": ce}
        rows = b.get("rows", "all")
        entry["rows"] = "all" if rows in (None, "all") else sorted(int(r) for r in rows)
        if "row_group_rank" in b:
            entry["group_rank"] = b["row_group_rank"]
        out_blocks.append(entry)

    # row headers: the reference drops the consensus row from the row space,
    # so row index i in a block refers to the i-th NON-consensus sequence.
    row_headers = [h for k, h in enumerate(names) if k != ci]

    mask = {
        "alignment_id": os.path.splitext(os.path.basename(aln))[0].replace(".aln", ""),
        "preset": preset_name,
        "n_rows": n_rows,
        "n_cols": n_cols,
        "elem_col_start": col0,
        "elem_col_end": col1,
        "row_headers": row_headers,
        "params": cfg,
        "blocks": out_blocks,
    }
    json.dump(mask, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
