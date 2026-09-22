import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { LastUpdated, QuickFacts, Section } from "@/components/layout";
import type { QuickFact } from "@/components/layout";
import { formatCount } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { itemListSchema } from "@/lib/schema/builders";
import { SITE } from "@/lib/site";
import {
  getAccessSites,
  getCounties,
  getLakes,
  getMeta,
  getPublicLands,
  getSpecies,
} from "@/lib/data/snapshot";
import type { County, Species } from "@/lib/data/schemas";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting & Fishing Data by County",
  description:
    "Deer harvest totals, fish stocking records, public land acreage and boating access for all 83 Michigan counties, straight from Michigan DNR public data.",
  path: "/",
  indexable: true,
});

export default function HomePage(): ReactElement {
  const counties: readonly County[] = getCounties();
  const species: readonly Species[] = getSpecies();
  const updatedAt: string = getMeta().generatedAt.slice(0, 10);

  const facts: readonly QuickFact[] = [
    { label: "Counties", value: formatCount(counties.length) },
    { label: "Lakes", value: formatCount(getLakes().length) },
    { label: "Public land units", value: formatCount(getPublicLands().length) },
    { label: "Access sites", value: formatCount(getAccessSites().length) },
  ];

  return (
    <>
      <h1 className="mt-8 text-4xl">Michigan hunting and fishing, county by county</h1>
      <p className="mt-4 max-w-[68ch] text-lg text-bark-600">{SITE.description}</p>

      <div className="mt-8">
        <QuickFacts facts={facts} />
      </div>

      <Section
        id="counties"
        title="Counties"
        description="Every Michigan county gets a hub page with harvest totals, lakes, public land and access sites."
      >
        {counties.length === 0 ? (
          <p className="text-bark-600">
            County pages publish with the first harvest import. Until then, see{" "}
            <Link href="/methodology/" prefetch={false}>
              how this site is built
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {counties.map((county: County): ReactElement => (
              <li key={county.slug}>
                <Link href={`/county/${county.slug}/`} prefetch={false}>
                  {county.name} County
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="hunting"
        title="Hunting"
        description="Reported harvest by county and season, with public land and season dates."
      >
        {species.filter((entry: Species): boolean => entry.kind === "game").length ===
        0 ? (
          <p className="text-bark-600">
            Species hubs publish in the deer-season release.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {species
              .filter((entry: Species): boolean => entry.kind === "game")
              .map((entry: Species): ReactElement => (
                <li key={entry.slug}>
                  <Link href={`/hunting/${entry.slug}/`} prefetch={false}>
                    {entry.name}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Section>

      <Section
        id="fishing"
        title="Fishing"
        description="Stocking history, access sites and DNR lake maps for Michigan inland waters."
      >
        {species.filter((entry: Species): boolean => entry.kind === "fish").length ===
        0 ? (
          <p className="text-bark-600">
            Lake and stocking pages publish before first ice.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {species
              .filter((entry: Species): boolean => entry.kind === "fish")
              .map((entry: Species): ReactElement => (
                <li key={entry.slug}>
                  <Link href={`/fishing/${entry.slug}/`} prefetch={false}>
                    {entry.name}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Section>

      <Section
        id="directory"
        title="Directory"
        description="Deer processors, taxidermists, guides, charters and bait shops by county."
      >
        <p className="text-bark-600">
          Listings open with the county hubs. To be listed, see{" "}
          <Link href="/advertise/" prefetch={false}>
            advertise
          </Link>
          .
        </p>
      </Section>

      <div className="mt-12">
        <LastUpdated isoDate={updatedAt} />
      </div>

      <JsonLd
        schemas={[
          itemListSchema(
            "Michigan county hunting and fishing guides",
            counties.map((county: County) => ({
              name: `${county.name} County`,
              path: `/county/${county.slug}/`,
            })),
          ),
        ]}
      />
    </>
  );
}
