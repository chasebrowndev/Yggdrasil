#!/bin/bash
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill "$MIDGARD_PID" "$ASGARD_PID" "$VANAHEIM_PID" "$SVARTALFHEIM_PID" "$BIFROST_PID" "$NIFLHEIM_PID" "$VITE_PID" 2>/dev/null
    wait "$MIDGARD_PID" "$ASGARD_PID" "$VANAHEIM_PID" "$SVARTALFHEIM_PID" "$BIFROST_PID" "$NIFLHEIM_PID" "$VITE_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

# Flask API services
python "$REPO/midgard/app.py" &
MIDGARD_PID=$!
python "$REPO/asgard/app.py" &
ASGARD_PID=$!
python "$REPO/vanaheim/app.py" &
VANAHEIM_PID=$!
python "$REPO/svartalfheim/app.py" &
SVARTALFHEIM_PID=$!
python "$REPO/bifrost/app.py" &
BIFROST_PID=$!
python "$REPO/niflheim/app.py" &
NIFLHEIM_PID=$!

# Vite dev server
(cd "$REPO/frontend" && npm run dev) &
VITE_PID=$!

echo ""
echo "  Yggdrasil is starting..."
echo ""
echo "  Frontend  → http://localhost:5173  (direct)"
echo "  via Caddy → http://localhost/midgard"
echo ""
echo "  APIs:"
echo "    Midgard  (5000) → /api/realms"
echo "    Asgard   (5001) → /api/asgard/*"
echo "    Vanaheim (5003) → /api/vanaheim/*"
echo ""
echo "  Press Ctrl+C to stop everything"
echo ""

sudo "$(command -v caddy)" run --config "$REPO/Caddyfile"
