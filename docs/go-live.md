# Go live: what I need from you, and in what order

Everything here is blocked on an account or a credential only you can create. The site
builds and passes every check today without any of it.

## Order matters

Steps 1–4 have to happen in sequence. Steps 5–7 can happen any time after the site is
live. Step 8 is the one with a deadline attached.

---

## 1. Neon database

**What I need:** the connection string.

The `neonctl` CLI is already installed (v5.0.1). Run `neonctl auth` — it opens a browser
and signs you in. Then either hand me the connection string or run:

```
neonctl projects create --name michigan-outdoors-report
neonctl connection-string --project-id <id>
```

The database needs the PostGIS extension, which Neon supports — the migrations enable it.

**Where it goes:** GitHub repository secret named `DATABASE_URL`, on
`Vasilion/michigan-outdoors-report`. Nowhere else. Amplify never touches the database; it
only reads the committed JSON snapshots.

**Why first:** the importer workflow skips cleanly while this is unset, so nothing runs on
schedule until it exists.

---

## 2. Domain

**What I need:** `michiganoutdoorsreport.com` registered, and either the registrar login or
nameserver control.

If you register it in the same AWS account as Amplify, Route 53 auto-creates the apex A
alias, the `www` CNAME and the ACM validation record — no manual DNS. That is the path I
would take.

**Tell me before you buy it** so I can confirm the exact spelling matches what is already
baked into `SITE.url`, canonical tags, sitemaps and structured data. Changing it after
launch means rewriting every canonical URL.

---

## 3. Amplify app

**What I need:** nothing, if you give me access. Otherwise, create the app connected to
the repo's `main` branch.

Two settings that are easy to get wrong and hard to notice:

- The app platform **and** the branch framework must both be set to static. Amplify pins
  new Next.js apps to SSR at creation, and changing only one of the two leaves the build
  silently wrong.
- `customHeaders` in `amplify.yml` is ignored. Headers have to be applied with
  `aws amplify update-app --custom-headers`.

**Environment variables to set in the Amplify console:**

| Variable                    | Value                                      | Needed at launch? |
| --------------------------- | ------------------------------------------ | ----------------- |
| `SITE_URL`                  | `https://michiganoutdoorsreport.com`       | Yes               |
| `NEXT_PUBLIC_GA_ID`         | from step 5                                | No                |
| `NEXT_PUBLIC_AMAZON_TAG`    | from step 8                                | No                |
| `NEXT_PUBLIC_CONTACT_EMAIL` | from step 6                                | No                |
| `INDEXNOW_KEY`              | any random 32-char hex string you generate | No                |

Amplify's `update-app` **replaces** the whole environment map rather than merging, so any
change has to be a read-modify-write of the full set.

---

## 4. Google Search Console

**What I need:** you to verify the domain and submit the sitemap.

Verification is easiest via the Route 53 DNS TXT record. Once verified, submit
`https://michiganoutdoorsreport.com/sitemap.xml`. There are six sitemaps behind that index
covering 2,428 indexable URLs.

Do this the day the domain resolves. Indexing 2,400 pages takes weeks and the clock does
not start until Google knows the site exists.

---

## 5. Google Analytics

**What I need:** a GA4 property and its measurement ID (`G-XXXXXXXXXX`).

The code is already in place and completely dormant — `src/components/analytics.tsx` only
renders the script once `NEXT_PUBLIC_GA_ID` matches `/^G-[A-Z0-9]{6,}$/`. Until then the
site ships zero analytics JavaScript.

Note that the privacy policy will need a paragraph about GA4 once it is live, the same way
the Leaving The Matrix policy did. Tell me when you set it and I will write it.

---

## 6. Email address (optional)

**What I need:** a working mailbox at the domain, if you want one.

Right now `SITE.contactEmail` is `null`, and the contact and advertise pages route people
to the public GitHub issue tracker instead of advertising a dead address. That is a
defensible launch state.

If you want a real address, the free ImprovMX inbound plus Resend outbound stack you use
for Leaving The Matrix works here too. Set `NEXT_PUBLIC_CONTACT_EMAIL` and the pages switch
over automatically.

---

## 7. Content you may want to review before launch

- `content/seasons/*.yaml` — 23 hand-curated season entries. I sourced each from the DNR
  digest and stamped `last_verified`. Worth your eyes since these are the highest-stakes
  hand-entered facts on the site.
- `/about/`, `/methodology/`, `/privacy/`, `/terms/` — I wrote these. They are accurate but
  they are your business's voice, not mine.
- The footer now reads **© 2026 UnyX Web Solutions** and links to
  `unyxwebsolutions.com`.

---

## 8. Amazon Associates — the one with a deadline

**What I need:** your Associates store ID (looks like `yourname-20`).

**Do not apply until the site is live and getting traffic.** Amazon closes accounts that
do not make three qualifying sales within 180 days of approval. Applying early burns the
clock while the site has no visitors.

Sequence:

1. Launch the site. Wait for Search Console to show real impressions — a few weeks.
2. Apply at `affiliate-program.amazon.com`, giving `https://michiganoutdoorsreport.com`.
3. Send me the store ID. I set `NEXT_PUBLIC_AMAZON_TAG` and paste the ASINs.
4. Gear pages go from `noindex` to indexed automatically once a category has three
   products with working links.

Full walkthrough, including the FTC and Amazon compliance rules, is in
[`docs/affiliates.md`](./affiliates.md). Read that before you apply.

AvantLink and Impact (the specialty outdoor brands, 5–12% versus Amazon's 1–4.5%) want to
see existing traffic before approving. Those are a three-months-after-launch conversation.

---

## What is not blocked on you

For reference, so you know what is already done:

- 2,428 indexable pages built, all passing the SEO and link checkers
- Every importer written and verified against live DNR sources
- 2.18M acres of Commercial Forest, the Hunting Access Program, GEMS and management units
- 60,059 Master Angler records, 57 state records, 47 species record pages
- Affiliate system, product data file, link checker and written guide
- IndexNow wired into the importer workflow
- GA hook in place and dormant
- The automation audit is in [`docs/automation.md`](./automation.md)

## Still to build (not blocking launch)

- **Site search** — a build-time index over all 2,400 pages
- **Regulations** — the consolidated, sourced, dated hunting and fishing rules
- **Reviews on public land areas** — deferred until there is traffic worth engaging
