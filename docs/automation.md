# What runs itself, and what does not

The goal for this site is that nobody has to touch it for the data to stay current. This
page is the honest accounting of where that is true and where it is not.

## The loop

```
GitHub Actions cron
  → importers hit DNR ArcGIS / eLicense
  → Postgres (Neon)
  → pnpm db:snapshot writes data/*.json
  → data integrity gate
  → IndexNow ping for changed URLs
  → commit data/ to main
  → Amplify sees the push and rebuilds
  → static HTML + sitemaps + OG images regenerate
```

Nothing in that chain needs a human. If an importer fails, the snapshot is not committed,
the site keeps serving the last good data, and a GitHub issue is opened (or commented on,
if one is already open for that importer).

## Schedule

| When                    | Importers                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily, 11:00 UTC        | `harvest`, `stocking`, `master-angler`                                                                                                                            |
| Monthly, 1st, 12:00 UTC | everything: `counties`, `public-lands`, `lakes`, `access-sites`, `curated`, `harvest`, `stocking`, `rivers`, `land-programs`, `management-units`, `master-angler` |
| Manually                | `workflow_dispatch` with a space-separated importer list                                                                                                          |

Daily covers what actually changes daily. Boundaries, lake inventories and management
units move once a year at most, so they run monthly.

## Safety rails that run without being asked

- **Row-count guard** (`importers/lib/guard.ts`) — an importer that suddenly returns far
  fewer rows than last time fails instead of wiping the table.
- **Stale sweep** — each importer deletes rows whose `fetched_at` predates the run, so
  records dropped upstream disappear here too.
- **Data integrity gate** (`scripts/data-integrity.ts`) — Zod-validates every snapshot file
  and checks cross-references (every water reference resolves to a real county and lake).
  Runs before the commit step.
- **Quality gates** — a page is only generated and only enters the sitemap when it has
  enough real data. Thin pages never ship.
- **Link checker** — crawls every built page for broken internal links. This has already
  caught two real bugs (record pages linking to gated lake pages, and species links for
  species below the record gate).
- **SEO checker** — unique titles and descriptions across all 2,400+ pages, title budget,
  sitemap consistency.
- **Affiliate checker** — validates `content/gear.yaml` and HTTP-checks every resolvable
  product link, so a discontinued product fails the build.
- **IndexNow** — submits only URLs whose `lastmod` changed, so a data update reaches Bing
  and Yandex in minutes rather than waiting for a crawl.

## What still needs a human

This is the short list. It is short on purpose.

1. **Season dates** (`content/seasons/*.yaml`) — once a year, roughly March/April when the
   DNR publishes the new digests. `michigan.gov` returns 403 to bots and the digests are
   PDFs we are not permitted to rehost, so these are hand-curated. Every entry carries its
   own `source_url` and `last_verified`.
2. **Regulations**, once built — same constraint, same cadence, plus a CI staleness gate
   that fails the build when a rule has gone unverified too long.
3. **Gear picks** (`content/gear.yaml`) — adding or retiring a product. The links
   themselves are generated; only the editorial judgement is manual.
4. **Affiliate and analytics credentials** — set once in Amplify, then never again.

Everything else runs on its own.

## Failure modes and what happens

| What breaks                                  | What the site does                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| An ArcGIS layer 404s                         | Importer fails, snapshot not committed, issue opened, site serves last good data |
| A layer returns far fewer rows               | Row-count guard fails the run before any write                                   |
| An importer writes bad data                  | Integrity gate fails before commit                                               |
| A product link dies                          | `check:affiliates` fails the build                                               |
| A page links somewhere that no longer exists | `check:links` fails the build                                                    |
| `DATABASE_URL` unset                         | Workflow skips cleanly rather than failing loudly                                |
| `INDEXNOW_KEY` unset                         | Logs what it would have submitted and continues                                  |
