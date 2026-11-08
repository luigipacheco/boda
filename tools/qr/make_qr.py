#!/usr/bin/env python3
"""
Make print-quality QR codes, one per invitation.

Input : a CSV with columns id,invitacion (and optionally enlace), e.g. exported
        from the "Invitados" sheet (File → Download → CSV) or produced by the
        exportCodesCsv() function in the Apps Script.
Output: qr/<id>.svg and qr/<id>.png, plus qr/index.csv mapping id → family → link.

Usage:
  pip3 install --user segno
  python3 tools/qr/make_qr.py invitados.csv [--out qr] [--site URL] [--scale 12]
"""
import argparse, csv, os, sys, urllib.parse

try:
    import segno
except ImportError:
    sys.exit("segno is missing: run  pip3 install --user segno")

ap = argparse.ArgumentParser()
ap.add_argument("csv")
ap.add_argument("--out", default="qr")
ap.add_argument("--site", default="https://luigipacheco.github.io/boda/confirmar/")
ap.add_argument("--scale", type=int, default=12, help="PNG pixel size per module")
ap.add_argument("--dark", default="#1f3350", help="QR colour (dark blue by default)")
a = ap.parse_args()

os.makedirs(a.out, exist_ok=True)
made = []
with open(a.csv, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        code = (row.get("id") or "").strip()
        if not code:
            continue
        link = (row.get("enlace") or "").strip() or a.site + "?c=" + urllib.parse.quote(code)
        qr = segno.make(link, error="m")
        safe = "".join(ch for ch in code if ch.isalnum() or ch in "-_")
        qr.save(os.path.join(a.out, safe + ".svg"), dark=a.dark, light=None, border=2)
        qr.save(os.path.join(a.out, safe + ".png"), dark=a.dark, light="#ffffff", scale=a.scale, border=2)
        made.append((code, row.get("invitacion", ""), link))

with open(os.path.join(a.out, "index.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["id", "invitacion", "enlace", "svg", "png"])
    for code, fam, link in made:
        w.writerow([code, fam, link, code + ".svg", code + ".png"])

print(f"{len(made)} QR codes written to {a.out}/ (SVG for print, PNG for WhatsApp). Index: {a.out}/index.csv")
