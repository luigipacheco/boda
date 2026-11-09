# RSVP backend (Google Sheet + Apps Script)

The guest list lives in a Google Sheet you own. A small Apps Script attached to
that Sheet answers two requests from the site: "search names" and "save answer".
Guests never see the Sheet, there is no login, and re-submitting simply
overwrites their row, so they can change their mind any time.

## One-time setup (about 5 minutes)

1. Create a new Google Sheet: <https://sheets.new>. Name it e.g. **Boda – Invitados**.
2. Menu **Extensions → Apps Script**. Delete the sample code, paste the whole
   contents of `Code.gs`, and save (Ctrl/Cmd+S).
3. In the function dropdown at the top pick **setup** and press **Run**.
   Accept the permissions prompt (it only asks for access to this spreadsheet).
   You now have an `Invitados` sheet with headers and two sample rows, and a
   `Resumen` sheet with live totals.
4. **Deploy → New deployment**.
   - Type: **Web app**
   - Description: `rsvp`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Press **Deploy**, then copy the **Web app URL** (ends in `/exec`).
5. Paste that URL in `_config.yml` → `rsvp_endpoint: "https://script.google.com/macros/s/…/exec"`.
   Commit and push. The form on `/confirmar/` goes live.

## Links and QR codes per invitation

Reload the Sheet after pasting the script and a **Boda** menu appears next to
Help. It has:

1. **Asignar códigos a filas nuevas** — fills empty `id` cells (never changes existing ones).
2. **Generar enlaces y QR** — adds two columns: `enlace` (the RSVP page with the
   code pre-filled) and `qr` (a QR image of that link, rendered in the cell).
   Re-run after adding guests.

The `enlace` is what you paste into a WhatsApp message. The in-cell QR is good
for a quick scan test; for printing, make clean files with `tools/qr/make_qr.py`
(see `tools/qr/README.md`). Changing the site domain later: edit `SITE_URL` at the
top of the script and re-run "Generar enlaces y QR".

Menu functions run inside the Sheet and do **not** need a redeploy. Only changes
to `doGet` / `doPost` do.

## Adding guests

- Fill `invitacion` (the name printed on the invitation) and `nombres`
  (every person in it, separated by commas: "Ana Pérez, Luis López, Sofía López").
  One row per invitation.
- The `id` column is the **code** that family types on the site. Leave it blank
  and run **assignIds** to get a random 6-character code, or type your own
  (e.g. `PACHECO27`). Codes must be unique; case and accents don't matter.
- Print the code on each invitation. A link with the code built in skips typing:
  `https://luigipacheco.github.io/boda/confirmar/?c=PACHECO27`
- Guests tick who is coming; the names land in `asisten`, the count in `confirmados`.
- Optional phone and email typed by the guest land in `telefono` and `email`.
  Those two columns are created automatically the first time someone saves.
- Run **assignIds** from the Apps Script editor (or just run **setup** again).
  Rows without an id are not searchable.
- Delete the two sample rows whenever you like.

## Changing the script later

If you edit `Code.gs`, you must publish again: **Deploy → Manage deployments →
pencil icon → Version: New version → Deploy**. The URL stays the same.

## Testing

Open `<WEB_APP_URL>?diag=1` in a browser. You should get JSON with the script
version and the number of invitations. `<WEB_APP_URL>?code=<an id from the sheet>`
returns that invitation. If you see an HTML error page instead, the deployment access is
not set to "Anyone".
