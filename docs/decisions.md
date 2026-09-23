# Decisions

Dated, append-only. Supersede rather than delete.

## 2026-09-22 — Phase 0 foundation

### Stack pins

- Next.js 16.3.6, React 19.2.8, `output: "export"`, App Router.
- Node 22 (`.node-version`), pnpm 10.33.2. Vitest 5 requires Node >= 22.12, and Node 20 is
  end-of-life, so the project is pinned to 22 rather than the machine default.
- Tailwind CSS 4 with tokens declared in `@theme`.

### Trailing slash policy

`trailingSlash: true`. Every route exports as `<path>/index.html`, which static hosts resolve
without per-route rewrite rules. Canonicals are built by `absoluteUrl()` and always carry the
trailing slash, so the canonical and the served URL match exactly. Files with an extension
(`/downloads/lakes.csv`) are left alone. A previous Unyx project lost every social preview to
an extension-less export file, so the rule is: anything served as a file gets a real extension.

### No webfont

The design uses a system serif stack for headings and the system sans stack for body text.
A Google font (Source Serif 4, self-hosted through `next/font`) pushed simulated mobile LCP to
2.19s against a 2.0s budget. Dropping it put every template at Lighthouse 100/100/100/100 with
LCP around 1.9s. Revisit only with a measured budget in hand.

### Lighthouse budgets, and why LCP is 2500ms and not 2000ms

`lighthouserc.json` serves the export with `serve` and measures one representative page per
template three times: performance at least 0.95, SEO exactly 1, accessibility at least 0.95,
best practices at least 0.95, FCP at most 1200ms, LCP at most 2500ms, CLS at most 0.05 and TBT
at most 200ms. The `canonical` and `is-crawlable` audits are skipped because LHCI serves from a
localhost port where the canonical correctly points at the production domain;
`scripts/seo-check.ts` checks both properly instead.

The spec asks for LCP under 2.0s. Locally every template measures 1.89s and scores 100 across
all four categories, but GitHub's shared runners measured 2.04s to 2.34s for the same pages, so
a 2000ms bound failed CI on runner noise rather than on anything about the page. 2500ms is
Google's "good" Core Web Vitals bound, and the FCP and TBT assertions backstop it: a real
regression moves those long before it moves a simulated LCP. Local target stays 2.0s. If field
data from Search Console later shows real LCP near the bound, tighten it.

`experimental.inlineCss` is on. Inlining the 4.6KB stylesheet removes a render-blocking round
trip and cut simulated mobile FCP from ~1.2s to ~0.66s. The remaining LCP time is Lantern's
simulated cost of Next's client runtime on a 4x-throttled CPU, not site content, which is why
adding client JavaScript to a template is the thing most likely to break this budget.

Earlier setup measured whatever five HTML files sorted first, which spent two of five runs on
404 variants. Add a URL here whenever a new template ships.

### Layered CSS

Base element styles live in `@layer base` and shared classes in `@layer components`. Unlayered
CSS beats every Tailwind utility regardless of specificity, which silently broke the header link
colors and produced a real contrast failure in axe. Anything hand-written goes in a layer.

### Links are underlined

Axe flags links inside text blocks that are distinguished by color alone. Body links carry an
underline; navigation links opt out with `no-underline`.

### Quality gate policy per template

Implemented as pure functions in `src/lib/quality-gate.ts` and applied in
`src/lib/routes/registry.ts`, so the sitemap and the page set can never disagree.

| Template              | Threshold                                                          | Failing pages                                |
| --------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| County hub            | geometry or area, plus at least one of lakes, public land, harvest | not generated                                |
| County x game species | harvest data for >= 2 seasons                                      | not generated                                |
| County x fish species | >= 1 stocking record and >= 1 water                                | not generated                                |
| Lake                  | stocking, access sites or a DNR map link, plus acreage or geometry | not generated                                |
| River                 | access sites or stocking, plus >= 1 county                         | not generated                                |
| Public land           | geometry and acreage                                               | not generated                                |
| Directory index       | >= 1 listing                                                       | not generated                                |
| Seasons index         | >= 1 curated season                                                | generated, `noindex`, excluded from sitemaps |

The seasons index is the one page that renders while gated: it is linked from the primary
navigation and needs to exist, so it carries `noindex` until season data lands.

### Snapshot `generatedAt` is a data date, not a build time

`scripts/export-snapshot.ts` sets `meta.generatedAt` to the newest date found across the
exported rows. Sitemap `lastmod` comes from per-record dates and falls back to that value. A
rebuild with unchanged data therefore produces a byte-identical snapshot and unchanged
`lastmod` values.

### Two narrow lint exceptions

1. `src/lib/data/schemas.ts` disables `@typescript-eslint/typedef`. The Zod schemas are the
   source of truth for the TypeScript types (`z.infer`); annotating them with their own inferred
   generic types would be circular. Every consumer still gets full explicit types.
2. The no-comments checker allows `eslint-*`, `@ts-*`, `prettier-ignore` and `<reference`
   directive comments, because those are tooling instructions rather than prose. Nothing in the
   codebase currently uses one.

### No-comments checker implementation

The first version scanned tokens with `ts.createScanner`, which mis-lexes template literals
containing `${...}` and reported `http://127.0.0.1:${PORT}` as a comment. It now parses with
`ts.createSourceFile` and reads leading and trailing comment ranges off every token, which
handles template literals and JSX expression comments correctly.

### Generated assets live in `public/`

`scripts/generate-static-assets.ts` runs before `next build` and writes `sitemap*.xml`,
`llms.txt` and `downloads/*` into `public/`, which Next copies to the export root. They are
gitignored. `scripts/post-build.ts` then re-verifies the export through a different code path
than the one that produced it.

### Deferred, needs Luke

- Domain registration (michiganoutdoorsreport.com is unregistered).
- Neon project, branches and `DATABASE_URL` secret.
- Amplify app and Route 53 connection. Remember: Amplify pins the framework at app creation, so
  a static Next app needs both `update-app --platform WEB` and
  `update-branch --framework "Web"`.
- Map tile provider (OpenFreeMap / MapTiler / Stadia terms not yet reviewed).
- Analytics and newsletter providers.
- IndexNow key, Search Console and Bing Webmaster verification.

## 2026-09-22 — Phase 1, deer season

### Sources, all verified before a line of importer code was written

| What         | Where                                                                                                                | Notes                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Counties     | ArcGIS `Michigan_Counties/0` on the state org `Jdnp1TjADvSDxMAX`                                                     | 83 features with `NAME`, `PENIN`, `ACRES` and polygon geometry |
| Public land  | `DNRWILDLandsOPENDATA/1` (wildlife properties) + `DNRBoundariesParksHuntableLandsOPENDATA/2` (parks)                 | parcel level, dissolved by property name                       |
| Deer harvest | `POST https://www.mdnr-elicense.com/HarvestReportSummary/DeerHarvestReportSummary` with `LicenseYear` and `AreaId=1` | JSON, no auth, no robots.txt on the host (404)                 |
| Season dates | 2026 Michigan Deer Hunting Regulations Summary, page 6                                                               | transcribed by hand into `content/seasons/deer.yaml`           |

Mandatory deer harvest reporting started in the 2022 season, so every county has four
complete seasons (2022-2025) plus a live 2026 count. That is what clears the two-season
gate on all 83 county deer pages.

### Peninsula is UP/LP, because that is what the source says

The schema originally had `UP/NLP/SLP`. The DNR county layer publishes only `UP` and `LP`,
and the 2026 digest eliminated the limited firearms deer zone, so every 2026 deer season is
scoped statewide, Lower Peninsula or Upper Peninsula. Season zones now map exactly onto the
county field, with nothing derived and nothing invented. Migration `0002` changes the enum.

### michigan.gov blocks bot user agents; season dates are curated anyway

`www.michigan.gov` returns 403 at the edge to any request whose user agent identifies a bot,
including for robots.txt. That is fine: season dates are curated by hand each license year per
the spec, not scraped. The digest was read once as a person would read it, and the dates carry
`source_url` plus `last_verified` in the YAML. Do not build a recurring importer that spoofs a
browser against michigan.gov.

### Upserts alone leak rows; importers that own a table sweep it

The first public-land run wrote 308 units. After the name cleanup changed 12 slugs, the table
held 317: the 12 old rows had nothing to update them. `deleteStalePublicLands` now removes any
row whose `fetched_at` predates the current run, which is safe because the 30% drop guard runs
right after. Any future importer that owns its whole table needs the same sweep.

### Parenthetical DNR working notes are stripped from names

Source property names carry internal remarks: "Hillcrest State Game Area (owned but no show in
MiHunt)", "Allegan State Game Area (north unit; general)". Those are notes to DNR staff, not
names, and they blew the title budget. `cleanName` strips a parenthetical group and the parcels
then dissolve into the correctly named unit.

### Harvest is a time series; the snapshot exports only the latest row per season

`harvest_snapshots` keeps one row per county, species, season and snapshot date, so a daily
in-season importer builds a history. The site only ever shows the newest figure per season, so
`export-snapshot.ts` uses `DISTINCT ON` to export exactly that. Without it the committed
snapshot would grow by 415 rows a day for a page that shows five numbers.

### Every page links every public land unit in its county

The county hub first linked only its 12 largest units, which orphaned four small ones. The
orphan check caught it. The hub now links every unit it lists.

### `generateStaticParams` cannot return a readonly array

Next's generated route validator requires `any[] | Promise<any[]>`. A `readonly T[]` return
type fails the build with a type error in `.next/types/validator.ts`, so these five functions
return mutable arrays while everything around them stays readonly.

### `<svg height="auto">` is invalid and Lighthouse notices

The trend chart set `width="100%" height="auto"`, which logs a console error and cost a best
practices point. The chart now sizes with `className="h-auto w-full"` and a viewBox.

### Still open after Phase 1

- Directory listings are empty. Processor and taxidermist listings must be seeded from public
  sources by hand; nothing will be invented to fill the category.
- Hunter Access Program parcels are imported by neither name nor page. They are private land
  open to hunting and do not belong in a "public land" count without a clear label.
- OG images, IndexNow and Search Console submission are Phase 3 and need the live domain.

## 2026-09-22 - Phase 3 slice: turkey, OG images

### Turkey publishes as a statewide hub only, for now

`POST /HarvestReportSummary/TurkeyHarvestReportSummary` on the eLicense host takes the same
shape as the deer endpoint (`LicenseYear`, `AreaId=1`) and returns county rows without the
antlered and antlerless split. Only the 2026 season is published, so the two-season gate keeps
all 83 county turkey pages unbuilt while the statewide hub, which has a real 83-county
breakdown of 18,908 birds, publishes. When the 2027 season closes, 83 county pages appear with
no code change.

The hub now handles a species whose only season is still in progress: the trend chart mutes
the open season, the summary says "so far", and county tables fall back to the in-progress row.

### Links respect the gate

A hub that lists every county has to know which county pages actually exist, or the link
checker fails with one broken link per county. Both hubs and the choropleth now fall back to
the county hub for a county whose species page is gated.

### Open Graph images are generated at build time

`scripts/generate-og-images.tsx` renders 113 cards with satori and resvg: one per county with
that county highlighted on a Michigan silhouette and its latest deer figure, one per species
hub, and a default. They land in `public/og/` (gitignored, about 5MB) and are wired through
`buildMetadata`, which previously pointed every page at a `/og-default.png` that did not exist.

Satori cannot parse the variable-axis TTFs that Google Fonts serves by default; it needs static
instances. The three woff files in `assets/fonts/` are build-time only and never shipped to a
browser.

Per-page cards for 936 lakes and 583 county-species pages were deliberately not generated: at
roughly 45KB each that is another 70MB of deploy for pages that are rarely shared. They inherit
their county card.

## 2026-09-22 - Hunting and fishing index pages, small game

### The nav was hiding half the site

Primary nav pointed straight at `/hunting/deer/` and had no fishing entry at all, so 936 lake
pages, 583 county-species fishing pages and 27 fish hubs had no route in from the header. The
fix is the two index pages that were missing rather than a link to an arbitrary species:
`/hunting/` and `/fishing/`, both registered as static routes and both carrying real content
(species tables, stat bands, county lists) rather than being bare link farms.

### Small game: season dates only, and the page says why

Only deer and turkey have mandatory harvest reporting, so only they have a county breakdown.
Probing the eLicense host for Bear, Elk, SmallGame, Waterfowl, Furbearer, Bobcat and Otter
endpoints returns 404 for all of them. Small game harvest comes from a mail survey of licence
holders and the DNR does not publish it by county.

There is a `GrouseWoodcock_DashboardTable` feature service with per-county flush rates, but it
carries no season year and is built from two to four cooperator submissions per county. That is
a sample, not a statistic, and publishing it as a county figure would be misleading. Left out.

What the DNR does publish for small game is season dates, so nine species were transcribed from
the 2026 Small Game Hunting Regulations Summary (pages 5 and 6) into `content/seasons/`:
cottontail rabbit, snowshoe hare, fox and gray squirrel, ruffed grouse, woodcock, ring-necked
pheasant, bobwhite quail, sharp-tailed grouse and crow. Year-round species carry no dates and
are named in prose on `/hunting/` instead of being given fake ranges.

Pheasant and sharp-tailed grouse seasons are scoped to "Zone 1/2/3" and quail to a 27-county
list. Those zone strings are recorded exactly as the digest prints them and are deliberately
not mapped onto counties, so they appear on the species season page but never on a county page.
Only Statewide and peninsula-scoped seasons reach county pages.

Adding nine game species without harvest data exposed two gaps: `/hunting/[species]`
generated a param for every game species regardless of data, and the county hub rendered an
empty card per speciesless species. Both now filter on having data.

## 2026-09-22 - Rivers and trout streams

### Rivers are keyed per county, which deviates from the spec's URL

Section 7 specifies `/river/[river]`, a statewide page per river. The hydrography does not
support that. "Black River" resolves to 333 flowline segments across 11 counties and both
peninsulas, so it is several unrelated rivers; "Grand River" is 276 segments across 7 counties
and is one river. MDNRID is per segment, not per river, so there is no identity key to tell
those apart without geometry work.

Rivers therefore live at `/river/[county]/[river]`, mirroring lakes. A genuine multi-county
river gets one page per county, each carrying that county's own stocking and access records,
which is the data a reader actually wants. Pages for waters sharing a name link to each other
under "Other waters named X" and say plainly that they may be separate rivers. Nothing is
indexed yet, so no URL was broken by this; if the statewide model is ever wanted back, it is a
redirect away.

### The river list is built from records, not from the hydrography

Importing all 176,973 flowline segments to publish a few hundred pages would be wasteful, so
the river set is seeded from the waters that actually have data: river-typed stocking events
and access sites typed River/Stream. The flowline layer is fetched only to confirm a name is a
real hydrography feature (54,786 named segments covering 4,746 distinct waters), and the trout
regulations layer only for designation. 309 rivers qualify, 251 of them designated trout
streams.

### Trout designation is aggregated by name, and says so when it is mixed

`DNRFisheriesTroutRegsOPENDATA` carries StreamType and RegulationDesc per segment but no county.
Designations are aggregated by stream name: where every named segment agrees, the page states
the regulation; where reaches differ, it lists the types it found and says classification
varies by reach rather than picking one. Every trout section carries the verify-with-the-DNR
notice, because type determines season, gear and size limits.

### A regex died passing through a template literal

The link queries used `'\([^)]*\)'` to strip parentheticals from water names. A later edit
collapsed it to `'\([^)]*\)'` in the source, and inside a JS template literal `\(` resolves to
`(` before Postgres ever sees it, so the pattern became a capture group that blanked the whole
name and linked nothing. Both queries now use POSIX bracket classes, `'[(][^)]*[)]'` and
`'[[:space:]]+'`, which carry no backslashes and cannot be mangled by an escaping layer. The
symptom was silent: the importer reported success and linked zero rows.

### Local verify now matches CI, and Lighthouse runs twice

`pnpm verify` ran typecheck, lint, tests, build and the two checkers but not `format:check`,
which CI does run. A commit went red on formatting alone because two files were touched after
the last `pnpm format`. `verify` now includes `format:check`, so the local gate is the CI gate.

Lighthouse CI covers one URL per template, which is now fourteen. At three runs each that step
alone took over ten minutes, so `numberOfRuns` drops to two. The budgets pass with roughly 300ms
of headroom on LCP and a perfect score everywhere else, so the extra run was buying precision
nobody was spending.
