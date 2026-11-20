#!/usr/bin/env bash
# One-time setup for Vidya on macOS (also works on Linux).
#   ./scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

say() { printf "\n\033[1;35m▶ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✖ %s\033[0m\n" "$1"; exit 1; }

# npm install, then (on npm versions that require it) approve and run the install
# scripts these packages need: Prisma downloads its engine, esbuild sets up its binary.
install_packages() {
  local dir="$1"; shift
  (cd "$dir" && npm install)
  if (cd "$dir" && npm install-scripts --help >/dev/null 2>&1); then
    echo "Approving install scripts for: $*"
    (cd "$dir" && npm install-scripts approve "$@" && npm rebuild "$@") \
      || echo "⚠ Could not approve install scripts automatically. In $dir run: npm install-scripts approve $* && npm rebuild $*"
  fi
}

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
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Note: your shell has DATABASE_URL set; ignoring it so backend/.env is used."
  unset DATABASE_URL
fi
# An .env left over from an earlier attempt (e.g. pointing at a Prisma dev server) is backed up and replaced.
if [ -f backend/.env ] && ! grep -q '^DATABASE_URL=.*vidya_db' backend/.env; then
  BACKUP="backend/.env.backup-$(date +%Y%m%d%H%M%S)"
  mv backend/.env "$BACKUP"
  echo "Existing backend/.env does not point at vidya_db, so it was moved to $BACKUP"
fi
if [ ! -f backend/.env ]; then
  DB_USER="${PGUSER:-$USER}"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  cat > backend/.env <<EOF
DATABASE_URL=postgresql://${DB_USER}@localhost:5432/vidya_db
TEST_DATABASE_URL=postgresql://${DB_USER}@localhost:5432/vidya_test
JWT_SECRET=${SECRET}
PORT=5000
UPLOAD_DIR=uploads
EOF
  echo "Created backend/.env (database user: ${DB_USER}). Edit it if your PostgreSQL needs a password."
else
  echo "backend/.env already points at vidya_db ✔"
fi

say "Creating databases vidya_db and vidya_test (if needed)"
for DB in vidya_db vidya_test; do
  if psql -d postgres -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$DB"; then
    echo "$DB already exists ✔"
  else
    createdb "$DB" 2>/dev/null && echo "$DB created ✔" || echo "Could not create $DB automatically (Prisma will try next)."
  fi
done

say "Installing backend packages"
install_packages backend @prisma/client prisma @prisma/engines esbuild

say "Creating database tables"
(cd backend && npx prisma migrate dev --name init)

say "Adding exams and demo accounts"
(cd backend && npx prisma db seed)

say "Installing frontend packages"
install_packages frontend esbuild

printf "\n\033[1;32m✔ Setup complete!\033[0m\n\nStart Vidya with:\n    npm run dev\n\nThen open http://localhost:3000\n\n"
