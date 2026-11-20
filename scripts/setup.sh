#!/usr/bin/env bash
# One-time setup for Vidya on macOS (also works on Linux).
#   ./scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

say() { printf "\n\033[1;35m▶ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

say "Checking Node.js"
command -v node >/dev/null || fail "Node.js is not installed. Install it with: brew install node"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 18 or newer is required (found $(node -v))."
echo "Node $(node -v) ✔"

say "Checking PostgreSQL"
if ! command -v psql >/dev/null; then
  fail "PostgreSQL is not installed. Install and start it with:
    brew install postgresql@16
    brew services start postgresql@16
  (or install Postgres.app from https://postgresapp.com)"
fi
if ! pg_isready -q 2>/dev/null; then
  echo "PostgreSQL does not seem to be running. Trying to start it with Homebrew…"
  (brew services start postgresql@16 || brew services start postgresql) >/dev/null 2>&1 || true
  sleep 3
  pg_isready -q || fail "PostgreSQL is not running. Start it (e.g. 'brew services start postgresql@16') and re-run this script."
fi
echo "PostgreSQL is running ✔"

say "Configuring backend/.env"
if [ ! -f backend/.env ]; then
  DB_USER="${PGUSER:-$USER}"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > backend/.env <<EOF
DATABASE_URL=postgresql://${DB_USER}@localhost:5432/vidya_db
JWT_SECRET=${SECRET}
PORT=5000
UPLOAD_DIR=uploads
EOF
  echo "Created backend/.env (database user: ${DB_USER}). Edit it if your PostgreSQL needs a password."
else
  echo "backend/.env already exists — leaving it as is."
fi

say "Creating database vidya_db (if needed)"
if psql -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw vidya_db; then
  echo "Database already exists ✔"
else
  createdb vidya_db 2>/dev/null && echo "Database created ✔" || echo "Could not create it automatically — Prisma will try next."
fi

say "Installing backend packages"
(cd backend && npm install)

say "Creating database tables"
(cd backend && npx prisma migrate dev --name init)

say "Adding exams and demo accounts"
(cd backend && npx prisma db seed)

say "Installing frontend packages"
(cd frontend && npm install)

printf "\n\033[1;32m✔ Setup complete!\033[0m\n\nStart Vidya with:\n    npm run dev\n\nThen open http://localhost:3000\n\n"
