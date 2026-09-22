import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import {
  CalendarDays,
  ChartColumn,
  HelpCircle,
  Map as MapIcon,
  Target,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { CountyChoropleth } from "@/components/map/county-map";
import { Card, CardContent } from "@/components/ui/card";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
} from "@/components/layout";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { DataTable, FaqBlock, TrendChart } from "@/components/data";
import type { FaqItem, TableColumn, TableRowData, TrendPoint } from "@/components/data";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  itemListSchema,
} from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate, percentChange } from "@/lib/format";
import type { PercentChange } from "@/lib/format";
import { getCounties, getMeta, getSeasons, getSpecies } from "@/lib/data/snapshot";
import type { County, HarvestSnapshot, Season, Species } from "@/lib/data/schemas";
import { harvestSeries } from "@/lib/views/county";
import type { HarvestSeries } from "@/lib/views/county";
import { SITE } from "@/lib/site";

export type SpeciesParams = {
  readonly species: string;
};

export type SpeciesPageProps = {
  readonly params: Promise<SpeciesParams>;
};

type CountyTotal = {
  readonly county: County;
  readonly series: HarvestSeries;
};

type HubView = {
  readonly species: Species;
  readonly seasonYears: readonly number[];
  readonly finalYears: readonly number[];
  readonly statewideByYear: ReadonlyMap<number, number>;
  readonly counties: readonly CountyTotal[];
  readonly latestYear: number;
  readonly latestIsFinal: boolean;
  readonly latestTotal: number;
  readonly priorTotal: number | null;
  readonly seasons: readonly Season[];
  readonly dataDate: string;
};

function latestRow(series: HarvestSeries): HarvestSnapshot | null {
  return series.latestFinal ?? series.inProgress;
}

export function generateStaticParams(): SpeciesParams[] {
  return getSpecies()
    .filter((species: Species): boolean => species.kind === "game")
    .map((species: Species): SpeciesParams => ({ species: species.slug }));
}

function buildHubView(slug: string): HubView | null {
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean => entry.slug === slug && entry.kind === "game",
  );
  if (species === undefined) {
    return null;
  }
  const counties: CountyTotal[] = [];
  const statewide: Map<number, number> = new Map<number, number>();
  for (const county of getCounties()) {
    const series: HarvestSeries = harvestSeries(county.slug, slug);
    if (series.rows.length === 0) {
      continue;
    }
    counties.push({ county, series });
    for (const row of series.rows) {
      statewide.set(row.seasonYear, (statewide.get(row.seasonYear) ?? 0) + row.total);
    }
  }
  if (counties.length === 0) {
    return null;
  }
  const allYears: number[] = [...statewide.keys()].sort(
    (a: number, b: number): number => a - b,
  );
  const finalYears: number[] = [
    ...new Set(
      counties.flatMap((entry: CountyTotal): number[] =>
        entry.series.finalRows.map((row: HarvestSnapshot): number => row.seasonYear),
      ),
    ),
  ].sort((a: number, b: number): number => a - b);
  const latestFinalYear: number | undefined = finalYears[finalYears.length - 1];
  const latestYear: number = latestFinalYear ?? (allYears[allYears.length - 1] as number);
  const priorYear: number | undefined =
    latestFinalYear === undefined ? undefined : finalYears[finalYears.length - 2];
  return {
    species,
    seasonYears: allYears,
    finalYears,
    statewideByYear: statewide,
    counties: [...counties].sort(
      (a: CountyTotal, b: CountyTotal): number =>
        (latestRow(b.series)?.total ?? 0) - (latestRow(a.series)?.total ?? 0),
    ),
    latestYear,
    latestIsFinal: latestFinalYear !== undefined,
    latestTotal: statewide.get(latestYear) ?? 0,
    priorTotal: priorYear === undefined ? null : (statewide.get(priorYear) ?? null),
    seasons: getSeasons().filter(
      (season: Season): boolean => season.speciesSlug === slug,
    ),
    dataDate: getMeta().generatedAt.slice(0, 10),
  };
}

function summaryText(view: HubView): string {
  const change: PercentChange | null =
    view.priorTotal === null ? null : percentChange(view.latestTotal, view.priorTotal);
  const comparison: string =
    change === null
      ? ""
      : ` That is ${change.text} the prior season total of ${formatCount(view.priorTotal as number)}.`;
  const qualifier: string = view.latestIsFinal
    ? `the ${view.latestYear} season`
    : `the ${view.latestYear} season so far`;
  return `Michigan hunters reported ${formatCount(view.latestTotal)} ${view.species.pluralName} across all ${formatCount(view.counties.length)} counties during ${qualifier}.${comparison} Figures come from Michigan DNR mandatory harvest reporting, read ${formatLongDate(view.dataDate)}.`;
}

export function generateMetadata({ params }: SpeciesPageProps): Promise<Metadata> {
  return params.then((resolved: SpeciesParams): Metadata => {
    const view: HubView | null = buildHubView(resolved.species);
    if (view === null) {
      return buildMetadata({
        title: "Species not found",
        description: "This species page does not exist.",
        path: `/hunting/${resolved.species}/`,
        indexable: false,
      });
    }
    return buildMetadata({
      title: `Michigan ${view.species.name} Harvest by County`,
      description: `${formatCount(view.latestTotal)} ${view.species.pluralName} reported statewide in ${view.latestYear}, broken down across all ${view.counties.length} Michigan counties with season dates.`,
      path: `/hunting/${view.species.slug}/`,
      indexable: true,
      ogImagePath: `/og/species-${view.species.slug}.png`,
      dateModified: view.dataDate,
    });
  });
}

const COUNTY_COLUMNS: readonly TableColumn[] = [
  { key: "county", label: "County" },
  { key: "peninsula", label: "Peninsula" },
  { key: "antlered", label: "Antlered", numeric: true },
  { key: "antlerless", label: "Antlerless", numeric: true },
  { key: "total", label: "Total", numeric: true },
];

export default function SpeciesHubPage({ params }: SpeciesPageProps): ReactElement {
  const resolved: SpeciesParams = use(params);
  const view: HubView | null = buildHubView(resolved.species);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${view.species.name} hunting`, path: `/hunting/${view.species.slug}/` },
  ];

  const countyHref = (entry: CountyTotal): string =>
    entry.series.finalRows.length >= 2
      ? `/county/${entry.county.slug}/${view.species.slug}-hunting/`
      : `/county/${entry.county.slug}/`;

  const points: readonly TrendPoint[] = view.seasonYears.map(
    (year: number): TrendPoint => ({
      label: String(year),
      value: view.statewideByYear.get(year) ?? 0,
      muted: !view.finalYears.includes(year),
    }),
  );

  const rows: readonly TableRowData[] = view.counties.map(
    (entry: CountyTotal): TableRowData => {
      const latest: HarvestSnapshot | null = entry.series.latestFinal;
      return {
        county: `${entry.county.name} County`,
        peninsula: entry.county.peninsula === "UP" ? "Upper" : "Lower",
        antlered: latest === null ? "—" : formatCount(latest.antlered ?? 0),
        antlerless: latest === null ? "—" : formatCount(latest.antlerless ?? 0),
        total: latest === null ? "—" : formatCount(latest.total),
      };
    },
  );

  const mapValues: Map<string, number> = new Map<string, number>();
  const mapNames: Map<string, string> = new Map<string, string>();
  for (const entry of view.counties) {
    mapNames.set(entry.county.slug, entry.county.name);
    const latestTotal: number | undefined = latestRow(entry.series)?.total;
    if (latestTotal !== undefined) {
      mapValues.set(entry.county.slug, latestTotal);
    }
  }

  const top: CountyTotal | undefined = view.counties[0];
  const facts: StatProps[] = [
    {
      label: `${view.latestYear} statewide`,
      value: formatCount(view.latestTotal),
      icon: Target,
      tone: "accent",
    },
    { label: "Counties reporting", value: formatCount(view.counties.length) },
    { label: "Seasons on record", value: formatCount(view.seasonYears.length) },
    {
      label: "Top county",
      value: top === undefined ? "—" : top.county.name,
    },
  ];

  const faqs: readonly FaqItem[] = [
    {
      question: `How many ${view.species.pluralName} are harvested in Michigan each year?`,
      answer: `Michigan hunters reported ${formatCount(view.latestTotal)} ${view.species.pluralName} in the ${view.latestYear} season. Reported totals for the ${view.seasonYears.length} seasons on record range from ${formatCount(Math.min(...points.map((p: TrendPoint): number => p.value)))} to ${formatCount(Math.max(...points.map((p: TrendPoint): number => p.value)))}.`,
    },
    {
      question: `Which Michigan county has the highest deer harvest?`,
      answer:
        top === undefined
          ? "No county data is published yet."
          : `${top.county.name} County reported the most ${view.species.pluralName} in ${view.latestYear}, at ${formatCount(latestRow(top.series)?.total ?? 0)}.`,
    },
    {
      question: `Is reporting a harvested deer required in Michigan?`,
      answer: `Yes. Michigan requires successful deer hunters to report a harvest, which is what makes this county-level breakdown possible. These are counts of reported animals, not survey estimates.`,
    },
  ];

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <h1 className="text-4xl">
        Michigan {view.species.name.toLowerCase()} harvest by county
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
        title="Statewide trend"
        icon={ChartColumn}
        description="Reported harvest by season across Michigan."
      >
        <TrendChart
          title={`Reported Michigan ${view.species.pluralName} harvest by season`}
          unitLabel={`${view.species.pluralName} reported`}
          points={points}
        />
      </Section>

      <Section
        eyebrow="Where they were reported"
        title={`${view.latestYear} harvest map`}
        icon={MapIcon}
        description="Darker counties reported more. Click any county for its full history."
      >
        <Card>
          <CardContent>
            <CountyChoropleth
              title={`Reported ${view.species.pluralName} harvest by Michigan county, ${view.latestYear} season`}
              unitLabel={`${view.species.pluralName} reported`}
              values={mapValues}
              names={mapNames}
              hrefFor={(slug: string): string => {
                const entry: CountyTotal | undefined = view.counties.find(
                  (candidate: CountyTotal): boolean => candidate.county.slug === slug,
                );
                return entry === undefined ? `/county/${slug}/` : countyHref(entry);
              }}
            />
          </CardContent>
        </Card>
      </Section>

      <Section
        title={`Every county, ${view.latestYear} season${view.latestIsFinal ? "" : " so far"}`}
        icon={Target}
        description="Sorted by reported total. Each county links to its full harvest history."
      >
        <DataTable
          caption={`Reported ${view.species.pluralName} harvest by Michigan county for the ${view.latestYear} season, from Michigan DNR harvest reporting.`}
          columns={COUNTY_COLUMNS}
          rows={rows}
        />
      </Section>

      <Section
        title="County pages"
        icon={MapIcon}
        description="Harvest history, season dates and public land for each county."
      >
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {view.counties.map((entry: CountyTotal): ReactElement => (
            <li key={entry.county.slug}>
              <Link href={countyHref(entry)} prefetch={false}>
                {entry.county.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {view.seasons.length === 0 ? null : (
        <Section
          title="Season dates"
          icon={CalendarDays}
          description="Every Michigan season for this species."
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {view.seasons.map((season: Season): ReactElement => (
              <li
                key={`${season.name}-${season.zone}`}
                className="bg-card text-card-foreground border-border shadow-card rounded-xl border px-5 py-4"
              >
                <p className="font-display text-lg text-pine-800">{season.name}</p>
                <p className="text-sm text-bark-500">{season.zone}</p>
                <p className="mt-2">
                  {formatLongDate(season.startDate)} – {formatLongDate(season.endDate)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-bark-500">
            Full detail on the{" "}
            <Link href={`/seasons/${view.species.slug}/`} prefetch={false}>
              {view.species.name.toLowerCase()} season page
            </Link>
            , and always{" "}
            <a href={SITE.dnrDigestUrl} rel="noopener">
              verify with the official DNR regulations
            </a>
            .
          </p>
        </Section>
      )}

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
          label="Michigan DNR deer harvest report summary"
          href="https://www.mdnr-elicense.com/HarvestReportSummary"
          retrieved={view.dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          datasetSchema({
            name: `Michigan reported ${view.species.pluralName} harvest by county and season`,
            description: `Reported ${view.species.pluralName} harvest for every Michigan county, by season year, from Michigan DNR mandatory harvest reporting.`,
            path: `/hunting/${view.species.slug}/`,
            dateModified: view.dataDate,
            sourceUrl: "https://www.mdnr-elicense.com/HarvestReportSummary",
            distributions: [
              { url: "/downloads/harvest-by-county.csv", format: "text/csv" },
              { url: "/downloads/harvest-by-county.json", format: "application/json" },
            ],
          }),
          itemListSchema(
            `Michigan county ${view.species.name.toLowerCase()} hunting pages`,
            view.counties.map((entry: CountyTotal) => ({
              name: `${entry.county.name} County`,
              path: countyHref(entry),
            })),
          ),
          faqSchema(faqs),
        ]}
      />
    </div>
  );
}
