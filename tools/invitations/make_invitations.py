#!/usr/bin/env python3
"""
Personalised invitations: template.svg + guest CSV -> one SVG (and PDF) per family.

  python3 tools/invitations/make_invitations.py invitados.csv
  python3 tools/invitations/make_invitations.py invitados.csv --pdf        # also export PDFs via Inkscape
  python3 tools/invitations/make_invitations.py invitados.csv --template my.svg --out ~/Desktop/invitaciones

CSV columns: id, invitacion (as exported from the "Invitados" sheet). Optional: enlace.
Template placeholders: {{FAMILIA}}, {{CODIGO}}, and an element with id="qr" (a square).
Requires: pip3 install --user segno   (and Inkscape for --pdf)
"""
import argparse, csv, os, re, shutil, subprocess, sys, urllib.parse
from xml.sax.saxutils import escape

try:
    import segno
except ImportError:
    sys.exit("segno is missing: run  pip3 install --user segno")

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("csv")
ap.add_argument("--template", default=os.path.join(HERE, "template.svg"))
ap.add_argument("--out", default="invitaciones")
ap.add_argument("--site", default="https://luigipacheco.github.io/boda/confirmar/")
ap.add_argument("--pdf", action="store_true", help="export a PDF per invitation with Inkscape")
ap.add_argument("--png", action="store_true", help="export a 300 dpi PNG per invitation with Inkscape")
ap.add_argument("--qr-color", default="#1f3350")
a = ap.parse_args()

tpl = open(a.template, encoding="utf-8").read()
m = re.search(r'<rect\b[^<>]*\bid="qr"[^<>]*/>', tpl)
if not m:
    sys.exit('template has no element with id="qr"')
attrs = dict(re.findall(r'([\w:-]+)="([^"]*)"', m.group(0)))
try:
    qx, qy, qs = float(attrs["x"]), float(attrs["y"]), float(attrs["width"])
except KeyError:
    sys.exit('the id="qr" element must be a <rect> with x, y and width')

def qr_group(link):
    qr = segno.make(link, error="m")
    n = qr.symbol_size(border=0)[0]
    d = []
    for ry, row in enumerate(qr.matrix_iter(scale=1, border=0)):
        for rx, dark in enumerate(row):
            if dark:
                d.append(f"M{rx} {ry}h1v1h-1z")
    scale = qs / n
    return (f'<g id="qr" transform="translate({qx} {qy}) scale({scale:.5f})">'
            f'<path d="{"".join(d)}" fill="{a.qr_color}" shape-rendering="crispEdges"/></g>')

def inkscape():
    for c in ("inkscape", "/Applications/Inkscape.app/Contents/MacOS/inkscape"):
        if shutil.which(c) or os.path.exists(c):
            return c
    return None

os.makedirs(a.out, exist_ok=True)
ink = inkscape() if (a.pdf or a.png) else None
if (a.pdf or a.png) and not ink:
    print("Inkscape not found: writing SVGs only. Install Inkscape to get PDF/PNG.")

made = 0
with open(a.csv, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        code = (row.get("id") or "").strip()
        fam = (row.get("invitacion") or "").strip()
        if not code or not fam:
            continue
        link = (row.get("enlace") or "").strip() or a.site + "?c=" + urllib.parse.quote(code)
        # insert the QR first (positions refer to the untouched template), then the texts
        svg = tpl[:m.start()] + qr_group(link) + tpl[m.end():]
        svg = svg.replace("{{FAMILIA}}", escape(fam)).replace("{{CODIGO}}", escape(code))
        # file name = family name (accents kept, unsafe characters removed), e.g. "Familia Pacheco Alcalá.pdf"
        safe = re.sub(r'[\\/:*?"<>|]+', "", fam).strip() or code
        path = os.path.join(a.out, f"{safe}.svg")
        if os.path.exists(path):          # two families with the same name: add the code
            path = os.path.join(a.out, f"{safe} ({code}).svg")
        open(path, "w", encoding="utf-8").write(svg)
        made += 1
        if ink:
            if a.pdf:
                subprocess.run([ink, path, "--export-type=pdf", "--export-filename=" + path[:-4] + ".pdf"], check=False, stderr=subprocess.DEVNULL)
            if a.png:
                subprocess.run([ink, path, "--export-type=png", "--export-dpi=300", "--export-filename=" + path[:-4] + ".png"], check=False, stderr=subprocess.DEVNULL)

print(f"{made} invitations written to {a.out}/")

