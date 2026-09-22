import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Anchor, ChartColumn, Fish, HelpCircle, Waves } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
} from "@/components/layout";
import { DataTable, FaqBlock, TrendChart } from "@/components/data";
import type { FaqItem, TableColumn, TableRowData, TrendPoint } from "@/components/data";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { CountyLocator } from "@/components/map/county-map";
import { breadcrumbSchema, datasetSchema, faqSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate, joinList } from "@/lib/format";
import { findCounty, getLakes, getMeta, getSpecies } from "@/lib/data/snapshot";
import type { County, Lake, Species, StockingEvent } from "@/lib/data/schemas";
import {
  stockingByCountySpecies,
  stockingKey,
  totalFish,
  totalsByYear,
} from "@/lib/views/water";
import type { SpeciesYearTotal } from "@/lib/views/water";
import { accessSitesByLake, waterKey } from "@/lib/data/aggregate";

export type FishingParams = {
  readonly county: string;
  readonly speciesSlug: string;
};

export type FishingPageProps = {
  readonly params: FishingParams;
};

type WaterRow = {
  readonly waterName: string;
  readonly lake: Lake | null;
  readonly count: number;
  readonly events: number;
  readonly lastStockedOn: string;
};

type FishingView = {
  readonly county: County;
  readonly species: Species;
  readonly events: readonly StockingEvent[];
  readonly waters: readonly WaterRow[];
  readonly byYear: readonly SpeciesYearTotal[];
  readonly dataDate: string;
  readonly path: string;
};

export function fishingParams(): readonly FishingParams[] {
  const grouped: Map<string, StockingEvent[]> = stockingByCountySpecies();
  const params: FishingParams[] = [];
  for (const [key, events] of grouped) {
    if (events.length === 0) {
      continue;
    }
    const parts: string[] = key.split("::");
    params.push({
      county: parts[0] as string,
      speciesSlug: parts[1] as string,
    });
  }
  return params.sort((a: FishingParams, b: FishingParams): number =>
    a.county === b.county
      ? a.speciesSlug.localeCompare(b.speciesSlug)
      : a.county.localeCompare(b.county),
  );
}

export function buildFishingView(params: FishingParams): FishingView | null {
  const county: County | null = findCounty(params.county);
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean =>
      entry.slug === params.speciesSlug && entry.kind === "fish",
  );
  if (county === null || species === undefined) {
    return null;
  }
  const events: readonly StockingEvent[] =
    stockingByCountySpecies().get(stockingKey(params.county, params.speciesSlug)) ?? [];
  if (events.length === 0) {
    return null;
  }
  const lakeByKey: Map<string, Lake> = new Map<string, Lake>();
  for (const lake of getLakes()) {
    lakeByKey.set(waterKey(lake.countySlug, lake.slug), lake);
  }
  const waters: Map<string, WaterRow> = new Map<string, WaterRow>();
  for (const event of events) {
    const existing: WaterRow | undefined = waters.get(event.waterName);
    const lake: Lake | null =
      event.lakeSlug === null || event.lakeCountySlug === null
        ? null
        : (lakeByKey.get(waterKey(event.lakeCountySlug, event.lakeSlug)) ?? null);
    waters.set(event.waterName, {
      waterName: event.waterName,
      lake: existing?.lake ?? lake,
      count: (existing?.count ?? 0) + event.count,
      events: (existing?.events ?? 0) + 1,
      lastStockedOn:
        existing === undefined || event.stockedOn > existing.lastStockedOn
          ? event.stockedOn
          : existing.lastStockedOn,
    });
  }
  return {
    county,
    species,
    events,
    waters: [...waters.values()].sort(
      (a: WaterRow, b: WaterRow): number => b.count - a.count,
    ),
    byYear: totalsByYear(events),
    dataDate: getMeta().generatedAt.slice(0, 10),
    path: `/county/${params.county}/${params.speciesSlug}-fishing/`,
  };
}

function summaryText(view: FishingView): string {
  const total: number = totalFish(view.events);
  const latest: StockingEvent = [...view.events].sort(
    (a: StockingEvent, b: StockingEvent): number =>
      b.stockedOn.localeCompare(a.stockedOn),
  )[0] as StockingEvent;
  return `The Michigan DNR has stocked ${formatCount(total)} ${view.species.name.toLowerCase()} across ${formatCount(view.waters.length)} ${view.waters.length === 1 ? "water" : "waters"} in ${view.county.name} County since 2016, most recently in ${latest.waterName} on ${formatLongDate(latest.stockedOn)}. Records come from the Michigan DNR fish stocking database.`;
}

export function fishingMetadata(params: FishingParams): Metadata {
  const view: FishingView | null = buildFishingView(params);
  if (view === null) {
    return buildMetadata({
      title: "Page not found",
      description: "This page does not exist.",
      path: `/county/${params.county}/${params.speciesSlug}-fishing/`,
      indexable: false,
    });
  }
  return buildMetadata({
    title: `${view.county.name} County ${view.species.name} Stocking`,
    description: `${formatCount(totalFish(view.events))} ${view.species.name.toLowerCase()} stocked in ${view.waters.length} ${view.county.name} County waters since 2016, with dates, counts and access.`,
    path: view.path,
    indexable: true,
    ogImagePath: `/og/county-${view.county.slug}.png`,
    dateModified: view.dataDate,
  });
}

const WATER_COLUMNS: readonly TableColumn[] = [
  { key: "water", label: "Water" },
  { key: "events", label: "Stockings", numeric: true },
  { key: "count", label: "Fish", numeric: true },
  { key: "last", label: "Most recent" },
];

export function CountyFishing({ params }: FishingPageProps): ReactElement | null {
  const view: FishingView | null = buildFishingView(params);
  if (view === null) {
    return null;
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${view.county.name} County`, path: `/county/${view.county.slug}/` },
    { name: `${view.species.name} fishing`, path: view.path },
  ];

  const points: readonly TrendPoint[] = view.byYear.map(
    (entry: SpeciesYearTotal): TrendPoint => ({
      label: String(entry.year),
      value: entry.count,
    }),
  );

  const sitesByLake: Map<string, unknown[]> = accessSitesByLake();

  const rows: readonly TableRowData[] = view.waters.map(
    (water: WaterRow): TableRowData => ({
      water:
        water.lake === null ? (
          water.waterName
        ) : (
          <Link
            href={`/lake/${water.lake.countySlug}/${water.lake.slug}/`}
            prefetch={false}
          >
            {water.waterName}
          </Link>
        ),
      events: formatCount(water.events),
      count: formatCount(water.count),
      last: formatLongDate(water.lastStockedOn),
    }),
  );

  const withAccess: readonly WaterRow[] = view.waters.filter(
    (water: WaterRow): boolean =>
      water.lake !== null &&
      (sitesByLake.get(waterKey(water.lake.countySlug, water.lake.slug)) ?? []).length >
        0,
  );

  const facts: StatProps[] = [
    {
      label: "Fish stocked since 2016",
      value: formatCount(totalFish(view.events)),
      icon: Fish,
      tone: "accent",
    },
    { label: "Waters stocked", value: formatCount(view.waters.length), icon: Waves },
    {
      label: "Stocking events",
      value: formatCount(view.events.length),
      icon: ChartColumn,
    },
    {
      label: "With public access",
      value: formatCount(withAccess.length),
      icon: Anchor,
    },
  ];

  const top: WaterRow = view.waters[0] as WaterRow;
  const faqs: FaqItem[] = [
    {
      question: `Which ${view.county.name} County waters are stocked with ${view.species.name.toLowerCase()}?`,
      answer: `${joinList(view.waters.slice(0, 5).map((water: WaterRow): string => water.waterName))}${view.waters.length > 5 ? ` and ${view.waters.length - 5} more` : ""}. ${top.waterName} received the most, at ${formatCount(top.count)} fish since 2016.`,
    },
    {
      question: `When were ${view.species.name.toLowerCase()} last stocked in ${view.county.name} County?`,
      answer: `The most recent recorded stocking was ${formatLongDate(
        [...view.events].sort((a: StockingEvent, b: StockingEvent): number =>
          b.stockedOn.localeCompare(a.stockedOn),
        )[0]?.stockedOn ?? view.dataDate,
      )}. The DNR adds records after the fish are released, so there can be a lag.`,
    },
  ];

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="eyebrow">{view.county.name} County fishing</p>
          <h1 className="mt-2 text-4xl md:text-5xl">
            {view.county.name} County {view.species.name.toLowerCase()} stocking
          </h1>
          <div className="mt-6">
            <AnswerSummary text={summaryText(view)} />
          </div>
        </div>
        <Card className="hidden self-start md:block">
          <CardContent className="p-3">
            <CountyLocator countySlug={view.county.slug} countyName={view.county.name} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <StatGrid>
          {facts.map((fact: StatProps): ReactElement => (
            <Stat key={fact.label} {...fact} />
          ))}
        </StatGrid>
      </div>

      <Section
        eyebrow="What the DNR released"
        title="Stocked by year"
        icon={ChartColumn}
        description="Fish released in this county, by calendar year."
      >
        <TrendChart
          title={`${view.species.name} stocked in ${view.county.name} County by year`}
          unitLabel="fish released"
          points={points}
        />
      </Section>

      <Section
        title="Waters stocked"
        icon={Waves}
        description="Every water in the county with a recorded stocking of this species."
      >
        <DataTable
          caption={`${view.species.name} stocking in ${view.county.name} County since 2016, from the Michigan DNR fish stocking database.`}
          columns={WATER_COLUMNS}
          rows={rows}
        />
      </Section>

      <Section
        title="Common questions"
        icon={HelpCircle}
        description="Answers drawn from the data on this page."
      >
        <FaqBlock items={faqs} />
      </Section>

      <Section title="Related" icon={Fish} description="">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href={`/fishing/${view.species.slug}/`} prefetch={false}>
              Statewide {view.species.name.toLowerCase()} stocking
            </Link>
          </li>
          <li>
            <Link href={`/county/${view.county.slug}/`} prefetch={false}>
              {view.county.name} County hunting and fishing
            </Link>
          </li>
        </ul>
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.dataDate} />
        <SourceNote
          label="Michigan DNR fish stocking database"
          href={(view.events[0] as StockingEvent).sourceUrl}
          retrieved={view.dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          datasetSchema({
            name: `${view.county.name} County ${view.species.name.toLowerCase()} stocking records`,
            description: `Michigan DNR ${view.species.name.toLowerCase()} stocking records for ${view.county.name} County by water, count and date since 2016.`,
            path: view.path,
            dateModified: view.dataDate,
            sourceUrl: (view.events[0] as StockingEvent).sourceUrl,
            distributions: [
              { url: "/downloads/stocking-events.csv", format: "text/csv" },
              { url: "/downloads/stocking-events.json", format: "application/json" },
            ],
          }),
          faqSchema(faqs),
        ]}
      />
    </div>
  );
}
