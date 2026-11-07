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

## Adding guests

- Fill `invitacion` (the name printed on the invitation) and `nombres`
  (every person in it, separated by commas: "Ana Pérez, Luis López, Sofía López").
  One row per invitation. Leave `id` blank. Guests tick who is coming, and the
  names land in `asisten` with the count in `confirmados`.
- Run **assignIds** from the Apps Script editor (or just run **setup** again).
  Rows without an id are not searchable.
- Delete the two sample rows whenever you like.

## Changing the script later

If you edit `Code.gs`, you must publish again: **Deploy → Manage deployments →
pencil icon → Version: New version → Deploy**. The URL stays the same.

## Testing

Open `<WEB_APP_URL>?q=ejemplo` in a browser. You should get JSON with the
sample row. If you see an HTML error page instead, the deployment access is
not set to "Anyone".
