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
ap.add_argument("--design", choices=["a", "b"], help="shortcut: a = template.svg, b = template_b.svg")
ap.add_argument("--out", default="invitaciones")
ap.add_argument("--site", default="https://luigipacheco.github.io/boda/confirmar/")
ap.add_argument("--pdf", action="store_true", help="export a PDF per invitation with Inkscape")
ap.add_argument("--png", action="store_true", help="export a 300 dpi PNG per invitation with Inkscape")
ap.add_argument("--qr-color", default="#1f4e8c")
ap.add_argument("--lang", default="row", choices=["es", "en", "both", "row"],
                help="es / en / both, or 'row' = use the 'idioma' column (es if empty)")
ap.add_argument("--png-only", action="store_true", help="write only the invitation PNG (no SVG, PDF or QR files)")
ap.add_argument("--only", help="generate just the invitation with this code (for previews)")
a = ap.parse_args()

if a.design:
    a.template = os.path.join(HERE, "template.svg" if a.design == "a" else "template_b.svg")
TPL_ES = open(a.template, encoding="utf-8").read()
_en_path = a.template[:-4] + "_en.svg"   # template.svg -> template_en.svg, template_b.svg -> template_b_en.svg
TPL_EN = open(_en_path, encoding="utf-8").read() if os.path.exists(_en_path) else None
tpl = TPL_ES
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

# --- fit the family name: shrink its font size if the name is too wide --------
NAME_MAX_MM = 96.0
def _font_measurer():
    try:
        from fontTools.ttLib import TTFont
        for path in (os.path.expanduser("~/Library/Fonts/CormorantGaramond-Italic[wght].ttf"),
                     "/Library/Fonts/CormorantGaramond-Italic[wght].ttf"):
            if os.path.exists(path):
                f = TTFont(path); cmap = f.getBestCmap(); hm = f["hmtx"]; upm = f["head"].unitsPerEm
                return lambda txt, size: sum(hm[cmap.get(ord(c), cmap[32])][0] for c in txt) / upm * size
    except Exception:
        pass
    return lambda txt, size: len(txt) * size * 0.42   # rough fallback
measure = _font_measurer()
name_el = re.search(r'<text\b[^>]*>\{\{FAMILIA\}\}</text>', tpl)
name_size = float(re.search(r'font-size="([\d.]+)"', name_el.group(0)).group(1)) if name_el else None
_nm = re.search(r'data-name-max="([\d.]+)"', name_el.group(0)) if name_el else None
if _nm:
    NAME_MAX_MM = float(_nm.group(1))

def fit_name(svg, fam):
    if not name_size:
        return svg
    size = name_size
    w = measure(fam, size)
    if w > NAME_MAX_MM:
        size = round(size * NAME_MAX_MM / w, 2)
    el = re.search(r'<text\b[^>]*>' + re.escape(escape(fam)) + r'</text>', svg)
    if not el or size == name_size:
        return svg
    new = re.sub(r'font-size="[\d.]+"', f'font-size="{size}"', el.group(0), count=1)
    return svg[:el.start()] + new + svg[el.end():]

def inkscape():
    for c in ("inkscape", "/Applications/Inkscape.app/Contents/MacOS/inkscape"):
        if shutil.which(c) or os.path.exists(c):
            return c
    return None

def make_one(code, fam, lang, suffix):
    link = a.site + "?c=" + urllib.parse.quote(code) + ("&lang=en" if lang == "en" else "")
    tpl = TPL_EN if (lang == "en" and TPL_EN) else TPL_ES
    m = re.search(r'<rect\b[^<>]*\bid="qr"[^<>]*/>', tpl)
    # insert the QR first (positions refer to the untouched template), then the texts
    svg = tpl[:m.start()] + qr_group(link) + tpl[m.end():]
    svg = svg.replace("{{FAMILIA}}", escape(fam)).replace("{{CODIGO}}", escape(code))
    svg = fit_name(svg, fam)
    # file name = family name (accents kept, unsafe characters removed), e.g. "Familia Pacheco Alcalá.pdf"
    safe = re.sub(r'[\\/:*?"<>|]+', "", fam).strip().rstrip(". ") or code   # no "Sra..pdf"
    if suffix:
        safe += " (EN)" if lang == "en" else " (ES)"
    path = os.path.join(a.out, f"{safe}.svg")
    if os.path.exists(path):          # two families with the same name: add the code
        path = os.path.join(a.out, f"{safe} ({code}).svg")
    open(path, "w", encoding="utf-8").write(svg)
    if not a.png_only:
        # standalone QR for this family, in case it goes on a different design
        qr = segno.make(link, error="m")
        qr.save(path[:-4] + " QR.png", dark=a.qr_color, light="#ffffff", scale=12, border=2)
        qr.save(path[:-4] + " QR.svg", dark=a.qr_color, light=None, border=2)
    if ink:
        if a.pdf:
            subprocess.run([ink, path, "--export-type=pdf", "--export-filename=" + path[:-4] + ".pdf"], check=False, stderr=subprocess.DEVNULL)
        if a.png:
            subprocess.run([ink, path, "--export-type=png", "--export-dpi=300", "--export-filename=" + path[:-4] + ".png"], check=False, stderr=subprocess.DEVNULL)
    if a.png_only:
        os.remove(path)          # keep just the PNG
    return 1


os.makedirs(a.out, exist_ok=True)
if a.png_only:
    a.png, a.pdf = True, False
ink = inkscape() if (a.pdf or a.png) else None
if (a.pdf or a.png) and not ink:
    print("Inkscape not found: writing SVGs only. Install Inkscape to get PDF/PNG.")

made = 0
with open(a.csv, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        code = (row.get("id") or "").strip()
        fam = " ".join((row.get("invitacion") or "").split())   # collapse stray spaces
        if not code or not fam:
            continue
        if a.only and code.lower() != a.only.lower():
            continue
        if a.lang == "row":
            langs = ["en"] if (row.get("idioma") or "").strip().lower().startswith("en") else ["es"]
        elif a.lang == "both":
            langs = ["es", "en"]
        else:
            langs = [a.lang]
        for lang in langs:
            made += make_one(code, fam, lang, len(langs) > 1)
        continue

print(f"{made} invitations written to {a.out}/")

