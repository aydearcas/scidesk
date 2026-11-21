"""Turn source/article.md and source/table-*.json into build/blocks.json for word.ps1.

Usage: python tools/prepare.py   (run from the corpus folder)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = ROOT / "build"

INLINE = re.compile(r"(\*\*[^*]+\*\*|\*[^*]+\*)")
MARK = re.compile(r"\^\{([a-z])\}")


def inline_runs(text):
    """Split **bold** and *italic* markup into runs."""
    runs = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            runs.append({"text": part[2:-2], "bold": True})
        elif part.startswith("*"):
            runs.append({"text": part[1:-1], "italic": True})
        else:
            runs.append({"text": part})
    return runs


def mark_runs(text):
    """Split table footnote markers ^{a} into superscript runs."""
    runs = []
    pos = 0
    for m in MARK.finditer(text):
        if m.start() > pos:
            runs.append({"text": text[pos:m.start()]})
        runs.append({"text": m.group(1), "superscript": True})
        pos = m.end()
    if pos < len(text):
        runs.append({"text": text[pos:]})
    return runs


def table_block(path):
    t = json.loads(path.read_text(encoding="utf-8"))
    cols = t["columns"]
    nrows = len(t["header"]) + len(t["body"])
    cells = []  # grid origin cells: row, col (1-based), spans, runs
    covered = set()
    for r, row in enumerate(t["header"], start=1):
        c = 1
        for cell in row:
            while (r, c) in covered:
                c += 1
            rs, cs = cell.get("rowspan", 1), cell.get("colspan", 1)
            cells.append({"row": r, "col": c, "rowspan": rs, "colspan": cs,
                          "header": True, "runs": mark_runs(cell["text"])})
            for dr in range(rs):
                for dc in range(cs):
                    covered.add((r + dr, c + dc))
            c += cs
    for i, row in enumerate(t["body"], start=len(t["header"]) + 1):
        if len(row) != cols:
            sys.exit(f"{path.name}: body row {i} has {len(row)} cells")
        for c, text in enumerate(row, start=1):
            cells.append({"row": i, "col": c, "rowspan": 1, "colspan": 1,
                          "header": False, "runs": mark_runs(text)})
    return {
        "kind": "table", "id": t["id"], "rows": nrows, "columns": cols,
        "headerRows": len(t["header"]), "caption": inline_runs(t["caption"]),
        "cells": cells, "notes": [mark_runs(n) for n in t["notes"]],
    }


def main():
    lines = (SRC / "article.md").read_text(encoding="utf-8").splitlines()
    blocks = []
    in_refs = False
    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = re.fullmatch(r"\[\[TABLE (\d+)\]\]", line)
        if m:
            blocks.append(table_block(SRC / f"table-{m.group(1)}.json"))
        elif line.startswith("### "):
            blocks.append({"kind": "h2", "runs": inline_runs(line[4:])})
        elif line.startswith("## "):
            in_refs = line[3:].strip() == "Referencias"
            blocks.append({"kind": "h1", "runs": inline_runs(line[3:])})
        elif line.startswith("# "):
            blocks.append({"kind": "title", "runs": inline_runs(line[2:])})
        else:
            blocks.append({"kind": "ref" if in_refs else "para",
                           "runs": inline_runs(line)})
    OUT.mkdir(exist_ok=True)
    (OUT / "blocks.json").write_text(
        json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(blocks)} blocks -> build/blocks.json")


if __name__ == "__main__":
    main()
