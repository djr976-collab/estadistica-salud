#!/usr/bin/env bash
# Prueba el esquema y la seguridad por filas contra un PostgreSQL local (sin Supabase).
# Uso: PGHOST=/ruta/socket PGPORT=5432 PGUSER=postgres ./supabase/tests/run-local.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=nc_rls_test
psql -X -q -c "drop database if exists $DB" -c "create database $DB"
psql -X -q -v ON_ERROR_STOP=1 -d $DB -f 00_stub_supabase.sql -f ../schema.sql -f 01_grants.sql
psql -X -q -t -A -d $DB -f rls_test.sql | grep -v '^$' | tee /dev/stderr | grep -q "FALLA" && { echo "❌ Hay comprobaciones fallidas"; exit 1; }
echo "✅ Todas las comprobaciones de seguridad pasaron"
