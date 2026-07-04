#!/usr/bin/env bash
set -euo pipefail

PSQL="${PSQL:-/opt/homebrew/opt/postgresql@16/bin/psql}"
PG_ISREADY="${PG_ISREADY:-/opt/homebrew/opt/postgresql@16/bin/pg_isready}"
DB_NAME="${DB_NAME:-exness_india}"
DB_USER="${DB_USER:-exness}"
DB_PASSWORD="${DB_PASSWORD:-exness_local}"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh"
  exit 1
fi

if ! brew list postgresql@16 >/dev/null 2>&1; then
  echo "Installing PostgreSQL 16..."
  brew install postgresql@16
fi

echo "Starting PostgreSQL..."
brew services start postgresql@16 >/dev/null 2>&1 || true

for _ in $(seq 1 30); do
  if "$PG_ISREADY" -h localhost -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

"$PG_ISREADY" -h localhost -p 5432

echo "Creating database and user..."
"$PSQL" -h localhost -d postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

"$PSQL" -h localhost -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo ""
echo "PostgreSQL is ready."
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
