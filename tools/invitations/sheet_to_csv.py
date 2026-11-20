#!/usr/bin/env python3
"""
Convert the "Invitados Boda" workbook (.xlsx export) into the CSV the generator reads.

  python3 tools/invitations/sheet_to_csv.py private/Invitados-Boda.xlsx private/Invitados.csv

Language per invitation:
  - if the sheet has an "idioma" column, its value wins (es / en);
  - otherwise English when the invitation says "Family", "and" or "&", Spanish for the rest.
  - names (or codes) listed in private/idioma_en.txt, one per line, are always English.
Sample rows ("Ejemplo") and rows without a code are skipped.
"""
import csv, re, sys
import openpyxl

src, dst = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(src, read_only=True, data_only=True)["Invitados"]
rows = list(ws.iter_rows(values_only=True))
hdr = [str(h or "").strip().lower() for h in rows[0]]
col = {h: i for i, h in enumerate(hdr)}

def get(r, name):
    i = col.get(name)
    return " ".join(str(r[i] or "").split()) if i is not None and i < len(r) else ""

import os
force_en = set()
_ov = os.path.join(os.path.dirname(os.path.abspath(dst)), "idioma_en.txt")
if os.path.exists(_ov):
    force_en = {" ".join(l.split()).lower() for l in open(_ov, encoding="utf-8") if l.strip() and not l.startswith("#")}

out, skipped = [], []
for r in rows[1:]:
    code, inv = get(r, "id"), get(r, "invitacion")
    if not inv:
        continue
    if not code or "ejemplo" in inv.lower():
        skipped.append(inv or code); continue
    lang = get(r, "idioma").lower()[:2]
    if lang not in ("es", "en"):
        lang = "en" if re.search(r"\bfamily\b|\band\b|&", inv, re.I) else "es"
    if inv.lower() in force_en or code.lower() in force_en:
        lang = "en"
    out.append({"id": code, "invitacion": inv, "nombres": get(r, "nombres"), "idioma": lang})

with open(dst, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["id", "invitacion", "nombres", "idioma"])
    w.writeheader(); w.writerows(out)
en = sum(1 for o in out if o["idioma"] == "en")
print(f"{len(out)} invitations -> {dst}  ({len(out)-en} Spanish, {en} English). Skipped: {skipped}")
