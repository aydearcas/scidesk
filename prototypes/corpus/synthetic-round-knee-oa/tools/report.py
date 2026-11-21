"""Write the ground truth (edits-*.json) and report.md from the reviews and Word's inspection.

Usage: python tools/report.py   (run from the corpus folder, after word.ps1 apply and inspect)
"""
import collections
import difflib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_edits as ce  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
COAUTHORS = [("rios", "Dra. Marta Ríos Navarro"), ("soler", "Dr. Javier Soler Benítez")]
REV_TYPES = {1: "inserción", 2: "borrado", 3: "formato", 8: "estilo", 10: "formato de párrafo",
             11: "propiedad de tabla", 14: "movido desde", 15: "movido a"}
TYPE_ES = {"insert": "inserción", "delete": "borrado", "replace": "sustitución",
           "comment": "comentario", "format": "formato", "split_paragraph": "párrafo partido",
           "merge_paragraphs": "párrafos unidos", "move": "frase movida"}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def as_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def paragraph_diff(a, b):
    return [l for l in difflib.unified_diff(a, b, lineterm="", n=0)
            if not l.startswith(("---", "+++", "@@"))]


def short(text, n=90):
    text = text.replace("\n", " ")
    return text if len(text) <= n else text[: n - 1] + "…"


def main():
    paras = ce.load_paragraphs()
    inspect = {f["file"]: f for f in load(ROOT / "build" / "inspect.json")}
    reviews, spans, word_stats, checks = {}, {}, {}, {}

    for key, label in COAUTHORS:
        review = load(ROOT / "source" / f"review-{key}.json")
        edits = review["edits"]
        applied = {a["id"]: a for a in load(ROOT / "build" / f"apply-{key}.json")}
        f = inspect[f"returned-{key}.docx"]
        revs, coms = as_list(f["revisions"]), as_list(f["comments"])
        accepted = [t for t in f["accepted"] if t]
        rejected = [t for t in f["rejected"] if t]
        expected = [t for t in ce.simulate(edits, paras) if t]
        expected_rej = [t for t in ce.simulate([e for e in edits if e.get("tracked") is False], paras) if t]
        acc_diff = paragraph_diff(expected, accepted)
        rej_diff = paragraph_diff(expected_rej, rejected)
        bad_paras = [l[1:] for l in acc_diff if l.startswith("-")]
        com_index = collections.Counter((c["scope"], c["text"]) for c in coms)
        prop_revs = collections.Counter(r["text"] for r in revs if r["type"] == 3)

        out = []
        for e in edits:
            a = applied.get(e["id"], {})
            rec = dict(e)
            rec["applied"] = bool(a.get("applied"))
            rec["applied_with_track_changes"] = bool(a.get("applied")) and bool(e.get("tracked"))
            problems = []
            if not a.get("applied"):
                problems.append(a.get("error", "not applied"))
            loc = ce.locate(paras, e)
            rec["sent_paragraph"] = loc[0] if isinstance(loc, tuple) else None
            if e["type"] == "comment":
                target = e.get("target") or e["anchor"]
                if com_index[(target, e["comment"])] < 1:
                    problems.append("comment not found in Word with this scope and text")
            elif e["type"] == "format" and e.get("tracked"):
                target = e.get("target") or e["anchor"]
                if prop_revs[target] < 1:
                    problems.append("no tracked formatting revision over the target")
            elif isinstance(loc, tuple):
                head = paras[loc[0]]["text"][:30]
                if any(b.startswith(head) for b in bad_paras):
                    problems.append("paragraph differs from the expected text after accepting all")
            rec["applied_ok"] = not problems
            if problems:
                rec["problems"] = problems
            out.append(rec)
        (ROOT / f"edits-{key}.json").write_text(json.dumps(
            {"coauthor": review["coauthor"], "returned_file": f"returned-{key}.docx",
             "base_file": "sent.docx", "edits": out}, ensure_ascii=False, indent=1), encoding="utf-8")
        reviews[key] = out
        spans[key] = [(e, ce.primitives(paras, e) or [("anchor",) + ce.locate(paras, e) + (None,)])
                      for e in edits]
        word_stats[key] = (revs, coms, f.get("realUserNameFoundIn") or [])
        checks[key] = (acc_diff, rej_diff)

    # Conflicts: same characters touched (hard) or same paragraph (soft) by both coauthors.
    hard, soft = [], set()
    for er, ops_r in spans["rios"]:
        for es, ops_s in spans["soler"]:
            for o1 in ops_r:
                for o2 in ops_s:
                    if o1[1] != o2[1]:
                        continue
                    soft.add(o1[1])
                    if o1[2] <= o2[3] and o2[2] <= o1[3] and (er["id"], es["id"]) not in [(h[0]["id"], h[1]["id"]) for h in hard]:
                        hard.append((er, es))

    L = []
    L.append("# Informe de la ronda sintética: artrosis de rodilla acelerada\n")
    L.append("Generado por `tools/report.py`. Material sintético de prueba: ni el artículo ni las revisiones son reales.\n")
    L.append("## Ediciones por tipo y coautor\n")
    types = list(TYPE_ES)
    L.append("| Tipo | " + " | ".join(lbl for _, lbl in COAUTHORS) + " |")
    L.append("|---|" + "---|" * len(COAUTHORS))
    for t in types:
        L.append(f"| {TYPE_ES[t]} | " + " | ".join(str(sum(1 for e in reviews[k] if e['type'] == t)) for k, _ in COAUTHORS) + " |")
    rows = [("**Total**", lambda es: len(es)),
            ("con control de cambios", lambda es: sum(1 for e in es if e.get("tracked"))),
            ("sin control de cambios", lambda es: sum(1 for e in es if e.get("tracked") is False)),
            ("en celdas de tabla", lambda es: sum(1 for e in es if e.get("table") is not None)),
            ("de ruido (solo espacios, comillas o guiones)", lambda es: sum(1 for e in es if e.get("noise"))),
            ("aplicadas bien", lambda es: sum(1 for e in es if e["applied_ok"]))]
    for name, fn in rows:
        L.append(f"| {name} | " + " | ".join(str(fn(reviews[k])) for k, _ in COAUTHORS) + " |")
    L.append("")
    L.append("Los comentarios de Soler se marcan como `tracked: true`, pero un comentario no depende del control de cambios.\n")

    L.append("## Pasajes en conflicto\n")
    L.append("Zonas compartidas que se pidieron a los dos coautores (cada uno sin ver la revisión del otro):\n")
    names = {"S1": "Epidemiología, frase del 4 % en la OAI", "S2": "Criterios radiográficos, frase de Driban",
             "S3": "Tabla 1, fila 7 (artroplastia a cinco años)", "S4": "Conclusiones, primera frase"}
    L.append("| Zona | Ríos | Soler |")
    L.append("|---|---|---|")
    for sp, nm in names.items():
        cells = []
        for k, _ in COAUTHORS:
            items = [e for e in reviews[k] if e.get("shared_passage") == sp and e["type"] != "comment"]
            cells.append("<br>".join(f"{e['id']}: «{short(e.get('target') or e['anchor'], 50)}» → «{short(e.get('text', ''), 60)}»" if e["type"] in ("replace", "insert") else f"{e['id']}: {TYPE_ES[e['type']]} «{short(e.get('target') or e['anchor'], 50)}»" for e in items))
        L.append(f"| {sp}: {nm} | " + " | ".join(cells) + " |")
    L.append("")
    L.append(f"Solapamientos detectados al comparar las dos listas (mismos caracteres tocados, contando también comentarios y formato): **{len(hard)}**.\n")
    L.append("| Ríos | Soler | Párrafo enviado |")
    L.append("|---|---|---|")
    for er, es in hard:
        p = ce.locate(paras, er)
        L.append(f"| {er['id']} ({TYPE_ES[er['type']]}) | {es['id']} ({TYPE_ES[es['type']]}) | {short(paras[p[0]]['text'], 70) if isinstance(p, tuple) else ''} |")
    L.append("")
    L.append(f"Párrafos (o celdas) que tocan los dos coautores: **{len(soft)}**.\n")

    L.append("## Lo que reporta Word\n")
    L.append("Leído con `word.ps1 inspect` (colecciones `Revisions` y `Comments` de Word).\n")
    for k, lbl in COAUTHORS:
        revs, coms, leaks = word_stats[k]
        L.append(f"### returned-{k}.docx ({lbl})\n")
        by = collections.Counter((r["author"], REV_TYPES.get(r["type"], str(r["type"]))) for r in revs)
        L.append(f"- Revisiones: **{len(revs)}**. " + "; ".join(f"{a}, {t}: {n}" for (a, t), n in sorted(by.items())))
        cb = collections.Counter((c["author"], c["initials"]) for c in coms)
        L.append(f"- Comentarios: **{len(coms)}**. " + "; ".join(f"{a} ({i}): {n}" for (a, i), n in cb.items()))
        real = sum(1 for r in revs if r["isRealUser"]) + sum(1 for c in coms if c["isRealUser"])
        L.append(f"- Revisiones o comentarios firmados con el nombre real de la cuenta de Office: **{real}**.")
        L.append(f"- Partes del paquete que contienen el nombre real: **{len(leaks)}**{(' (' + ', '.join(leaks) + ')') if leaks else ''}.")
        acc_diff, rej_diff = checks[k]
        L.append(f"- Texto tras «Aceptar todo» frente al esperado: **{'igual' if not acc_diff else str(len(acc_diff)) + ' líneas distintas'}**.")
        L.append(f"- Texto tras «Rechazar todo» frente a la versión enviada con solo las ediciones sin control de cambios: **{'igual' if not rej_diff else str(len(rej_diff)) + ' líneas distintas'}**.")
        L.append("")
    sent = inspect["sent.docx"]
    L.append(f"`sent.docx`: {len(as_list(sent['revisions']))} revisiones y {len(as_list(sent['comments']))} comentarios; partes con el nombre real: {len(sent.get('realUserNameFoundIn') or [])}.\n")

    L.append("## Problemas y limitaciones\n")
    failed = [(k, e) for k, _ in COAUTHORS for e in reviews[k] if not e["applied_ok"]]
    if failed:
        for k, e in failed:
            L.append(f"- {e['id']}: {'; '.join(e.get('problems', []))}")
    else:
        L.append("- Todas las ediciones se aplicaron y se comprobaron; ninguna se descartó ni se corrigió a mano.")
    L.extend([
        "- Las frases movidas se graban como borrado más inserción (`w:del` y `w:ins`), no como movimiento (`w:moveFrom` y `w:moveTo`): para no tocar el portapapeles del usuario no se usa cortar y pegar, y Word solo marca movimientos con cortar y pegar o arrastrar.",
        "- Las ediciones las aplica el modelo de objetos de Word sobre rangos, no un usuario tecleando: no hay autocorrección, ni sustitución automática de comillas, ni `rsid` de varias sesiones.",
        "- En las celdas de tabla, `Find` de Word no encontraba el texto dentro del rango de una celda; las anclas de celda se buscan en el texto de la celda.",
        "- Párrafo partido: se sustituye el espacio anterior a la frase por un salto de párrafo (borrado del espacio e inserción de la marca de párrafo, ambos con control de cambios).",
        "- No hay copia pasada por LibreOffice: LibreOffice no está instalado en este equipo y no se ha instalado.",
    ])
    (ROOT / "report.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print("wrote report.md, edits-rios.json, edits-soler.json")
    for k, _ in COAUTHORS:
        print(k, "ok", sum(1 for e in reviews[k] if e["applied_ok"]), "/", len(reviews[k]),
              "| accepted diff", len(checks[k][0]), "| rejected diff", len(checks[k][1]))
    print("hard overlaps", len(hard), "| shared paragraphs", len(soft))


if __name__ == "__main__":
    main()
