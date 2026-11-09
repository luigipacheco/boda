# Personalised invitations

`template.svg` is the card (5 × 7 in). Open it in Inkscape and change anything:
fonts, layout, colours, wording. Keep three things for the script to fill in:

- the text `{{FAMILIA}}` → the family name from the Sheet
- the text `{{CODIGO}}` → that family's RSVP code
- a square `<rect>` with `id="qr"` → replaced by the QR code (move or resize it
  with the XML editor's id intact; in Inkscape: Object → Object Properties → ID)

## One command (recommended)

1. In the Sheet: File → Download → Comma-separated values (.csv). It lands in ~/Downloads.
2. In Terminal:
   ```
   cd ~/Documents/GitHub/boda
   ./tools/invitations/run.sh
   ```
That finds the newest `Invitados*.csv`, writes one PDF and one PNG per family
into `private/invitaciones/`, named by family ("Familia Pacheco Alcalá.pdf"),
plus that family's QR on its own ("Familia Pacheco Alcalá QR.png" / ".svg"),
and opens the folder. The QR on the card is placed automatically; the separate
QR files are for a different design or for sending alone. The `private/` folder and any guest CSV are
ignored by Git, so guest data never reaches GitHub.

## Run by hand

```
pip3 install --user segno                       # once
python3 tools/invitations/make_invitations.py ~/Downloads/Invitados.csv --out ~/Desktop/invitaciones
```

The CSV is the "Invitados" sheet exported with File → Download → CSV. You get one
SVG per family named by the family name. Add `--pdf` (or `--png` for 300 dpi images) to
export through Inkscape automatically; Inkscape must be installed
(https://inkscape.org, free).

Fonts: the template asks for Cormorant Garamond and IBM Plex Mono, the same as the
website. Install them (free on Google Fonts) so the cards match; otherwise Georgia
and Menlo are used.

