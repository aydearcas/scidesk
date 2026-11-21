"""Ground truth for prototype 1: every top-level table of a DOCX as a logical grid.

Usage: python -I tools/docx_tables.py <file.docx> <out.json>
For each table: rows of cells with colspan (w:gridSpan), rowspan (w:vMerge), the text of
each paragraph, and the formatting that matters in a scientific table (bold, italic,
superscript, subscript), plus features (nested tables, shading, fields, footnotes).
The output stays in private/ because it contains the user's text.
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Symbol-font characters (w:sym) as the reader sees them. Same table as src/clean.js.
SYMBOLS = {
    "wingdings 2": {0x50: "✓", 0x4F: "✗", 0x52: "☑", 0x54: "☒", 0xA3: "☐"},
    "wingdings": {0xFC: "✓", 0xFB: "✗", 0xFE: "☑", 0xFD: "☒", 0xA8: "☐"},
}
def sym_text(el):
    font = (el.get(W + "font") or "").lower()
    code = int(el.get(W + "char"), 16) & 0xFF
    return SYMBOLS.get(font, {}).get(code, "?")

def runs_info(p):
    """Text of a paragraph and its formatted spans, following fields (instrText is skipped)."""
    text, fmt = [], {"b": 0, "i": 0, "sup": 0, "sub": 0}
    in_field_code = False
    for el in p.iter():
        tag = el.tag
        if tag == W + "fldChar":
            t = el.get(W + "fldCharType")
            if t == "begin": in_field_code = True
            elif t == "separate": in_field_code = False
            elif t == "end": in_field_code = False
        elif tag == W + "r":
            rpr = el.find(W + "rPr")
            s = "".join((x.text or "") if x.tag == W + "t" else sym_text(x) for x in el.iter() if x.tag in (W + "t", W + "sym")) +("\t" if el.find(W + "tab") is not None else "")
            if in_field_code or not s:
                continue
            text.append(s)
            if rpr is not None:
                def on(name):
                    e = rpr.find(W + name)
                    return e is not None and e.get(W + "val") not in ("0", "false")
                n = len(re.sub(r"\s", "", s))
                if on("b"): fmt["b"] += n
                if on("i"): fmt["i"] += n
                va = rpr.find(W + "vertAlign")
                if va is not None and va.get(W + "val") == "superscript": fmt["sup"] += n
                if va is not None and va.get(W + "val") == "subscript": fmt["sub"] += n
    return "".join(text), fmt

def header_rows(tbl):
    out = []
    for i, tr in enumerate(tbl.findall(W + "tr")):
        pr = tr.find(W + "trPr")
        if pr is not None and pr.find(W + "tblHeader") is not None and pr.find(W + "tblHeader").get(W + "val") not in ("0", "false"):
            out.append(i)
    return out

def table_grid(tbl):
    rows = []
    for tr in tbl.findall(W + "tr"):
        row = []
        for tc in tr.findall(W + "tc"):
            pr = tc.find(W + "tcPr")
            span = int(pr.find(W + "gridSpan").get(W + "val")) if pr is not None and pr.find(W + "gridSpan") is not None else 1
            vm = pr.find(W + "vMerge") if pr is not None else None
            vmerge = None if vm is None else (vm.get(W + "val") or "continue")
            shd = pr.find(W + "shd") if pr is not None else None
            paras = []
            for child in tc:
                if child.tag == W + "p":
                    paras.append(runs_info(child))
                elif child.tag == W + "tbl":
                    for ntr in child.findall(W + "tr"):
                        cells_text = [" ".join(runs_info(p)[0] for p in ntc.findall(W + "p")) for ntc in ntr.findall(W + "tc")]
                        paras.append(("	".join(cells_text), {"b": 0, "i": 0, "sup": 0, "sub": 0}))
            fmt = {k: sum(f[k] for _, f in paras) for k in ("b", "i", "sup", "sub")}
            row.append({"colspan": span, "vmerge": vmerge, "paras": [t for t, _ in paras], "fmt": fmt,
                        "shaded": shd is not None and shd.get(W + "fill") not in (None, "auto", "FFFFFF"),
                        "nested": tc.find(".//" + W + "tbl") is not None})
        rows.append(row)
    # rowspan from vMerge restart/continue, keyed by grid column
    for r, row in enumerate(rows):
        col = 0
        for c in row:
            c["col"] = col
            col += c["colspan"]
    for r, row in enumerate(rows):
        for c in row:
            if c["vmerge"] == "restart":
                n = 1
                for below in rows[r + 1:]:
                    nxt = next((x for x in below if x["col"] == c["col"]), None)
                    if nxt and nxt["vmerge"] == "continue": n += 1
                    else: break
                c["rowspan"] = n
            else:
                c["rowspan"] = 1
    # cells covered by a vertical merge do not exist in HTML
    logical = [[{k: c[k] for k in ("col", "colspan", "rowspan", "paras", "fmt", "shaded", "nested")} for c in row if c["vmerge"] != "continue"] for row in rows]
    return logical

def main(src, out):
    z = zipfile.ZipFile(src)
    root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    tables = []
    for tbl in body.iter(W + "tbl"):
        tables.append(tbl)
    top = [t for t in body.findall(".//" + W + "tbl") if True]
    # top-level = not inside another table
    parent = {c: p for p in root.iter() for c in p}
    def is_nested(t):
        p = parent.get(t)
        while p is not None:
            if p.tag == W + "tbl": return True
            p = parent.get(p)
        return False
    top = [t for t in tables if not is_nested(t)]
    xml = z.read("word/document.xml").decode("utf8", "replace")
    result = []
    for i, t in enumerate(top, 1):
        grid = table_grid(t)
        tx = ET.tostring(t, encoding="unicode")
        result.append({
            "index": i,
            "rows": len(grid),
            "cols": max(sum(c["colspan"] for c in r) for r in grid) if grid else 0,
            "cells": sum(len(r) for r in grid),
            "colspans": sum(1 for r in grid for c in r if c["colspan"] > 1),
            "rowspans": sum(1 for r in grid for c in r if c["rowspan"] > 1),
            "multiPara": sum(1 for r in grid for c in r if len(c["paras"]) > 1),
            "sup": sum(c["fmt"]["sup"] for r in grid for c in r),
            "sub": sum(c["fmt"]["sub"] for r in grid for c in r),
            "bold": sum(c["fmt"]["b"] for r in grid for c in r),
            "italic": sum(c["fmt"]["i"] for r in grid for c in r),
            "shaded": sum(1 for r in grid for c in r if c["shaded"]),
            "nested": any(c["nested"] for r in grid for c in r),
            "endnoteFields": tx.count("EN.CITE") and len(re.findall(r"ADDIN EN\.CITE(?!\.DATA)", tx)),
            "footnoteRefs": tx.count("footnoteReference"),
            "headerRows": header_rows(t),
            "grid": grid,
        })
    json.dump(result, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"{len(top)} top-level tables ({len(tables)} including nested)")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
