# Local database

Phase 1 importers run against a local Postgres with PostGIS. Neon comes later, when the
scheduled GitHub Actions need a database they can reach; the committed `data/*.json` snapshot is
identical either way, so nothing about the site depends on which one produced it.

## What is installed on Luke's machine (2026-09-22)

- Postgres 18.6 from scoop: `~/scoop/apps/postgresql/current`, data directory
  `~/scoop/persist/postgresql/data`, superuser `postgres`, no password on localhost.
- PostGIS 3.6.2 from the OSGeo Windows bundle for pg18, extracted over the scoop install
  (`bin` with `cp -n` so existing DLLs are never replaced, then `lib`, `share`, `gdal-data`).
  Stop the server before extracting or the in-use DLLs fail to copy.
- Database `michigan_outdoors` with the `postgis` extension enabled.

## Daily use

```bash
export PATH="$HOME/scoop/apps/postgresql/current/bin:$PATH"

pg_ctl -D "$HOME/scoop/persist/postgresql/data" -l "$HOME/scoop/persist/postgresql/pg.log" start
pg_ctl -D "$HOME/scoop/persist/postgresql/data" stop -m fast

psql -U postgres -d michigan_outdoors
```

`.env` (gitignored) holds:

```
DATABASE_URL=postgresql://postgres@localhost:5432/michigan_outdoors
```

Then:

```bash
pnpm db:migrate     # apply db/migrations/*.sql, tracked in schema_migrations
pnpm db:snapshot    # export every table to data/*.json
```

Both were run end to end on 2026-09-22 against this database: all 17 tables created, all 11
export queries valid.

## Moving to Neon later

Point `DATABASE_URL` at the Neon branch and run the same two commands. `CREATE EXTENSION
postgis` is available on Neon. The GitHub Actions importer workflow already reads
`secrets.DATABASE_URL`; nothing in the code changes.
