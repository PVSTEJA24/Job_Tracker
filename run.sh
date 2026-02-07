#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
if [ -f "$ROOT/.env" ]; then set -a; . "$ROOT/.env"; set +a; fi
if [ -f "$ROOT/server/.env" ]; then set -a; . "$ROOT/server/.env"; set +a; fi
BACKEND_PORT="${PORT_BACKEND:-3001}"
FRONTEND_PORT="${PORT_FRONTEND:-5173}"
JWT_SECRET="${JWT_SECRET:-dev-local-secret}"
DATABASE_URL="${DATABASE_URL:-}"
DATABASE_SSL="${DATABASE_SSL:-true}"
( [ -z "$DATABASE_URL" ] && echo "Warning: DATABASE_URL not set — login is disabled; using file storage." ) || true
(cd server && PORT="$BACKEND_PORT" JWT_SECRET="$JWT_SECRET" DATABASE_URL="$DATABASE_URL" DATABASE_SSL="$DATABASE_SSL" npm start) & BACK_PID=$!
(cd client && npm run dev -- --port "$FRONTEND_PORT") & FRONT_PID=$!
echo "Backend: http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
trap 'kill $BACK_PID $FRONT_PID 2>/dev/null || true; wait $BACK_PID $FRONT_PID 2>/dev/null || true' INT TERM
wait $BACK_PID $FRONT_PID
