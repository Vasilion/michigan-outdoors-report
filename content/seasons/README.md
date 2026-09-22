# Curated season data

Season dates are not available as a machine-readable DNR feed, so they are curated here as YAML
and loaded into the `seasons` table by an importer. Every entry must carry `source_url` and
`last_verified`; the loader rejects an entry without them, and the site shows the verification
date next to the dates.

One file per species, named for the species slug, for example `white-tailed-deer.yaml`:

```yaml
species: white-tailed-deer
seasons:
  - name: Firearm
    zone: Statewide
    start_date: 2026-11-15
    end_date: 2026-11-30
    notes: null
    source_url: https://www.michigan.gov/dnr/...
    last_verified: 2026-09-22
```

Rules:

- Dates are ISO and specific to a license year. Re-verify every entry each license year.
- Zones use the DNR's own zone names, spelled exactly as the digest spells them.
- Summaries only. Never phrase an entry as authoritative regulation text.
