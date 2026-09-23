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

**Phases 0 through 3 are done.** 2,439 pages built, 2,428 indexable:

| Template                 | Pages                             |
| ------------------------ | --------------------------------- |
| County hub               | 83                                |
| County x deer and turkey | 83 of 913 (the rest are gated)    |
| County x fish species    | 583                               |
| Lake                     | 947 of 5,207 (the rest are gated) |
| River and trout stream   | 309                               |
| Public land unit         | 324 (includes 19 GEMS sites)      |
| Fishing records          | 48 (index plus 47 species)        |
| Public hunting land      | 1                                 |
| Species hub              | 31 of 77 (the rest are gated)     |
| Season pages             | 11                                |
| Gear guides              | 7 (noindex until links are live)  |
| Editorial                | 8                                 |

**Public land is consolidated across every Michigan access type** — state game areas, state
forest, huntable park land, the Hunting Access Program (15,128 active acres), Commercial
Forest (2,176,974 acres), GEMS, and deer/turkey/bear/elk management units. See
`/public-hunting-land/`.

**Fishing records ship from the DNR Master Angler database** — 60,059 entries from 1919 to
2025, 57 current state records, and the longest entry per species per county. Ranked by
length, because the program is length-qualified and only a quarter of entries carry a weight.

**Affiliate links are generated, never pasted.** Tracking codes live in env only. Gear pages
stay `noindex` until a category has three products with working links. See
`docs/affiliates.md`.

Importers: `counties`, `public-lands`, `lakes`, `access-sites`, `rivers`, `land-programs`,
`management-units` (ArcGIS), `harvest` (deer and turkey, DNR eLicense), `stocking` and
`master-angler` (DNR fisheries), `curated` (species and season YAML).

Not yet done: site search, consolidated hunting and fishing regulations, and reviews on
public land areas (deferred until there is traffic). The directory still needs listings
seeded by hand. Phase 4 PDF extraction for the annual harvest survey is unstarted.

Big-game trophy records are not available: Michigan deer records belong to Commemorative
Bucks of Michigan, a private nonprofit. County harvest totals are the substitute.

Neon, Amplify and the domain are still unprovisioned — see `docs/go-live.md` for exactly
what is needed. Importers run against a local Postgres, see `docs/local-database.md`.
What runs on its own and what does not is documented in `docs/automation.md`.
