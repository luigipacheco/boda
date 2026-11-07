# Boda · Angela & Luis

Static wedding site built with Jekyll and served by GitHub Pages.
Spanish by default, English toggle in the header.

## Edit content

- `_config.yml` — names, date, times, addresses, RSVP deadline, dress code,
  contact, and the RSVP endpoint. Most text on the site reads from here.
- `index.html`, `lugares.html`, `region.md`, `confirmar.html`, `galeria.html` —
  the pages. Bilingual text uses either
  `{% include t.html es="…" en="…" %}` for short strings or paired
  `<p lang="es">…</p><p lang="en">…</p>` blocks for paragraphs.
- `assets/img/gallery/` — drop JPGs here; the gallery page lists them in
  filename order. Keep them under ~1600 px wide.
- `assets/img/home.jpg` — the photo on the home page.
- `assets/css/main.css` — colours live in the `:root` block at the top.

## RSVP

See `tools/apps-script/README.md`.

## Run locally

```
bundle install
bundle exec jekyll serve
```
Then open <http://localhost:4000/boda/>.
