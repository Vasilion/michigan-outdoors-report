import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ChartColumn, Fish, Map as MapIcon, Waves } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
} from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRowData } from "@/components/data";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import { getAccessSites, getCounties, getMeta, getSpecies } from "@/lib/data/snapshot";
import type { County, Lake, River, Species, StockingEvent } from "@/lib/data/schemas";
import { stockingBySpecies, totalFish } from "@/lib/views/water";
import { riversWithPages } from "@/lib/views/river";
import { lakesWithPages } from "@/lib/views/water";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Fishing: Stocking, Lakes & Access",
  description:
    "Fish stocking records by species and county, lake pages with access sites, and every Michigan water the DNR has stocked since 2016.",
  path: "/fishing/",
  indexable: true,
  ogImagePath: "/og/default.png",
});

type SpeciesRow = {
  readonly species: Species;
  readonly fish: number;
  readonly events: number;
  readonly counties: number;
};

const SPECIES_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "fish", label: "Fish stocked", numeric: true },
  { key: "events", label: "Stockings", numeric: true },
  { key: "counties", label: "Counties", numeric: true },
];

const LAKE_COLUMNS: readonly TableColumn[] = [
  { key: "lake", label: "Lake" },
  { key: "county", label: "County" },
  { key: "acres", label: "Acres", numeric: true },
];

export default function FishingIndexPage(): ReactElement {
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  const stocked: Map<string, StockingEvent[]> = stockingBySpecies();
  const pagedLakes: readonly Lake[] = lakesWithPages();

  const rows: SpeciesRow[] = [];
  for (const species of getSpecies()) {
    if (species.kind !== "fish") {
      continue;
    }
    const events: StockingEvent[] = stocked.get(species.slug) ?? [];
    if (events.length === 0) {
      continue;
    }
    rows.push({
      species,
      fish: totalFish(events),
      events: events.length,
      counties: new Set(
        events
          .map((event: StockingEvent): string | null => event.countySlug)
          .filter((slug: string | null): slug is string => slug !== null),
      ).size,
    });
  }
  rows.sort((a: SpeciesRow, b: SpeciesRow): number => b.fish - a.fish);

  const countyNames: Map<string, string> = new Map<string, string>();
  for (const county of getCounties()) {
    countyNames.set(county.slug, county.name);
  }

  const totalStocked: number = rows.reduce(
    (total: number, row: SpeciesRow): number => total + row.fish,
    0,
  );

  const pagedRivers: readonly River[] = riversWithPages();
  const troutStreams: readonly River[] = pagedRivers.filter(
    (river: River): boolean => river.designatedTroutStream,
  );

  const biggest: readonly Lake[] = [...pagedLakes]
    .sort((a: Lake, b: Lake): number => (b.acres ?? 0) - (a.acres ?? 0))
    .slice(0, 12);

  const speciesRows: readonly TableRowData[] = rows.map(
    (row: SpeciesRow): TableRowData => ({
      species: (
        <Link href={`/fishing/${row.species.slug}/`} prefetch={false}>
          {row.species.name}
        </Link>
      ),
      fish: formatCount(row.fish),
      events: formatCount(row.events),
      counties: formatCount(row.counties),
    }),
  );

  const lakeRows: readonly TableRowData[] = biggest.map((lake: Lake): TableRowData => ({
    lake: (
      <Link href={`/lake/${lake.countySlug}/${lake.slug}/`} prefetch={false}>
        {lake.name}
      </Link>
    ),
    county: countyNames.get(lake.countySlug) ?? lake.countySlug,
    acres: lake.acres === null ? "—" : formatCount(Math.round(lake.acres)),
  }));

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Fishing", path: "/fishing/" },
  ];

  const facts: StatProps[] = [
    {
      label: "Fish stocked since 2016",
      value: formatCount(totalStocked),
      icon: Fish,
      tone: "accent",
    },
    { label: "Species stocked", value: formatCount(rows.length), icon: ChartColumn },
    { label: "Lakes with a page", value: formatCount(pagedLakes.length), icon: Waves },
    {
      label: "Designated trout streams",
      value: formatCount(troutStreams.length),
      icon: Waves,
    },
  ];

  const summary: string = `The Michigan DNR has recorded ${formatCount(totalStocked)} fish stocked across ${formatCount(rows.length)} species since 2016, and publishes ${formatCount(getAccessSites().length)} public boating and fishing access sites. This site turns those records into ${formatCount(pagedLakes.length)} lake pages and a page for every county and species combination with a stocking record. Data read ${formatLongDate(dataDate)}.`;

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">Stocking, lakes and access</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Michigan fishing</h1>
      <div className="mt-6">
        <AnswerSummary text={summary} />
      </div>

      <div className="mt-8">
        <StatGrid>
          {facts.map((fact: StatProps): ReactElement => (
            <Stat key={fact.label} {...fact} />
          ))}
        </StatGrid>
      </div>

      <Section
        eyebrow="What the DNR releases"
        title="Every stocked species"
        icon={Fish}
        description="Totals since 2016. Each species links to its statewide page, with a county map and the waters that received the most fish."
      >
        <DataTable
          caption="Michigan fish stocking totals by species since 2016, from the DNR fish stocking database."
          columns={SPECIES_COLUMNS}
          rows={speciesRows}
        />
      </Section>

      <Section
        title="Largest lakes with a page"
        icon={Waves}
        description="A lake gets a page when the DNR publishes stocking records or a public access site for it."
      >
        <DataTable
          caption="The largest Michigan inland lakes with stocking or access records on this site."
          columns={LAKE_COLUMNS}
          rows={lakeRows}
        />
      </Section>

      <Section
        eyebrow={`${formatCount(troutStreams.length)} designated trout streams`}
        title="Rivers and streams"
        icon={Waves}
        description="Rivers are listed per county, because Michigan reuses stream names and the records that matter are county-specific. Trout designations come from the DNR trout regulations layer."
      >
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {[...troutStreams]
            .sort((a: River, b: River): number => a.name.localeCompare(b.name))
            .slice(0, 40)
            .map((river: River): ReactElement => (
              <li key={`${river.countySlug}-${river.slug}`}>
                <Link href={`/river/${river.countySlug}/${river.slug}/`} prefetch={false}>
                  {river.name}
                </Link>
              </li>
            ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-sm">
          {formatCount(pagedRivers.length)} rivers and streams have a page. The rest are
          on their county pages.
        </p>
      </Section>

      <Section
        title="Start from a county"
        icon={MapIcon}
        description="Every county page lists its lakes, stocked species and access sites."
      >
        <Card>
          <CardContent>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
              {getCounties().map((county: County): ReactElement => (
                <li key={county.slug}>
                  <Link href={`/county/${county.slug}/`} prefetch={false}>
                    {county.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={dataDate} />
        <SourceNote
          label="Michigan DNR fish stocking database and boating access data"
          href="https://midnr.maps.arcgis.com/apps/dashboards/77581b13c6984b919ab8ed927496a31f"
          retrieved={dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          itemListSchema(
            "Michigan fish species stocking pages",
            rows.map((row: SpeciesRow) => ({
              name: row.species.name,
              path: `/fishing/${row.species.slug}/`,
            })),
          ),
        ]}
      />
    </div>
  );
}
