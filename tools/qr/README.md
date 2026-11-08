# QR codes for the invitations

Each invitation has a code (the `id` column in the Sheet). A QR that opens
`https://luigipacheco.github.io/boda/confirmar/?c=CODE` lets guests skip typing.

## Quick, inside the Sheet
Menu **Boda → Generar enlaces y QR**. Adds `enlace` and `qr` columns. Good for
sharing links by WhatsApp and for a scan test.

## Print quality, on the Mac
1. Export the sheet: File → Download → Comma-separated values (.csv).
2. Run:
   ```
   pip3 install --user segno          # once
   python3 tools/qr/make_qr.py ~/Downloads/Invitados.csv --out ~/Desktop/qr
   ```
3. You get `qr/<code>.svg` (vector, for the printer) and `qr/<code>.png`
   (for messages), plus `index.csv` listing which file belongs to which family.

Options: `--dark "#000000"` for black, `--scale 20` for bigger PNGs,
`--site https://yourdomain.com/confirmar/` if the domain changes.
Keep the QR at least 2 cm wide on the printed card and leave white space around it.
