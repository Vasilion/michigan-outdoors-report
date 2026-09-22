import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ChartColumn, Fish, HelpCircle, Map as MapIcon, Waves } from "lucide-react";
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
import { CountyChoropleth } from "@/components/map/county-map";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  itemListSchema,
} from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import { getCounties, getLakes, getMeta, getSpecies } from "@/lib/data/snapshot";
import type { Lake, Species, StockingEvent } from "@/lib/data/schemas";
import { stockingBySpecies, totalFish, totalsByYear } from "@/lib/views/water";
import { waterKey } from "@/lib/data/aggregate";
import type { SpeciesYearTotal } from "@/lib/views/water";

export type FishParams = {
  readonly species: string;
};

export type FishPageProps = {
  readonly params: Promise<FishParams>;
};

type WaterTotal = {
  readonly waterName: string;
  readonly lakeSlug: string | null;
  readonly lakeCountySlug: string | null;
  readonly countySlug: string | null;
  readonly count: number;
};

type FishView = {
  readonly species: Species;
  readonly events: readonly StockingEvent[];
  readonly byYear: readonly SpeciesYearTotal[];
  readonly countyTotals: ReadonlyMap<string, number>;
  readonly topWaters: readonly WaterTotal[];
  readonly countiesStocked: number;
  readonly dataDate: string;
};

export function generateStaticParams(): FishParams[] {
  const stocked: Map<string, StockingEvent[]> = stockingBySpecies();
  return getSpecies()
    .filter(
      (species: Species): boolean =>
        species.kind === "fish" && (stocked.get(species.slug) ?? []).length > 0,
    )
    .map((species: Species): FishParams => ({ species: species.slug }));
}

function buildFishView(slug: string): FishView | null {
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean => entry.slug === slug && entry.kind === "fish",
  );
  const events: readonly StockingEvent[] = stockingBySpecies().get(slug) ?? [];
  if (species === undefined || events.length === 0) {
    return null;
  }
  const countyTotals: Map<string, number> = new Map<string, number>();
  const waterTotals: Map<string, WaterTotal> = new Map<string, WaterTotal>();
  for (const event of events) {
    if (event.countySlug !== null) {
      countyTotals.set(
        event.countySlug,
        (countyTotals.get(event.countySlug) ?? 0) + event.count,
      );
    }
    const key: string = `${event.waterName}::${event.countySlug ?? ""}`;
    const existing: WaterTotal | undefined = waterTotals.get(key);
    waterTotals.set(key, {
      waterName: event.waterName,
      lakeSlug: existing?.lakeSlug ?? event.lakeSlug,
      lakeCountySlug: existing?.lakeCountySlug ?? event.lakeCountySlug,
      countySlug: existing?.countySlug ?? event.countySlug,
      count: (existing?.count ?? 0) + event.count,
    });
  }
  return {
    species,
    events,
    byYear: totalsByYear(events),
    countyTotals,
    topWaters: [...waterTotals.values()]
      .sort((a: WaterTotal, b: WaterTotal): number => b.count - a.count)
      .slice(0, 15),
    countiesStocked: countyTotals.size,
    dataDate: getMeta().generatedAt.slice(0, 10),
  };
}

function summaryText(view: FishView): string {
  const latest: SpeciesYearTotal | undefined = view.byYear[view.byYear.length - 1];
  const total: number = totalFish(view.events);
  return `The Michigan DNR and its cooperators recorded ${formatCount(view.events.length)} ${view.species.name.toLowerCase()} stocking events across ${formatCount(view.countiesStocked)} counties since 2016, releasing ${formatCount(total)} fish in total${
    latest === undefined
      ? ""
      : `, including ${formatCount(latest.count)} in ${latest.year}`
  }. Figures come from the Michigan DNR fish stocking database, read ${formatLongDate(view.dataDate)}.`;
}

export function generateMetadata({ params }: FishPageProps): Promise<Metadata> {
  return params.then((resolved: FishParams): Metadata => {
    const view: FishView | null = buildFishView(resolved.species);
    if (view === null) {
      return buildMetadata({
        title: "Species not found",
        description: "This species page does not exist.",
        path: `/fishing/${resolved.species}/`,
        indexable: false,
      });
    }
    return buildMetadata({
      title: `Michigan ${view.species.name} Stocking by County`,
      description: `${formatCount(totalFish(view.events))} ${view.species.name.toLowerCase()} stocked across ${view.countiesStocked} Michigan counties since 2016, with the waters that got the most fish.`,
      path: `/fishing/${view.species.slug}/`,
      indexable: true,
      ogImagePath: `/og/species-${view.species.slug}.png`,
      dateModified: view.dataDate,
    });
  });
}

const WATER_COLUMNS: readonly TableColumn[] = [
  { key: "water", label: "Water" },
  { key: "county", label: "County" },
  { key: "count", label: "Fish stocked", numeric: true },
];

export default function FishSpeciesPage({ params }: FishPageProps): ReactElement {
  const resolved: FishParams = use(params);
  const view: FishView | null = buildFishView(resolved.species);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${view.species.name} fishing`, path: `/fishing/${view.species.slug}/` },
  ];

  const names: Map<string, string> = new Map<string, string>();
  for (const county of getCounties()) {
    names.set(county.slug, county.name);
  }

  const points: readonly TrendPoint[] = view.byYear.map(
    (entry: SpeciesYearTotal): TrendPoint => ({
      label: String(entry.year),
      value: entry.count,
    }),
  );

  const lakeByKey: Map<string, Lake> = new Map<string, Lake>();
  for (const lake of getLakes()) {
    lakeByKey.set(waterKey(lake.countySlug, lake.slug), lake);
  }

  const waterRows: readonly TableRowData[] = view.topWaters.map(
    (water: WaterTotal): TableRowData => {
      const lake: Lake | undefined =
        water.lakeSlug === null || water.lakeCountySlug === null
          ? undefined
          : lakeByKey.get(waterKey(water.lakeCountySlug, water.lakeSlug));
      return {
        water:
          lake === undefined ? (
            water.waterName
          ) : (
            <Link href={`/lake/${lake.countySlug}/${lake.slug}/`} prefetch={false}>
              {water.waterName}
            </Link>
          ),
        county:
          water.countySlug === null
            ? "—"
            : (names.get(water.countySlug) ?? water.countySlug),
        count: formatCount(water.count),
      };
    },
  );

  const topCounty: [string, number] | undefined = [...view.countyTotals.entries()].sort(
    (a: [string, number], b: [string, number]): number => b[1] - a[1],
  )[0];

  const facts: StatProps[] = [
    {
      label: "Fish stocked since 2016",
      value: formatCount(totalFish(view.events)),
      icon: Fish,
      tone: "accent",
    },
    {
      label: "Stocking events",
      value: formatCount(view.events.length),
      icon: ChartColumn,
    },
    { label: "Counties", value: formatCount(view.countiesStocked), icon: MapIcon },
    {
      label: "Top county",
      value: topCounty === undefined ? "—" : (names.get(topCounty[0]) ?? topCounty[0]),
      icon: Waves,
    },
  ];

  const faqs: FaqItem[] = [
    {
      question: `Where does Michigan stock ${view.species.name.toLowerCase()}?`,
      answer: `Since 2016 the DNR has recorded ${view.species.name.toLowerCase()} stocking in ${formatCount(view.countiesStocked)} counties. The single largest recipient water was ${(view.topWaters[0] as WaterTotal).waterName}, with ${formatCount((view.topWaters[0] as WaterTotal).count)} fish.`,
    },
    {
      question: `Does stocking mean the fishing is good?`,
      answer: `Not on its own. Stocking records say what was released and when. Survival, growth and catch rates depend on the water, and the DNR does not publish those alongside the stocking record.`,
    },
  ];

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">Statewide · {view.byYear.length} years of records</p>
      <h1 className="mt-2 text-4xl md:text-5xl">
        Michigan {view.species.name.toLowerCase()} stocking
      </h1>
      <div className="mt-6">
        <AnswerSummary text={summaryText(view)} />
      </div>

      <div className="mt-8">
        <StatGrid>
          {facts.map((fact: StatProps): ReactElement => (
            <Stat key={fact.label} {...fact} />
          ))}
        </StatGrid>
      </div>

      <Section
        title="Stocked by year"
        icon={ChartColumn}
        description="Fish released statewide, by calendar year."
      >
        <TrendChart
          title={`Michigan ${view.species.name.toLowerCase()} stocked by year`}
          unitLabel="fish released"
          points={points}
        />
      </Section>

      <Section
        eyebrow="Where the fish went"
        title="Stocking by county"
        icon={MapIcon}
        description="Darker counties received more fish. Click a county for its stocking detail."
      >
        <Card>
          <CardContent>
            <CountyChoropleth
              title={`Michigan ${view.species.name.toLowerCase()} stocking by county since 2016`}
              unitLabel="fish stocked"
              values={view.countyTotals}
              names={names}
              hrefFor={(slug: string): string =>
                `/county/${slug}/${view.species.slug}-fishing/`
              }
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Waters that got the most"
        icon={Waves}
        description="Top waters by total fish released since 2016."
      >
        <DataTable
          caption={`Michigan waters receiving the most ${view.species.name.toLowerCase()} since 2016, from the DNR fish stocking database.`}
          columns={WATER_COLUMNS}
          rows={waterRows}
        />
      </Section>

      <Section
        title="Common questions"
        icon={HelpCircle}
        description="Answers drawn from the data on this page."
      >
        <FaqBlock items={faqs} />
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
            name: `Michigan ${view.species.name.toLowerCase()} stocking records`,
            description: `Michigan DNR ${view.species.name.toLowerCase()} stocking records by water, county, count and date since 2016.`,
            path: `/fishing/${view.species.slug}/`,
            dateModified: view.dataDate,
            sourceUrl: (view.events[0] as StockingEvent).sourceUrl,
            distributions: [
              { url: "/downloads/stocking-events.csv", format: "text/csv" },
              { url: "/downloads/stocking-events.json", format: "application/json" },
            ],
          }),
          itemListSchema(
            `Michigan waters stocked with ${view.species.name.toLowerCase()}`,
            view.topWaters
              .filter((water: WaterTotal): boolean => water.lakeSlug !== null)
              .map((water: WaterTotal) => {
                const lake: Lake | undefined =
                  water.lakeCountySlug === null
                    ? undefined
                    : lakeByKey.get(
                        waterKey(water.lakeCountySlug, water.lakeSlug as string),
                      );
                return {
                  name: water.waterName,
                  path:
                    lake === undefined ? "/" : `/lake/${lake.countySlug}/${lake.slug}/`,
                };
              }),
          ),
          faqSchema(faqs),
        ]}
      />
    </div>
  );
}
