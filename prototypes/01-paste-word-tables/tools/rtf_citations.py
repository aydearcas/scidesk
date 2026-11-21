"""Does the RTF that Word puts on the clipboard carry EndNote's citation data?

Usage: python -I tools/rtf_citations.py private/clip-cites/*.rtf
Counts the EndNote fields and, for EN.CITE.DATA fields, decodes the {\\*\\datafield ...}
payload (hex of the base64 of the EndNote XML) to check that the full record is there.
Prints counts only, never the content.
"""
import base64, binascii, re, sys

for path in sys.argv[1:]:
    rtf = open(path, encoding="latin-1").read()
    plain = len(re.findall(r"ADDIN EN\.CITE(?!\.DATA)", rtf))
    data_fields = len(re.findall(r"ADDIN EN\.CITE\.DATA", rtf))
    decoded_ok = 0
    for m in re.finditer(r"\\datafield\s+([0-9a-fA-F\s]+)\}", rtf):
        raw = binascii.unhexlify(re.sub(r"\s", "", m.group(1)))
        # on the clipboard the payload is the EndNote XML itself, hex-encoded
        # (inside the .docx, w:fldData holds it in base64)
        xml = raw.decode("utf-8", "replace")
        if "<EndNote>" not in xml:
            b64 = re.sub(rb"[^A-Za-z0-9+/=]", b"", raw)
            try:
                xml = base64.b64decode(b64 + b"=" * (-len(b64) % 4)).decode("utf-8", "replace")
            except Exception:
                xml = ""
        if "<EndNote>" in xml and "<record>" in xml:
            decoded_ok += 1
    in_clear = len(re.findall(r"<EndNote>", rtf))
    print(f"{path.split('/')[-1]}: EN.CITE={plain} (of which EN.CITE.DATA={data_fields}); records in clear={in_clear}; datafield decoded to a full record={decoded_ok}")
