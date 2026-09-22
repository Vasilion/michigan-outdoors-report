# Importers

One directory per source. Each one exposes `fetch`, `parse`, `normalize`, `upsert` modules and
a `run.ts` entry point, so parsing can be unit tested against fixtures with no network.

```
importers/
  lib/http.ts     rate-limited fetch (1 req/s), descriptive User-Agent with contact address,
                  exponential backoff, raw response cache in /raw-cache (gitignored)
  lib/guard.ts    refuses to overwrite good data with an empty or badly shrunken fetch
  <source>/
    fetch.ts      network only
    parse.ts      raw text -> loosely typed records (pure, fixture tested)
    normalize.ts  loose records -> schema-shaped rows (pure, fixture tested)
    upsert.ts     idempotent writes, records source_url / fetched_at / source_record_id
    run.ts        wires the four together and records a row in source_runs
    fixtures/     saved responses used by the tests
```

Before adding a source: read its robots.txt and terms, keep to one request per second, and
never rehost a DNR PDF. Link to it.

`IMPORTER_USE_CACHE=1` makes `fetchText` read from `/raw-cache` instead of the network, which
is how you iterate on a parser without hammering a DNR server.
