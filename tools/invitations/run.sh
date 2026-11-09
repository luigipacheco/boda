#!/bin/zsh
# One command: newest guest CSV -> all invitations (SVG + PDF + PNG) + one merged PDF.
# Output goes to private/invitaciones/, which Git ignores.
#
#   ./tools/invitations/run.sh                 # uses the newest Invitados*.csv in ~/Downloads or private/
#   ./tools/invitations/run.sh path/to/file.csv
set -e
cd "$(dirname "$0")/../.."
CSV="${1:-$(ls -t ~/Downloads/Invitados*.csv private/*.csv 2>/dev/null | head -1)}"
if [[ -z "$CSV" || ! -f "$CSV" ]]; then
  echo "No CSV found. In the Sheet: File → Download → Comma-separated values, then run again."
  exit 1
fi
OUT="private/invitaciones"
echo "Using: $CSV"
rm -rf "$OUT"
python3 tools/invitations/make_invitations.py "$CSV" --out "$OUT" --pdf --png --merge
open "$OUT"
