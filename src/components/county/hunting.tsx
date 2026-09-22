import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { CalendarDays, ChartColumn, Target, TreePine } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CountyLocator } from "@/components/map/county-map";
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
import { breadcrumbSchema, datasetSchema, faqSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate, percentChange, pluralize } from "@/lib/format";
import type { PercentChange } from "@/lib/format";
import { harvestSummary } from "@/lib/summary";
import { getCounties, getSpecies } from "@/lib/data/snapshot";
import type {
  County,
  HarvestSnapshot,
  PublicLand,
  Season,
  Species,
} from "@/lib/data/schemas";
import { buildCountyView, harvestSeries } from "@/lib/views/county";
import type { CountyView, HarvestSeries } from "@/lib/views/county";
import { SITE } from "@/lib/site";

export type HuntParams = {
  readonly county: string;
  readonly speciesSlug: string;
};

export type HuntPageProps = {
  readonly params: HuntParams;
};

export function huntingParams(): readonly { county: string; speciesSlug: string }[] {
  const params: { county: string; speciesSlug: string }[] = [];
  for (const county of getCounties()) {
    for (const species of getSpecies()) {
      if (species.kind !== "game") {
        continue;
      }
      if (harvestSeries(county.slug, species.slug).finalRows.length < 2) {
        continue;
      }
      params.push({ county: county.slug, speciesSlug: species.slug });
    }
  }
  return params;
}

type HuntView = {
  readonly county: CountyView;
  readonly species: Species;
  readonly series: HarvestSeries;
  readonly path: string;
};

export function buildHuntView(params: HuntParams): HuntView | null {
  const speciesSlug: string = params.speciesSlug;
  const county: CountyView | null = buildCountyView(params.county);
  if (county === null) {
    return null;
  }
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean => entry.slug === speciesSlug && entry.kind === "game",
  );
  if (species === undefined) {
    return null;
  }
  const series: HarvestSeries = harvestSeries(params.county, speciesSlug);
  if (series.finalRows.length < 2) {
    return null;
  }
  return {
    county,
    species,
    series,
    path: `/county/${params.county}/${params.speciesSlug}-hunting/`,
  };
}

function summaryText(view: HuntView): string {
  const latest: HarvestSnapshot = view.series.latestFinal as HarvestSnapshot;
  const previous: HarvestSnapshot | null = view.series.previousFinal;
  return harvestSummary({
    countyName: view.county.county.name,
    speciesLabel: view.species.pluralName,
    seasonYear: latest.seasonYear,
    total: latest.total,
    priorTotal: previous === null ? null : previous.total,
    priorYear: previous === null ? null : previous.seasonYear,
    asOfDate: latest.snapshotDate,
    isFinal: latest.isFinal,
  });
}

function faqItems(view: HuntView): readonly FaqItem[] {
  const latest: HarvestSnapshot = view.series.latestFinal as HarvestSnapshot;
  const countyName: string = view.county.county.name;
  const items: FaqItem[] = [
    {
      question: `How many ${view.species.pluralName} were harvested in ${countyName} County in ${latest.seasonYear}?`,
      answer: `Hunters reported ${formatCount(latest.total)} ${view.species.pluralName} in ${countyName} County during the ${latest.seasonYear} season: ${formatCount(latest.antlered ?? 0)} antlered and ${formatCount(latest.antlerless ?? 0)} antlerless.`,
    },
  ];
  const best: HarvestSnapshot = [...view.series.finalRows].sort(
    (a: HarvestSnapshot, b: HarvestSnapshot): number => b.total - a.total,
  )[0] as HarvestSnapshot;
  items.push({
    question: `Which season had the highest reported ${view.species.pluralName} harvest in ${countyName} County?`,
    answer: `Of the ${view.series.finalRows.length} completed seasons with mandatory reporting, ${best.seasonYear} had the highest reported total at ${formatCount(best.total)} ${view.species.pluralName}.`,
  });
  if (view.series.inProgress !== null) {
    items.push({
      question: `How is the ${view.series.inProgress.seasonYear} season going in ${countyName} County?`,
      answer: `As of ${formatLongDate(view.series.inProgress.snapshotDate)}, hunters have reported ${formatCount(view.series.inProgress.total)} ${view.species.pluralName} in ${countyName} County for the ${view.series.inProgress.seasonYear} season. That figure keeps rising until the season closes.`,
    });
  }
  if (view.county.publicLands.length > 0) {
    items.push({
      question: `Where can I hunt ${view.species.pluralName} on public land in ${countyName} County?`,
      answer: `${countyName} County has ${formatCount(view.county.publicLands.length)} state-managed ${pluralize(view.county.publicLands.length, "unit", "units")} totalling about ${formatCount(Math.round(view.county.publicLandAcres))} acres. Hunting rules vary by unit, so check the DNR listing for each one.`,
    });
  }
  return items;
}

export function huntingMetadata(resolved: HuntParams): Metadata {
  {
    const view: HuntView | null = buildHuntView(resolved);
    if (view === null) {
      return buildMetadata({
        title: "Page not found",
        description: "This page does not exist.",
        path: `/county/${resolved.county}/${resolved.speciesSlug}-hunting/`,
        indexable: false,
      });
    }
    const latest: HarvestSnapshot = view.series.latestFinal as HarvestSnapshot;
    return buildMetadata({
      title: `${view.county.county.name} County Deer Hunting: Harvest Data`,
      description: `${formatCount(latest.total)} deer reported in ${view.county.county.name} County for the ${latest.seasonYear} season, with ${view.series.finalRows.length}-season trends, public land and season dates.`,
      path: view.path,
      indexable: true,
      ogImagePath: `/og/county-${view.county.county.slug}.png`,
      dateModified: latest.snapshotDate,
    });
  }
}

const HARVEST_COLUMNS: readonly TableColumn[] = [
  { key: "season", label: "Season" },
  { key: "antlered", label: "Antlered", numeric: true },
  { key: "antlerless", label: "Antlerless", numeric: true },
  { key: "total", label: "Total", numeric: true },
  { key: "change", label: "Change", numeric: true },
  { key: "status", label: "Status" },
];

export function CountyHunting({ params }: HuntPageProps): ReactElement {
  const view: HuntView | null = buildHuntView(params);
  if (view === null) {
    notFound();
  }

  const latest: HarvestSnapshot = view.series.latestFinal as HarvestSnapshot;
  const previous: HarvestSnapshot | null = view.series.previousFinal;
  const change: PercentChange | null =
    previous === null ? null : percentChange(latest.total, previous.total);
  const countyName: string = view.county.county.name;

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${countyName} County`, path: `/county/${view.county.county.slug}/` },
    { name: `${view.species.name} hunting`, path: view.path },
  ];

  const rows: readonly TableRowData[] = view.series.rows.map(
    (row: HarvestSnapshot, index: number): TableRowData => {
      const prior: HarvestSnapshot | undefined = view.series.rows[index - 1];
      const rowChange: PercentChange | null =
        prior === undefined ? null : percentChange(row.total, prior.total);
      return {
        season: String(row.seasonYear),
        antlered: row.antlered === null ? "Not published" : formatCount(row.antlered),
        antlerless:
          row.antlerless === null ? "Not published" : formatCount(row.antlerless),
        total: formatCount(row.total),
        change:
          rowChange === null
            ? "—"
            : rowChange.direction === "unchanged"
              ? "even"
              : `${rowChange.direction === "up" ? "+" : "-"}${rowChange.percent}%`,
        status: (
          <Badge variant={row.isFinal ? "closed" : "live"}>
            {row.isFinal ? "Season closed" : "In progress"}
          </Badge>
        ),
      };
    },
  );

  const points: readonly TrendPoint[] = view.series.rows.map(
    (row: HarvestSnapshot): TrendPoint => ({
      label: String(row.seasonYear),
      value: row.total,
      muted: !row.isFinal,
    }),
  );

  const facts: StatProps[] = [
    {
      label: `${latest.seasonYear} total`,
      value: formatCount(latest.total),
      icon: Target,
      tone: "accent",
    },
    { label: "Antlered", value: formatCount(latest.antlered ?? 0) },
    { label: "Antlerless", value: formatCount(latest.antlerless ?? 0) },
    {
      label: "Vs prior season",
      value:
        change === null
          ? "No prior season"
          : change.direction === "unchanged"
            ? "About even"
            : `${change.direction === "up" ? "+" : "-"}${change.percent}%`,
    },
  ];

  const faqs: readonly FaqItem[] = faqItems(view);

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{view.county.peninsula}</p>
            {view.series.inProgress === null ? null : (
              <Badge variant="live">
                {view.series.inProgress.seasonYear} season in progress
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-4xl md:text-5xl">
            {countyName} County {view.species.name.toLowerCase()} hunting
          </h1>
          <div className="mt-6">
            <AnswerSummary text={summaryText(view)} />
          </div>
        </div>
        <Card className="hidden self-start md:block">
          <CardContent className="p-3">
            <CountyLocator countySlug={view.county.county.slug} countyName={countyName} />
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
        eyebrow="Counts, not estimates"
        title="Reported harvest by season"
        icon={ChartColumn}
        description={`Michigan has required hunters to report every deer since the ${view.series.rows[0]?.seasonYear ?? ""} season, so these are counts of reported animals rather than survey estimates.`}
      >
        <TrendChart
          title={`Reported ${view.species.pluralName} harvest in ${countyName} County by season`}
          unitLabel={`${view.species.pluralName} reported`}
          points={points}
        />
        <div className="mt-6">
          <DataTable
            caption={`Reported ${view.species.pluralName} harvest in ${countyName} County by season, from Michigan DNR harvest reporting, read ${formatLongDate(latest.snapshotDate)}.`}
            columns={HARVEST_COLUMNS}
            rows={rows}
          />
        </div>
      </Section>

      {view.county.seasons.length === 0 ? null : (
        <Section
          title="Season dates"
          icon={CalendarDays}
          description={`${countyName} County is in the ${view.county.peninsula}, so these seasons apply.`}
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {view.county.seasons.map((season: Season): ReactElement => (
              <li
                key={`${season.name}-${season.zone}`}
                className="bg-card text-card-foreground border-border shadow-card rounded-xl border px-5 py-4"
              >
                <p className="font-display text-lg text-pine-800">{season.name}</p>
                <p className="text-sm text-bark-500">{season.zone}</p>
                <p className="mt-2">
                  {formatLongDate(season.startDate)} – {formatLongDate(season.endDate)}
                </p>
                {season.notes === null ? null : (
                  <p className="mt-2 text-sm text-bark-600">{season.notes}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-bark-500">
            Summarised from the Michigan DNR digest. Always{" "}
            <a href={SITE.dnrDigestUrl} rel="noopener">
              verify with the official regulations
            </a>{" "}
            before hunting.
          </p>
        </Section>
      )}

      {view.county.publicLands.length === 0 ? null : (
        <Section
          title="Public land in the county"
          icon={TreePine}
          description="State-managed land where hunting may be allowed. Rules vary by unit."
        >
          <ul className="grid gap-2 md:grid-cols-2">
            {view.county.publicLands
              .slice(0, 10)
              .map((land: PublicLand): ReactElement => (
                <li key={land.slug}>
                  <Link href={`/public-land/${land.slug}/`} prefetch={false}>
                    {land.name}
                  </Link>
                  {land.acres === null ? null : (
                    <span className="text-bark-500">
                      {" "}
                      — {formatCount(land.acres)} acres
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </Section>
      )}

      <Section
        title="Common questions"
        description="Answers drawn from the data on this page."
      >
        <FaqBlock items={faqs} />
      </Section>

      <Section
        title="Compare nearby"
        description="Reported harvest in bordering counties."
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {view.county.neighbors.map((neighbor: County): ReactElement => (
            <li key={neighbor.slug}>
              <Link
                href={`/county/${neighbor.slug}/${view.species.slug}-hunting/`}
                prefetch={false}
              >
                {neighbor.name} County
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/hunting/${view.species.slug}/`} prefetch={false}>
              Statewide {view.species.pluralName} harvest
            </Link>
          </li>
        </ul>
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={latest.snapshotDate} />
        <SourceNote
          label="Michigan DNR deer harvest report summary"
          href="https://www.mdnr-elicense.com/HarvestReportSummary"
          retrieved={latest.snapshotDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          datasetSchema({
            name: `${countyName} County reported ${view.species.pluralName} harvest by season`,
            description: `Reported ${view.species.pluralName} harvest totals, antlered and antlerless, for ${countyName} County, Michigan, by season year.`,
            path: view.path,
            dateModified: latest.snapshotDate,
            sourceUrl: "https://www.mdnr-elicense.com/HarvestReportSummary",
            distributions: [
              { url: "/downloads/harvest-by-county.csv", format: "text/csv" },
              { url: "/downloads/harvest-by-county.json", format: "application/json" },
            ],
          }),
          faqSchema(faqs),
        ]}
      />
    </div>
  );
}
