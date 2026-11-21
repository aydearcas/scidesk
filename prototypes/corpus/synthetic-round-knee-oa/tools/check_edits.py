"""Check a coauthor edit list against the sent text, and simulate its result.

Usage (from the corpus folder):
  python tools/check_edits.py EDITS.json                 -> schema, anchors, overlaps, counts
  python tools/check_edits.py EDITS.json --expected OUT  -> also writes the expected paragraphs
                                                            after accepting every edit
The sent text comes from build/sent-paragraphs.json (extracted from sent.docx by Word).
"""
import argparse
import collections
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES = {"insert", "delete", "replace", "comment", "format",
         "split_paragraph", "merge_paragraphs", "move"}


def load_paragraphs():
    paras = json.loads((ROOT / "build" / "sent-paragraphs.json").read_text(encoding="utf-8"))
    return [p for p in paras if p["text"] != ""]


def scope_of(paras, loc):
    """Indices of paragraphs an anchor may be searched in."""
    if loc.get("table") is not None:
        return [i for i, p in enumerate(paras)
                if p.get("table") == loc["table"] and p.get("row") == loc.get("row")
                and p.get("col") == loc.get("col")]
    return list(range(len(paras)))


def locate(paras, loc):
    """Return (paragraph index, start, end) of the target, or an error string."""
    anchor, target = loc.get("anchor"), loc.get("target") or loc.get("anchor")
    if not anchor:
        return "missing anchor"
    if "^" in anchor:
        return "anchor contains ^"
    if len(anchor) > 240:
        return f"anchor too long ({len(anchor)} chars)"
    hits = []
    for i in scope_of(paras, loc):
        text = paras[i]["text"]
        start = text.find(anchor)
        while start >= 0:
            hits.append((i, start))
            start = text.find(anchor, start + 1)
    if len(hits) != 1:
        return f"anchor found {len(hits)} times"
    i, a = hits[0]
    off = anchor.find(target)
    if off < 0:
        return "target is not inside anchor"
    return (i, a + off, a + off + len(target))


def primitives(paras, e):
    """Translate one edit into primitive text operations (or raise ValueError)."""
    loc = locate(paras, e)
    if isinstance(loc, str):
        raise ValueError(loc)
    i, s, t = loc
    typ = e["type"]
    if typ == "insert":
        pos = s if e.get("position") == "before" else t
        return [("replace", i, pos, pos, e["text"])]
    if typ == "delete":
        return [("replace", i, s, t, "")]
    if typ == "replace":
        return [("replace", i, s, t, e["text"])]
    if typ in ("comment", "format"):
        return []
    if typ == "split_paragraph":
        return [("split", i, s, s, None)]
    if typ == "merge_paragraphs":
        if s != 0:
            raise ValueError("merge target is not at the start of a paragraph")
        if paras[i].get("table") is not None:
            raise ValueError("merge inside a table")
        return [("merge", i, 0, 0, None)]
    if typ == "move":
        d = locate(paras, e["destination"])
        if isinstance(d, str):
            raise ValueError("destination: " + d)
        di, ds, dt = d
        pos = dt if e["destination"].get("position") == "after" else ds
        moved = paras[i]["text"][s:t]
        return [("replace", di, pos, pos, moved), ("replace", i, s, t, "")]
    raise ValueError(f"unknown type {typ}")


def check(edits, paras):
    problems = []
    spans = []  # text-changing spans, for overlap checks
    for e in edits:
        eid = e.get("id", "?")
        if e.get("type") not in TYPES:
            problems.append((eid, f"bad type {e.get('type')}"))
            continue
        if "tracked" not in e:
            problems.append((eid, "missing tracked"))
        need = {"insert": ["text"], "replace": ["text"], "comment": ["comment"],
                "format": ["format"], "move": ["destination"]}.get(e["type"], [])
        for k in need:
            if k not in e:
                problems.append((eid, f"missing {k}"))
        try:
            ops = primitives(paras, e)
        except (ValueError, KeyError) as exc:
            problems.append((eid, str(exc)))
            continue
        for op in ops:
            spans.append((op[1], op[2], op[3], eid, op[0]))
    # Text-changing spans must not overlap (insertions at the same point count as overlap too).
    spans.sort()
    for a, b in zip(spans, spans[1:]):
        if a[0] == b[0] and (b[1] < a[2] or (b[1] == a[1])) and a[3] != b[3]:
            problems.append((b[3], f"overlaps edit {a[3]} in paragraph {a[0]}"))
    return problems


def simulate(edits, paras):
    texts = [p["text"] for p in paras]
    ops = []
    for e in edits:
        ops.extend(primitives(paras, e))
    # Apply from the end of the document backwards so earlier positions stay valid.
    ops.sort(key=lambda o: (o[1], o[2]), reverse=True)
    for kind, i, s, t, new in ops:
        if kind == "replace":
            texts[i] = texts[i][:s] + new + texts[i][t:]
        elif kind == "split":
            left = texts[i][:s]
            if left.endswith(" "):
                left = left[:-1]
            texts[i:i + 1] = [left, texts[i][s:]]
        elif kind == "merge":
            texts[i - 1:i + 1] = [texts[i - 1] + " " + texts[i]]
    return texts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edits")
    ap.add_argument("--expected")
    args = ap.parse_args()
    data = json.loads(Path(args.edits).read_text(encoding="utf-8"))
    edits = data["edits"]
    paras = load_paragraphs()
    problems = check(edits, paras)
    ids = [e.get("id") for e in edits]
    dup = [k for k, v in collections.Counter(ids).items() if v > 1]
    for d in dup:
        problems.append((d, "duplicate id"))
    counts = collections.Counter(e.get("type") for e in edits)
    print(f"{len(edits)} edits: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    print("untracked:", sum(1 for e in edits if e.get("tracked") is False),
          "| noise:", sum(1 for e in edits if e.get("noise")),
          "| shared:", sorted({e["shared_passage"] for e in edits if e.get("shared_passage")}),
          "| table:", sum(1 for e in edits if e.get("table") is not None))
    for eid, msg in problems:
        print(f"PROBLEM {eid}: {msg}")
    if not problems:
        print("OK")
    if args.expected and not problems:
        Path(args.expected).write_text(
            json.dumps(simulate(edits, paras), ensure_ascii=False, indent=1), encoding="utf-8")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
