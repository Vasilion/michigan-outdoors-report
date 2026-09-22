import Link from "next/link";
import { use } from "react";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  QuickFacts,
  Section,
  SourceNote,
} from "@/components/layout";
import type { QuickFact } from "@/components/layout";
import { DataTable, FaqBlock } from "@/components/data";
import type { FaqItem, TableColumn, TableRow } from "@/components/data";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  placeSchema,
} from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate, joinList, pluralize } from "@/lib/format";
import { countySummary } from "@/lib/summary";
import { getCounties } from "@/lib/data/snapshot";
import type {
  County,
  HarvestSnapshot,
  PublicLand,
  Season,
  Species,
} from "@/lib/data/schemas";
import { buildCountyView } from "@/lib/views/county";
import type { CountyView, HarvestSeries } from "@/lib/views/county";
import { seasonStatus } from "@/lib/season";
import type { SeasonStatus } from "@/lib/season";
import { SITE } from "@/lib/site";
import { notFound } from "next/navigation";

export type CountyParams = {
  readonly county: string;
};

export type CountyPageProps = {
  readonly params: Promise<CountyParams>;
};

export function generateStaticParams(): CountyParams[] {
  return getCounties().map((county: County): CountyParams => ({ county: county.slug }));
}

function crumbs(view: CountyView): readonly Crumb[] {
  return [
    { name: "Home", path: "/" },
    { name: `${view.county.name} County`, path: `/county/${view.county.slug}/` },
  ];
}

function summaryText(view: CountyView): string {
  const deer: HarvestSeries | undefined = view.harvest.get("deer");
  const latest: HarvestSnapshot | null = deer?.latestFinal ?? null;
  return countySummary({
    countyName: view.county.name,
    lakeCount: 0,
    publicLandAcres: view.publicLandAcres,
    accessSiteCount: 0,
    latestHarvestTotal: latest === null ? null : latest.total,
    latestHarvestYear: latest === null ? null : latest.seasonYear,
    latestHarvestSpecies: latest === null ? null : "deer",
    asOfDate: view.dataDate,
  });
}

function faqItems(view: CountyView): readonly FaqItem[] {
  const items: FaqItem[] = [];
  const deer: HarvestSeries | undefined = view.harvest.get("deer");
  const latest: HarvestSnapshot | null = deer?.latestFinal ?? null;
  if (latest !== null) {
    items.push({
      question: `How many deer are harvested in ${view.county.name} County each year?`,
      answer: `Hunters reported ${formatCount(latest.total)} deer in ${view.county.name} County during the ${latest.seasonYear} season: ${formatCount(latest.antlered ?? 0)} antlered and ${formatCount(latest.antlerless ?? 0)} antlerless, according to Michigan DNR harvest reporting.`,
    });
  }
  if (view.publicLands.length > 0) {
    items.push({
      question: `Is there public hunting land in ${view.county.name} County?`,
      answer: `Yes. ${view.county.name} County has ${formatCount(view.publicLands.length)} state-managed ${pluralize(view.publicLands.length, "unit", "units")} covering about ${formatCount(Math.round(view.publicLandAcres))} acres, including ${joinList(view.publicLands.slice(0, 3).map((land: PublicLand): string => land.name))}.`,
    });
  }
  const firearm: Season | undefined = view.seasons.find(
    (season: Season): boolean => season.name === "Regular firearm",
  );
  if (firearm !== undefined) {
    items.push({
      question: `When does firearm deer season open in ${view.county.name} County?`,
      answer: `The regular firearm deer season runs ${formatLongDate(firearm.startDate)} through ${formatLongDate(firearm.endDate)} statewide, including ${view.county.name} County. Verify with the Michigan DNR digest before hunting.`,
    });
  }
  items.push({
    question: `Which counties border ${view.county.name} County?`,
    answer:
      view.neighbors.length === 0
        ? `${view.county.name} County has no land borders with another Michigan county.`
        : `${view.county.name} County borders ${joinList(view.neighbors.map((neighbor: County): string => `${neighbor.name} County`))}.`,
  });
  return items;
}

export function generateMetadata({ params }: CountyPageProps): Promise<Metadata> {
  return params.then((resolved: CountyParams): Metadata => {
    const view: CountyView | null = buildCountyView(resolved.county);
    if (view === null) {
      return buildMetadata({
        title: "County not found",
        description: "This county page does not exist.",
        path: `/county/${resolved.county}/`,
        indexable: false,
      });
    }
    const deer: HarvestSeries | undefined = view.harvest.get("deer");
    const latest: HarvestSnapshot | null = deer?.latestFinal ?? null;
    const description: string =
      latest === null
        ? `Public hunting land, season dates and DNR data for ${view.county.name} County, Michigan.`
        : `${formatCount(latest.total)} deer reported in ${view.county.name} County in ${latest.seasonYear}, plus public land, season dates and DNR data.`;
    return buildMetadata({
      title: `${view.county.name} County Hunting & Fishing Guide`,
      description,
      path: `/county/${view.county.slug}/`,
      indexable: true,
      dateModified: view.dataDate,
    });
  });
}

const LAND_COLUMNS: readonly TableColumn[] = [
  { key: "name", label: "Public land" },
  { key: "type", label: "Type" },
  { key: "acres", label: "Acres", numeric: true },
];

const SEASON_COLUMNS: readonly TableColumn[] = [
  { key: "season", label: "Season" },
  { key: "zone", label: "Applies to" },
  { key: "opens", label: "Opens" },
  { key: "closes", label: "Closes" },
  { key: "status", label: "Status" },
];

export default function CountyPage({ params }: CountyPageProps): ReactElement {
  const resolved: CountyParams = use(params);
  const view: CountyView | null = buildCountyView(resolved.county);
  if (view === null) {
    notFound();
  }

  const deer: HarvestSeries | undefined = view.harvest.get("deer");
  const latest: HarvestSnapshot | null = deer?.latestFinal ?? null;
  const facts: QuickFact[] = [
    { label: "Peninsula", value: view.peninsula },
    {
      label: "Land area",
      value:
        view.county.areaSqMi === null
          ? "Not published"
          : `${formatCount(view.county.areaSqMi)} sq mi`,
    },
    {
      label: "Public land",
      value:
        view.publicLandAcres > 0
          ? `${formatCount(Math.round(view.publicLandAcres))} acres`
          : "None mapped",
    },
    {
      label: latest === null ? "Deer harvest" : `${latest.seasonYear} deer harvest`,
      value: latest === null ? "Not published" : formatCount(latest.total),
    },
  ];

  const landRows: readonly TableRow[] = view.publicLands.map(
    (land: PublicLand): TableRow => ({
      name: land.name,
      type: land.typeLabel,
      acres: land.acres === null ? "Not published" : formatCount(land.acres),
    }),
  );

  const seasonRows: readonly TableRow[] = view.seasons.map((season: Season): TableRow => {
    const status: SeasonStatus = seasonStatus(season, view.dataDate);
    return {
      season: season.name,
      zone: season.zone,
      opens: formatLongDate(season.startDate),
      closes: formatLongDate(season.endDate),
      status:
        status.state === "open"
          ? "Open now"
          : status.state === "upcoming"
            ? `Opens in ${status.daysUntilOpen ?? 0} days`
            : "Closed",
    };
  });

  const faqs: readonly FaqItem[] = faqItems(view);

  return (
    <>
      <Breadcrumbs items={[...crumbs(view)]} />
      <h1 className="text-4xl">{view.county.name} County hunting and fishing</h1>
      <div className="mt-6">
        <AnswerSummary text={summaryText(view)} />
      </div>
      <div className="mt-8">
        <QuickFacts facts={facts} />
      </div>

      <Section
        title="Hunting"
        description={`Reported harvest and public land for ${view.county.name} County.`}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {view.gameSpecies.map((species: Species): ReactElement => {
            const series: HarvestSeries | undefined = view.harvest.get(species.slug);
            const seriesLatest: HarvestSnapshot | null = series?.latestFinal ?? null;
            if (seriesLatest === null) {
              return (
                <li key={species.slug} className="card">
                  <h3 className="text-lg">{species.name}</h3>
                  <p className="mt-2 text-bark-600">
                    No reported harvest published for this county yet.
                  </p>
                </li>
              );
            }
            return (
              <li key={species.slug} className="card">
                <h3 className="text-lg">
                  <Link
                    href={`/county/${view.county.slug}/${species.slug}-hunting/`}
                    prefetch={false}
                  >
                    {species.name} hunting in {view.county.name} County
                  </Link>
                </h3>
                <p className="mt-2 font-display text-3xl text-pine-800">
                  {formatCount(seriesLatest.total)}
                </p>
                <p className="text-sm text-bark-500">
                  reported in the {seriesLatest.seasonYear} season
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      {view.publicLands.length === 0 ? null : (
        <Section
          title="Public land"
          description={`State-managed land open to the public in ${view.county.name} County.`}
        >
          <DataTable
            caption={`Public land units in ${view.county.name} County, from Michigan DNR boundary data.`}
            columns={LAND_COLUMNS}
            rows={landRows}
          />
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {view.publicLands.map((land: PublicLand): ReactElement => (
              <li key={land.slug}>
                <Link href={`/public-land/${land.slug}/`} prefetch={false}>
                  {land.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {view.seasons.length === 0 ? null : (
        <Section
          title="Season dates"
          description={`Deer seasons that apply in ${view.county.name} County, which is in the ${view.peninsula}.`}
        >
          <DataTable
            caption={`Michigan deer season dates applying to ${view.county.name} County. Status calculated ${formatLongDate(view.dataDate)}.`}
            columns={SEASON_COLUMNS}
            rows={seasonRows}
          />
          <p className="mt-3 text-sm text-bark-500">
            Summarised from the Michigan DNR digest. Always{" "}
            <a href={SITE.dnrDigestUrl} rel="noopener">
              verify with the official regulations
            </a>{" "}
            before hunting.
          </p>
        </Section>
      )}

      {view.neighbors.length === 0 ? null : (
        <Section title="Neighboring counties" description="Counties sharing a border.">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {view.neighbors.map((neighbor: County): ReactElement => (
              <li key={neighbor.slug}>
                <Link href={`/county/${neighbor.slug}/`} prefetch={false}>
                  {neighbor.name} County
                </Link>
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

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.dataDate} />
        <SourceNote
          label="Michigan DNR harvest reporting and open data"
          href="https://www.mdnr-elicense.com/HarvestReportSummary"
          retrieved={view.dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs(view)),
          placeSchema({
            name: `${view.county.name} County, Michigan`,
            description: summaryText(view),
            path: `/county/${view.county.slug}/`,
            geo: view.county.centroid,
            type: "AdministrativeArea",
          }),
          datasetSchema({
            name: `${view.county.name} County deer harvest and public land`,
            description: `Reported deer harvest by season and state-managed public land for ${view.county.name} County, Michigan.`,
            path: `/county/${view.county.slug}/`,
            dateModified: view.dataDate,
            sourceUrl: "https://www.mdnr-elicense.com/HarvestReportSummary",
          }),
          faqSchema(faqs),
        ]}
      />
    </>
  );
}
