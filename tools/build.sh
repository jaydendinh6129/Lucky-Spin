#!/bin/sh
# Build JParty for production (no Node needed — uses macOS JavaScriptCore).
#   dev.html + js/**  →  dist/app.js, dist/data.js, index.html, sw.js
set -e
cd "$(dirname "$0")/.."
mkdir -p tools/vendor dist
if [ ! -f tools/vendor/babel.min.js ]; then
  echo "Fetching Babel standalone (one-time, ~3 MB)…"
  curl -sL -o tools/vendor/babel.min.js https://unpkg.com/@babel/standalone@7.29.9/babel.min.js
fi
osascript -l JavaScript tools/build.js
