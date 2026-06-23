#!/usr/bin/env bash
# Regenerate all notation assets:
#   - LilyPond engravings  (assets/lily-*.svg)
#   - Web-app screenshots  (assets/app-*.png) via a headless browser
# Requires the sibling web app (../web) to build and a Puppeteer Chromium
# (npx puppeteer browsers install chrome).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> LilyPond engravings"
bash tools/render-lilypond.sh

echo "==> Building + serving the web app for screenshots"
( cd ../web && npm run build >/dev/null 2>&1 )
( cd ../web && npx vite preview --port 4173 >/tmp/jazz-preview.log 2>&1 & echo $! >/tmp/jazz-preview.pid )
trap 'kill "$(cat /tmp/jazz-preview.pid 2>/dev/null)" 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -s -o /dev/null http://localhost:4173/ && break; sleep 0.5; done

echo "==> Screenshots"
APP_URL=http://localhost:4173/ node tools/shoot.mjs

echo "Notation assets:"; ls -1 assets/
