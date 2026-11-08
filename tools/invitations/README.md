# Personalised invitations

`template.svg` is the card (5 × 7 in). Open it in Inkscape and change anything:
fonts, layout, colours, wording. Keep three things for the script to fill in:

- the text `{{FAMILIA}}` → the family name from the Sheet
- the text `{{CODIGO}}` → that family's RSVP code
- a square `<rect>` with `id="qr"` → replaced by the QR code (move or resize it
  with the XML editor's id intact; in Inkscape: Object → Object Properties → ID)

## Run

```
pip3 install --user segno                       # once
python3 tools/invitations/make_invitations.py ~/Downloads/Invitados.csv --out ~/Desktop/invitaciones
```

The CSV is the "Invitados" sheet exported with File → Download → CSV. You get one
SVG per family named by its code. Add `--pdf` (or `--png` for 300 dpi images) to
export through Inkscape automatically; Inkscape must be installed
(https://inkscape.org, free).

Fonts: the template asks for Cormorant Garamond and IBM Plex Mono, the same as the
website. Install them (free on Google Fonts) so the cards match; otherwise Georgia
and Menlo are used.

To print all PDFs as one file: select them in Finder → right-click → Quick Actions
→ Create PDF.
