#!/usr/bin/env bash
# Ejecuta migraciones + seed + pruebas en una base PostgreSQL local descartable.
# Uso: PGHOST=... PGUSER=... ./supabase/tests/run.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB="${TEST_DB:-heridasegura_test}"
dropdb --if-exists "$DB"; createdb "$DB"
psql_q() { psql -v ON_ERROR_STOP=1 -q -X -t -d "$DB" "$@"; }
psql_q -f "$DIR/00_supabase_stub.sql"
for f in "$DIR"/../migrations/*.sql; do echo "→ $(basename "$f")"; psql_q -f "$f"; done
psql_q -c "grant select, insert, update, delete on all tables in schema public, storage to authenticated; grant usage on all sequences in schema public to authenticated;"
echo "→ seed.sql (x2, verifica idempotencia)"; psql_q -f "$DIR/../seed.sql"; psql_q -f "$DIR/../seed.sql"
echo "→ pruebas"; psql_q -f "$DIR/10_tests.sql"
echo "OK: todas las pruebas SQL pasaron"
