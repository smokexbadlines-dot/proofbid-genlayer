# Migration note: PostgreSQL

PostgreSQL migration: run `ALTER TABLE accounts ADD COLUMN archived BOOLEAN DEFAULT FALSE;`.

PostgreSQL rollback: run `ALTER TABLE accounts DROP COLUMN archived;`.

This draft does not include a SQLite migration or rollback.
