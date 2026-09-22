import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Anchor, Fish, HelpCircle, Map as MapIcon, Waves } from "lucide-react";
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
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountyLocator } from "@/components/map/county-map";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  placeSchema,
} from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate, joinList, pluralize } from "@/lib/format";
import { lakeSummary } from "@/lib/summary";
import { slugify } from "@/lib/slug";
import type { AccessSite, Lake, Species, StockingEvent } from "@/lib/data/schemas";
import {
  buildLakeView,
  lakesWithPages,
  totalFish,
  totalsByYear,
} from "@/lib/views/water";
import type { LakeView, SpeciesYearTotal } from "@/lib/views/water";

export type LakeParams = {
  readonly county: string;
  readonly lake: string;
};

export type LakePageProps = {
  readonly params: Promise<LakeParams>;
};

export function generateStaticParams(): LakeParams[] {
  return lakesWithPages().map((lake: Lake): LakeParams => ({
    county: lake.countySlug,
    lake: lake.slug,
  }));
}

function summaryText(view: LakeView): string {
  return lakeSummary({
    lakeName: view.lake.name,
    countyName: view.county.name,
    acres: view.lake.acres,
    maxDepthFt: view.lake.maxDepthFt,
    stockedSpecies: view.speciesStocked.map((species: Species): string =>
      species.name.toLowerCase(),
    ),
    lastStockedOn: view.lastStockedOn,
    accessSiteCount: view.accessSites.length,
    asOfDate: view.lastUpdated,
  });
}

export function lakeDisambiguator(lake: Lake): string {
  if (lake.slug === slugify(lake.name) || lake.acres === null) {
    return "";
  }
  return ` (${formatCount(Math.round(lake.acres))} acres)`;
}

export function generateMetadata({ params }: LakePageProps): Promise<Metadata> {
  return params.then((resolved: LakeParams): Metadata => {
    const view: LakeView | null = buildLakeView(resolved.county, resolved.lake);
    if (view === null) {
      return buildMetadata({
        title: "Lake not found",
        description: "This lake page does not exist.",
        path: `/lake/${resolved.county}/${resolved.lake}/`,
        indexable: false,
      });
    }
    const acres: string =
      view.lake.acres === null
        ? "a lake"
        : `a ${formatCount(Math.round(view.lake.acres))}-acre lake`;
    const detail: string =
      view.speciesStocked.length === 0
        ? `${view.accessSites.length > 0 ? "Public access sites" : "DNR records"} and sources.`
        : `Stocking records for ${view.speciesStocked
            .slice(0, 3)
            .map((species: Species): string => species.name.toLowerCase())
            .join(", ")}, access and sources.`;
    return buildMetadata({
      title: `${view.lake.name}${lakeDisambiguator(view.lake)}, ${view.county.name} County: Fishing`,
      description: `${view.lake.name} is ${acres} in ${view.county.name} County, Michigan. ${detail}`,
      path: `/lake/${view.lake.countySlug}/${view.lake.slug}/`,
      indexable: true,
      dateModified: view.lastUpdated,
    });
  });
}

const STOCKING_COLUMNS: readonly TableColumn[] = [
  { key: "date", label: "Stocked" },
  { key: "species", label: "Species" },
  { key: "strain", label: "Strain" },
  { key: "count", label: "Fish", numeric: true },
  { key: "length", label: "Avg length", numeric: true },
];

const ACCESS_COLUMNS: readonly TableColumn[] = [
  { key: "name", label: "Access site" },
  { key: "type", label: "Type" },
  { key: "amenities", label: "Amenities" },
  { key: "coords", label: "Coordinates" },
];

export default function LakePage({ params }: LakePageProps): ReactElement {
  const resolved: LakeParams = use(params);
  const view: LakeView | null = buildLakeView(resolved.county, resolved.lake);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${view.county.name} County`, path: `/county/${view.county.slug}/` },
    { name: view.lake.name, path: `/lake/${view.lake.countySlug}/${view.lake.slug}/` },
  ];

  const yearTotals: readonly SpeciesYearTotal[] = totalsByYear(view.stocking);
  const points: readonly TrendPoint[] = yearTotals.map(
    (entry: SpeciesYearTotal): TrendPoint => ({
      label: String(entry.year),
      value: entry.count,
    }),
  );

  const facts: StatProps[] = [
    {
      label: "Surface area",
      value:
        view.lake.acres === null
          ? "Not published"
          : `${formatCount(Math.round(view.lake.acres))} acres`,
      icon: Waves,
      tone: "accent",
    },
    { label: "County", value: `${view.county.name}`, icon: MapIcon },
    {
      label: "Access sites",
      value: formatCount(view.accessSites.length),
      icon: Anchor,
    },
    {
      label: "Fish stocked since 2016",
      value:
        view.stocking.length === 0
          ? "None recorded"
          : formatCount(totalFish(view.stocking)),
      icon: Fish,
    },
  ];

  const stockingRows: readonly TableRowData[] = view.stocking
    .slice(0, 40)
    .map((event: StockingEvent): TableRowData => ({
      date: formatLongDate(event.stockedOn),
      species:
        view.speciesStocked.find(
          (species: Species): boolean => species.slug === event.speciesSlug,
        )?.name ?? event.speciesSlug,
      strain: event.strain ?? "Not recorded",
      count: formatCount(event.count),
      length: event.avgLengthIn === null ? "—" : `${event.avgLengthIn.toFixed(1)} in`,
    }));

  const accessRows: readonly TableRowData[] = view.accessSites.map(
    (site: AccessSite): TableRowData => ({
      name: site.name,
      type: site.type === "boat_launch" ? "Boat launch" : "Fishing access",
      amenities: site.amenities.length === 0 ? "Not recorded" : site.amenities.join(", "),
      coords: `${site.coordinate.lat.toFixed(4)}, ${site.coordinate.lng.toFixed(4)}`,
    }),
  );

  const faqs: FaqItem[] = [];
  if (view.speciesStocked.length > 0 && view.lastStockedOn !== null) {
    faqs.push({
      question: `What fish are stocked in ${view.lake.name}?`,
      answer: `Since 2016 the Michigan DNR has recorded stocking of ${joinList(
        view.speciesStocked.map((species: Species): string => species.name.toLowerCase()),
      )} in ${view.lake.name}, most recently on ${formatLongDate(view.lastStockedOn)}. Stocking records describe what was released, not what survives or what you will catch.`,
    });
  }
  if (view.accessSites.length > 0) {
    faqs.push({
      question: `Is there a boat launch on ${view.lake.name}?`,
      answer: `${view.lake.name} has ${formatCount(view.accessSites.length)} DNR-listed public access ${pluralize(view.accessSites.length, "site", "sites")}: ${joinList(
        view.accessSites.map((site: AccessSite): string => site.name),
      )}.`,
    });
  }
  if (view.lake.acres !== null) {
    faqs.push({
      question: `How big is ${view.lake.name}?`,
      answer: `${view.lake.name} covers about ${formatCount(Math.round(view.lake.acres))} surface acres in ${view.county.name} County, according to Michigan DNR hydrography data.`,
    });
  }

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{view.county.name} County</p>
            {view.stocking.length === 0 ? null : (
              <Badge variant="live">Stocked water</Badge>
            )}
          </div>
          <h1 className="mt-2 text-4xl md:text-5xl">{view.lake.name}</h1>
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

      {view.stocking.length === 0 ? null : (
        <Section
          eyebrow="What the DNR put in"
          title="Stocking history"
          icon={Fish}
          description="Fish released by the Michigan DNR and cooperators since 2016. These are release records, not population estimates."
        >
          <TrendChart
            title={`Fish stocked in ${view.lake.name} by year`}
            unitLabel="fish released"
            points={points}
          />
          <div className="mt-6">
            <DataTable
              caption={`Michigan DNR stocking records for ${view.lake.name}, ${view.county.name} County, since 2016.${view.stocking.length > 40 ? ` Showing the 40 most recent of ${formatCount(view.stocking.length)} records.` : ""}`}
              columns={STOCKING_COLUMNS}
              rows={stockingRows}
            />
          </div>
        </Section>
      )}

      {view.accessSites.length === 0 ? null : (
        <Section
          eyebrow="Getting on the water"
          title="Public access"
          icon={Anchor}
          description="DNR-listed boating and fishing access sites on this lake."
        >
          <DataTable
            caption={`Public access sites on ${view.lake.name}, from Michigan DNR boating access data.`}
            columns={ACCESS_COLUMNS}
            rows={accessRows}
          />
        </Section>
      )}

      {view.nearbyLakes.length === 0 ? null : (
        <Section
          title="Nearby lakes"
          icon={Waves}
          description="Other lakes within about 15 miles that have their own page."
        >
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {view.nearbyLakes.map((lake: Lake): ReactElement => (
              <li key={`${lake.countySlug}-${lake.slug}`}>
                <Link href={`/lake/${lake.countySlug}/${lake.slug}/`} prefetch={false}>
                  {lake.name}
                </Link>
                {lake.acres === null ? null : (
                  <span className="text-muted-foreground">
                    {" "}
                    {formatCount(Math.round(lake.acres))} ac
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {faqs.length === 0 ? null : (
        <Section
          title="Common questions"
          icon={HelpCircle}
          description="Answers drawn from the data on this page."
        >
          <FaqBlock items={faqs} />
        </Section>
      )}

      <Section title="More in the county" icon={MapIcon} description="">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <Link href={`/county/${view.county.slug}/`} prefetch={false}>
              {view.county.name} County hunting and fishing
            </Link>
          </li>
          {view.speciesStocked.slice(0, 4).map((species: Species): ReactElement => (
            <li key={species.slug}>
              <Link
                href={`/county/${view.county.slug}/${species.slug}-fishing/`}
                prefetch={false}
              >
                {species.name} in {view.county.name} County
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.lastUpdated} />
        <SourceNote
          label="Michigan DNR hydrography, stocking and boating access data"
          href={view.lake.sourceUrl}
          retrieved={view.lake.updatedAt}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          placeSchema({
            name: view.lake.name,
            description: summaryText(view),
            path: `/lake/${view.lake.countySlug}/${view.lake.slug}/`,
            geo: view.lake.centroid,
            type: "LakeBodyOfWater",
          }),
          ...(view.stocking.length === 0
            ? []
            : [
                datasetSchema({
                  name: `${view.lake.name} fish stocking records`,
                  description: `Michigan DNR fish stocking records for ${view.lake.name} in ${view.county.name} County, by species, strain, count and date.`,
                  path: `/lake/${view.lake.countySlug}/${view.lake.slug}/`,
                  dateModified: view.lastUpdated,
                  sourceUrl: (view.stocking[0] as StockingEvent).sourceUrl,
                  distributions: [
                    { url: "/downloads/stocking-events.csv", format: "text/csv" },
                    {
                      url: "/downloads/stocking-events.json",
                      format: "application/json",
                    },
                  ],
                }),
              ]),
          faqSchema(faqs),
        ]}
      />
    </div>
  );
}
