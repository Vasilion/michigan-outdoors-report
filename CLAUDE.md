@AGENTS.md

# Michigan Outdoors Report — working rules

Full spec: `docs/decisions.md` and `README.md`. Build spec lives with Luke (`SPEC.md`).

## Non-negotiable code standards (CI blocks on all of these)

- **No comments in code.** `scripts/check-no-comments.ts` fails the build on any non-directive
  comment. Put explanation in `docs/` or `README.md`, never in a source file.
- **Explicit types everywhere.** Annotate every variable, parameter and return type. The only
  typedef exemption is `src/lib/data/schemas.ts` (Zod is the type source).
- **No `async`/`await`.** Use synchronous code, or `.then()` chains where Promises are
  unavoidable. This includes Playwright tests and importers.
- TypeScript strict, `noUncheckedIndexedAccess`. Prettier formatting. `pnpm verify` before any push.

## Architecture rules

- Only importers and `pnpm db:snapshot` talk to Neon. The Next build reads `data/*.json`
  synchronously with `readFileSync`. Never add a runtime data fetch.
- Route generation and sitemaps both come from `src/lib/routes/registry.ts`. If you add a
  template, add it there, give it a quality gate in `src/lib/quality-gate.ts`, and put it in a
  `SITEMAP_GROUPS` bucket. The tests enforce exactly one group per template.
- Never invent or estimate data. If a value is missing, omit the section.
- Never present a regulation summary as authoritative, and never imply DNR affiliation.

## Before you spend Luke's money or touch production

Ask first: domain registration or DNS, Neon plan changes, Stripe live mode, deleting production
data, and anything that changes an already-indexed URL (use `redirects` instead).
