# Migration note: PostgreSQL and SQLite

PostgreSQL migration: run `ALTER TABLE accounts ADD COLUMN archived BOOLEAN DEFAULT FALSE;`.

PostgreSQL rollback: run `ALTER TABLE accounts DROP COLUMN archived;`.

SQLite migration: create a replacement `accounts` table with an `archived` column, copy the rows, then rename it.

SQLite rollback: create a replacement `accounts` table without `archived`, copy the rows, then rename it.
