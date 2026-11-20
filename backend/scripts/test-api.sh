#!/usr/bin/env bash
# Runs the API integration tests against the TEST database (vidya_test), which is wiped first.
set -euo pipefail
cd "$(dirname "$0")/.."

# Read TEST_DATABASE_URL from .env if it isn't already set
if [ -z "${TEST_DATABASE_URL:-}" ] && [ -f .env ]; then
  TEST_DATABASE_URL=$(grep -E '^TEST_DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)
fi
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://${USER}@localhost:5432/vidya_test}"

case "$TEST_DATABASE_URL" in
  *test*) ;;
  *) echo "Refusing to run: TEST_DATABASE_URL must point at a database whose name contains 'test'."; exit 1 ;;
esac

createdb vidya_test >/dev/null 2>&1 || true
echo "▶ Resetting test database"
DATABASE_URL="$TEST_DATABASE_URL" npx prisma db push --force-reset --skip-generate --accept-data-loss >/dev/null
echo "▶ Running API tests"
DATABASE_URL="$TEST_DATABASE_URL" UPLOAD_DIR=uploads-test npx tsx --test tests/api/*.test.ts
