#!/usr/bin/env bash
# Fetch the fonts of the app: bash tools/get-fonts.sh
# The app ships its own fonts: no request to a font server, it works offline and looks the same on every device.
# One superfamily, IBM Plex (SIL Open Font License 1.1): Sans for reading, Sans Condensed for page titles and big
# numerals, Mono for everything the PLC says (addresses, values, code).
# The files are the complete, unchanged fonts from IBM's npm packages (the files Google Fonts serves are cut into
# language blocks and have no arrows and no maths signs, so "→", "≥" or "Ω" were drawn with some other font).
# Unchanged on purpose: the licence reserves the name "Plex" for the original files.
# Writes fonts/*.woff2, fonts/OFL.txt and fonts.css. Needs npm and tar.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
rm -rf "$ROOT/fonts"; mkdir -p "$ROOT/fonts"
get() { # package  file-in-package  output-name
  local d="$T/$(echo "$1" | tr '/@' '__')"
  if [ ! -d "$d" ]; then mkdir -p "$d"; (cd "$d" && tar -xzf "$(npm pack "$1" --silent | tail -1)"); fi
  cp "$d/package/$2" "$ROOT/fonts/$3"
  [ -f "$ROOT/fonts/OFL.txt" ] || cp "$d"/package/[Ll][Ii][Cc]* "$ROOT/fonts/OFL.txt"
}
W=fonts/complete/woff2
get @ibm/plex-sans-variable@1.0.0  "$W/IBM Plex Sans Var-Roman.woff2"        plex-sans.woff2
get @ibm/plex-sans@2.0.0           "$W/IBMPlexSans-Italic.woff2"             plex-sans-italic.woff2
get @ibm/plex-sans-condensed@3.0.0 "$W/IBMPlexSansCondensed-SemiBold.woff2"  plex-sans-condensed-600.woff2
get @ibm/plex-sans-condensed@3.0.0 "$W/IBMPlexSansCondensed-Bold.woff2"      plex-sans-condensed-700.woff2
get @ibm/plex-mono@2.5.0           "$W/IBMPlexMono-Regular.woff2"            plex-mono-400.woff2
get @ibm/plex-mono@2.5.0           "$W/IBMPlexMono-Medium.woff2"             plex-mono-500.woff2
get @ibm/plex-mono@2.5.0           "$W/IBMPlexMono-SemiBold.woff2"           plex-mono-600.woff2
face() { printf "@font-face { font-family: '%s'; font-style: %s; font-weight: %s; font-display: swap; src: url(fonts/%s) format('woff2'); }\n" "$1" "$2" "$3" "$4"; }
{
  echo "/* The fonts of the app: IBM Plex, complete and unchanged (SIL Open Font License 1.1, see fonts/OFL.txt)."
  echo "   Made by tools/get-fonts.sh. Sans is one variable font for every weight from 100 to 700. */"
  face 'IBM Plex Sans' normal '100 700' plex-sans.woff2
  face 'IBM Plex Sans' italic 400 plex-sans-italic.woff2
  face 'IBM Plex Sans Condensed' normal 600 plex-sans-condensed-600.woff2
  face 'IBM Plex Sans Condensed' normal 700 plex-sans-condensed-700.woff2
  face 'IBM Plex Mono' normal 400 plex-mono-400.woff2
  face 'IBM Plex Mono' normal 500 plex-mono-500.woff2
  face 'IBM Plex Mono' normal 600 plex-mono-600.woff2
} > "$ROOT/fonts.css"
du -ck "$ROOT"/fonts/*.woff2 | tail -1
