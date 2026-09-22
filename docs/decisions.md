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

### Lighthouse budgets

`lighthouserc.json` asserts performance at least 0.95, SEO exactly 1, accessibility at least
0.95, best practices at least 0.95, LCP at most 2000ms and CLS at most 0.05 against `out/`.
The `canonical` and `is-crawlable` audits are skipped there because LHCI serves the export from
a localhost port, where canonical URLs correctly point at the production domain;
`scripts/seo-check.ts` checks both properly instead. Headroom on LCP is thin (~110ms). When
data-heavy templates land, re-measure before adding any client JavaScript.

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
