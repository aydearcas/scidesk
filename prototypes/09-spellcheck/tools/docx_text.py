"""Plain text of a DOCX body, one paragraph per line (field codes skipped).
Usage: python -I tools/docx_text.py <file.docx> <out.txt>   (output goes to private/)"""
import sys, zipfile
import xml.etree.ElementTree as ET
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
root = ET.fromstring(zipfile.ZipFile(sys.argv[1]).read("word/document.xml"))
lines = []
for p in root.iter(W + "p"):
    out, code = [], False
    for el in p.iter():
        if el.tag == W + "fldChar":
            code = el.get(W + "fldCharType") == "begin" or (code and el.get(W + "fldCharType") not in ("separate", "end"))
        elif el.tag == W + "t" and not code:
            out.append(el.text or "")
        elif el.tag == W + "tab":
            out.append("\t")
    line = "".join(out).strip()
    if line:
        lines.append(line)
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(lines) + "\n")
print(len(lines), "paragraphs,", sum(len(l.split()) for l in lines), "words")
