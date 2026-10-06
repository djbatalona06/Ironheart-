#!/usr/bin/env bash
# Runs supabase/tests/[0-9]*.sql against the local stack (`npx supabase start`). Each file rolls back.
set -uo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")/../supabase/tests"
status=0
for f in [0-9]*.sql; do
  echo "== $f"
  out=$(psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$f" 2>&1) || status=1
  echo "$out" | grep -E "ok -|FAIL|ERROR" | sed 's/^.*NOTICE:  //'
done
[ $status -eq 0 ] && echo "all SQL tests passed" || echo "SQL TESTS FAILED"
exit $status
