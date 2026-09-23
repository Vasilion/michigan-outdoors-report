# Affiliates: how this site makes money

Written for someone who has never run an affiliate site. Read it once top to bottom, then
use the "Adding a product" section as the day-to-day reference.

## The model in one paragraph

Someone searches "michigan deer harvest kent county" or "silver lake stocking", lands on a
data page, and sees a small link to a gear guide. On the gear guide there is a list of
items with an explanation of why each one suits Michigan conditions. Each item links to a
retailer with a tracking code attached. If that person buys anything from the retailer
within the cookie window, this site earns a percentage. The reader pays the same price
either way.

Affiliate revenue on a reference site is a function of traffic, not of how hard the page
sells. A page that reads like a sales pitch converts worse and ranks worse. The gear
guides are written as an extension of the data, because that is what the audience arrived
for.

## What earns and what does not

Amazon Associates pays 1–4.5 percent on most outdoor categories, with a 24-hour cookie
that extends to 89 days if the item is added to cart. The rate is low but the conversion
rate is high because almost everyone already has an account. This is the right first
network.

AvantLink and Impact host most of the outdoor specialty brands (Sitka, Vortex, Orvis,
Cabela's/Bass Pro, Sportsman's Guide). Commissions run 5–12 percent with 30–45 day
cookies, which is far better money, but each brand is a separate application and most want
to see existing traffic before approving. Apply to these after the site has three months
of traffic to show.

Do not chase ad networks yet. Display ads on a site this size earn less than the trust
they cost, and `MONETIZATION.adsEnabled` is deliberately `false`.

## Getting the accounts

### Amazon Associates (do this first)

1. Go to https://affiliate-program.amazon.com and sign up with your normal Amazon account.
2. It asks for a website. Give `https://michiganoutdoorsreport.com`. It must be live and
   have real content before you apply — apply after launch, not before.
3. It asks how you drive traffic and what your site is about. Answer plainly: a Michigan
   hunting and fishing reference site built from DNR public data, with gear guides.
4. On approval you get a **store ID / tracking tag**, which looks like `yourname-20`.
   That string is the only thing this codebase needs.
5. **The 180-day rule:** you must make three qualifying sales within 180 days of approval
   or the account is closed. You can re-apply. Do not apply until the site has traffic.

### AvantLink and Impact (later)

Both are merchant marketplaces: you join the network, then apply to individual brands.
AvantLink is the stronger one for hunting and fishing. Each approved brand gives you a
link format; the site stores your network-level ID and appends it, so you only need to
paste the plain product URL.

## Wiring a network into the site

Everything is env-driven. Nothing in the code has a tracking code in it.

| Variable                   | Where it comes from        |
| -------------------------- | -------------------------- |
| `NEXT_PUBLIC_AMAZON_TAG`   | Amazon Associates store ID |
| `NEXT_PUBLIC_AVANTLINK_ID` | AvantLink affiliate ID     |
| `NEXT_PUBLIC_IMPACT_ID`    | Impact partner ID          |

Set them in the Amplify console under App settings → Environment variables, and locally in
`.env` if you want to see links resolve in dev. They are `NEXT_PUBLIC_` because the tag has
to reach the rendered HTML; a tracking tag is public by design and is not a secret.

When none of them is set, the whole gear section switches off: `/gear/` returns a 404, the
Gear nav item disappears, no gear callouts render on species pages, and nothing enters the
sitemap. That is intentional — better no section than a section full of dead links.

## Adding a product

Products live in `content/gear.yaml`. One entry looks like this:

```yaml
- slug: ice-cleats
  name: Ice Cleats
  brand: Yaktrax
  category: ice-fishing
  network: amazon
  asin: B0018CQ5WI
  url: null
  priceBand: under-50
  why: >-
    Early and late ice in Michigan is frequently bare and polished by wind, especially on
    the bigger inland lakes. Cleats are the cheapest safety gear on this list.
  michiganNote: null
```

To find an ASIN: open the product on Amazon and read it out of the URL — it is the
ten-character code after `/dp/`. Paste that into `asin` and leave `url` as `null`. For a
non-Amazon network, do the opposite: leave `asin` as `null` and paste the plain product
page URL into `url`. The build appends your tracking code; you never paste a pre-built
affiliate link into this file.

`priceBand` is one of `under-50`, `50-100`, `100-250`, `250-plus`. Bands rather than prices
on purpose — prices go stale and a wrong price is worse than no price.

`why` is the part that earns. It should say something true about Michigan that a national
gear roundup would not say. `michiganNote` is for a regulation that touches the item;
leave it `null` rather than inventing one.

Run `pnpm check:affiliates` after editing. It validates the file and HTTP-checks every
resolvable link, and it runs as part of `pnpm verify` and in CI, so a product that gets
discontinued fails the build rather than sitting there as a dead link.

## Publishing rules the code enforces

- A gear category needs **three linked products** before its page is published. Below that
  it is not generated, not in the sitemap, and not linked from anywhere.
- Every affiliate link carries `rel="sponsored nofollow noopener"` and opens in a new tab.
  `sponsored` is what Google asks for on paid links; omitting it risks a manual action.
- Every gear page carries the FTC disclosure above the list, not buried in the footer. The
  wording lives in `MONETIZATION.affiliateDisclosure` in `src/components/commerce.tsx`.
- Gear callouts on species pages link to the gear guide, not to a retailer. Affiliate links
  stay concentrated on pages that carry a disclosure.

## The FTC part, briefly

US law requires a clear disclosure near the links, in plain language, before the reader
clicks. "As an Amazon Associate I earn from qualifying purchases" is also required by
Amazon's own operating agreement — the site's disclosure covers the substance; add that
exact sentence to `MONETIZATION.affiliateDisclosure` once the Amazon account is live,
because Amazon audits for it.

Two things Amazon will close an account over: quoting a price in your own copy (prices
change and theirs must be the only source), and using their product images without pulling
them through the Product Advertising API. This site does neither — no prices, no images.

## Later: automatic product data

Amazon's Product Advertising API (PA-API 5.0) can supply live titles, images and
availability, but access requires three qualifying sales first. Once that clears, the
upgrade path is to have the importer fill name, brand and availability from the API at
build time, leaving `why` and `michiganNote` as the only hand-written fields. Nothing in
the current data model has to change to do that.

## Realistic expectations

At 10,000 monthly sessions, roughly 1–3 percent click a gear link and roughly 3–5 percent
of those buy something. On Amazon's outdoor rates that lands somewhere in the low tens of
dollars a month. The number scales with traffic, and traffic on a reference site of this
shape compounds over 6–18 months as pages age into ranking. The gear guides are worth
building now because they cost nothing to run; they are not worth optimizing until the
traffic exists.
