# Michigan Outdoors Report

Michigan-only hunting and fishing reference site built from public Michigan DNR data.
Static HTML, no runtime database, SEO and AI-search visibility as the product.

Domain: michiganoutdoorsreport.com (not registered yet)
Owner: Luke Vasilion / Unycross LLC

## Quick start

```bash
pnpm install
pnpm dev          # generates static assets, then next dev
pnpm verify       # typecheck + lint + tests + build + SEO + link checks
```

Node is pinned by `.node-version` (22.x). Vitest 5 requires Node >= 22.12.

## How data reaches a page

```
DNR sources -> importers/ -> Neon Postgres + PostGIS -> pnpm db:snapshot
   -> data/*.json (committed) -> next build (readFileSync) -> out/ -> Amplify
```

Only importers and `pnpm db:snapshot` talk to Neon. The build and the live site never do,
so a Neon outage cannot break a build or change what a page says.

## Commands

| Command                                   | What it does                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                                | Local dev server                                                                 |
| `pnpm build`                              | Generate sitemaps/llms.txt/downloads, build the static export, verify the output |
| `pnpm verify`                             | The full local gate: typecheck, lint, unit tests, build, SEO checks, link checks |
| `pnpm test`                               | Vitest unit tests                                                                |
| `pnpm test:e2e`                           | Playwright against the built `out/`                                              |
| `pnpm check:seo`                          | Titles, descriptions, canonicals, H1s, JSON-LD, sitemap consistency              |
| `pnpm check:links`                        | Broken internal links and orphan pages                                           |
| `pnpm exec tsx scripts/data-integrity.ts` | Snapshot integrity gate (also run by importers)                                  |
| `pnpm db:migrate`                         | Apply `db/migrations/*.sql` to `DATABASE_URL`                                    |
| `pnpm db:snapshot`                        | Export Neon to `data/*.json`                                                     |
| `pnpm exec lhci autorun`                  | Lighthouse budgets against `out/`                                                |

## Code standards

Enforced in CI; see `docs/decisions.md` for the reasoning and the two narrow exceptions.

- TypeScript strict, `noImplicitAny`, `noUncheckedIndexedAccess`.
- No comments in code. `scripts/check-no-comments.ts` fails the build on any comment that is
  not an ESLint or TypeScript directive. Explanation belongs in `docs/` and in this README.
- Explicit types everywhere: `@typescript-eslint/typedef`, `explicit-function-return-type`,
  `no-explicit-any`.
- No `async`/`await`. Promise work uses `.then()` chains. Enforced by `no-restricted-syntax`.

## Layout

```
data/            committed snapshot JSON, the only thing the build reads
db/migrations/   SQL migrations for Neon + PostGIS
docs/            decisions and phase notes
importers/       one directory per source, plus shared http and guard helpers
public/          static assets; sitemaps, llms.txt and downloads are generated into it
reports/         build report written by the asset generator
scripts/         build-time generators and the CI checkers
src/app/         routes (App Router, output: export)
src/components/  layout, data display and monetization components
src/lib/         site config, formatting, slugs, seasons, summaries, gates, schema, routes
tests/unit/      Vitest
tests/e2e/       Playwright against out/
```

## Phase status

**Phase 0 (foundation)** and **Phase 1 (deer season)** are done.

**Phase 2 (lakes and ice) is done.** 2,044 pages, 2,040 indexable:

| Template                            | Pages                             |
| ----------------------------------- | --------------------------------- |
| County hub                          | 83                                |
| County x deer                       | 83                                |
| County x fish species               | 583                               |
| Lake                                | 936 of 5,207 (the rest are gated) |
| Public land unit                    | 305                               |
| Species hub (deer, turkey, 27 fish) | 29                                |
| Season pages                        | 2                                 |
| Editorial                           | 8                                 |

**Phase 3 is partly done:** wild turkey imports and publishes as a statewide hub, and Open
Graph cards are generated per county and per species hub at build time.

Importers: `counties`, `public-lands`, `lakes`, `access-sites` (ArcGIS), `harvest` (deer and
turkey, DNR eLicense), `stocking` (DNR fish stocking database), `curated` (species and season
YAML).

Not yet done: rivers and trout streams, the directory (listings must be seeded by hand from
public sources), the newsletter and featured-listing flows (both need accounts), IndexNow and
Search Console submission (both need the live domain).

Neon, Amplify and the domain are still unprovisioned. Importers run against a local Postgres,
see `docs/local-database.md`.
