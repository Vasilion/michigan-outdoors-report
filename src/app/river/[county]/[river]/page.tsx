import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Anchor, Fish, HelpCircle, Map as MapIcon, Waves } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { WaterRecordsSection } from "@/components/records";
import { recordsForWater } from "@/lib/views/records";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
  VerifyNotice,
} from "@/components/layout";
import { DataTable, FaqBlock, TrendChart } from "@/components/data";
import type { FaqItem, TableColumn, TableRowData, TrendPoint } from "@/components/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
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
import type { AccessSite, River, Species, StockingEvent } from "@/lib/data/schemas";
import { buildRiverView, riversWithPages } from "@/lib/views/river";
import type { RiverView } from "@/lib/views/river";
import { totalFish, totalsByYear } from "@/lib/views/water";
import type { SpeciesYearTotal } from "@/lib/views/water";
import { SITE } from "@/lib/site";

export type RiverParams = {
  readonly county: string;
  readonly river: string;
};

export type RiverPageProps = {
  readonly params: Promise<RiverParams>;
};

export function generateStaticParams(): RiverParams[] {
  return riversWithPages().map((river: River): RiverParams => ({
    county: river.countySlug,
    river: river.slug,
  }));
}

function summaryText(view: RiverView): string {
  const parts: string[] = [];
  const designation: string = view.river.designatedTroutStream
    ? ` It is a designated trout stream${view.river.streamTypes === null ? "" : ` (${view.river.streamTypes})`}.`
    : "";
  const ribbon: string = view.river.blueRibbon
    ? ` The DNR rates ${view.river.blueRibbonMiles === null ? "part of it" : `${view.river.blueRibbonMiles} miles`} as a Blue Ribbon trout stream, its top quality designation.`
    : "";
  parts.push(
    `${view.river.name} runs through ${view.county.name} County, Michigan.${designation}${ribbon}`,
  );
  if (view.speciesStocked.length > 0 && view.lastStockedOn !== null) {
    parts.push(
      `The Michigan DNR has stocked this stretch with ${joinList(
        view.speciesStocked.map((species: Species): string => species.name.toLowerCase()),
      )}, most recently on ${formatLongDate(view.lastStockedOn)}.`,
    );
  }
  if (view.accessSites.length > 0) {
    parts.push(
      `${formatCount(view.accessSites.length)} public access ${pluralize(view.accessSites.length, "site serves", "sites serve")} it in this county.`,
    );
  }
  parts.push(`Data current as of ${formatLongDate(view.lastUpdated)}.`);
  return parts.join(" ");
}

export function generateMetadata({ params }: RiverPageProps): Promise<Metadata> {
  return params.then((resolved: RiverParams): Metadata => {
    const view: RiverView | null = buildRiverView(resolved.county, resolved.river);
    if (view === null) {
      return buildMetadata({
        title: "River not found",
        description: "This river page does not exist.",
        path: `/river/${resolved.county}/${resolved.river}/`,
        indexable: false,
      });
    }
    const trout: string = view.river.designatedTroutStream
      ? "Designated trout stream with s"
      : "S";
    return buildMetadata({
      title: `${view.river.name}, ${view.county.name} County: Fishing`,
      description: `${trout}tocking records, public access and DNR regulations for ${view.river.name} in ${view.county.name} County, Michigan.`,
      path: `/river/${view.river.countySlug}/${view.river.slug}/`,
      indexable: true,
      ogImagePath: `/og/county-${view.river.countySlug}.png`,
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

export default function RiverPage({ params }: RiverPageProps): ReactElement {
  const resolved: RiverParams = use(params);
  const view: RiverView | null = buildRiverView(resolved.county, resolved.river);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: `${view.county.name} County`, path: `/county/${view.county.slug}/` },
    {
      name: view.river.name,
      path: `/river/${view.river.countySlug}/${view.river.slug}/`,
    },
  ];

  const points: readonly TrendPoint[] = totalsByYear(view.stocking).map(
    (entry: SpeciesYearTotal): TrendPoint => ({
      label: String(entry.year),
      value: entry.count,
    }),
  );

  const facts: StatProps[] = [
    {
      label: "Trout stream",
      value: view.river.designatedTroutStream ? "Designated" : "Not designated",
      icon: Waves,
      tone: view.river.designatedTroutStream ? "accent" : "default",
    },
    { label: "County", value: view.county.name, icon: MapIcon },
    { label: "Access sites", value: formatCount(view.accessSites.length), icon: Anchor },
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
  if (view.river.blueRibbon) {
    faqs.push({
      question: `Is ${view.river.name} a Blue Ribbon trout stream?`,
      answer: `Yes. The Michigan DNR designates ${view.river.blueRibbonMiles === null ? "a stretch of" : `${view.river.blueRibbonMiles} miles of`} ${view.river.name} as a Blue Ribbon trout stream, which is its highest quality trout water rating. Michigan has only a few dozen such streams.`,
    });
  }
  if (view.river.designatedTroutStream) {
    faqs.push({
      question: `Is ${view.river.name} a designated trout stream?`,
      answer: `Yes. The Michigan DNR lists ${view.river.name} as a designated trout stream${view.river.streamTypes === null ? "" : `, classified ${view.river.streamTypes}`}. Designation sets the season and gear rules, which vary by reach, so check the official trout regulations for the stretch you plan to fish.`,
    });
  }
  if (view.speciesStocked.length > 0 && view.lastStockedOn !== null) {
    faqs.push({
      question: `What is stocked in ${view.river.name}?`,
      answer: `In ${view.county.name} County the DNR has recorded stocking of ${joinList(
        view.speciesStocked.map((species: Species): string => species.name.toLowerCase()),
      )} since 2016, most recently on ${formatLongDate(view.lastStockedOn)}.`,
    });
  }
  if (view.accessSites.length > 0) {
    faqs.push({
      question: `Where can I get on ${view.river.name}?`,
      answer: `${joinList(view.accessSites.map((site: AccessSite): string => site.name))} ${view.accessSites.length === 1 ? "is a" : "are"} DNR-listed public access ${pluralize(view.accessSites.length, "site", "sites")} on this river in ${view.county.name} County.`,
    });
  }
  if (view.sameNameElsewhere.length > 0) {
    faqs.push({
      question: `Is this the same ${view.river.name} as the one in other counties?`,
      answer: `Not necessarily. Michigan has more than one water named ${view.river.name}. This page covers the stretch with DNR records in ${view.county.name} County. Pages also exist for ${joinList(
        view.sameNameElsewhere.map(
          (river: River): string => `${river.countySlug.replace(/-/g, " ")} county`,
        ),
      )}.`,
    });
  }

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{view.county.name} County</p>
            {view.river.designatedTroutStream ? (
              <Badge variant="accent">Designated trout stream</Badge>
            ) : null}
            {view.river.blueRibbon ? (
              <Badge variant="open">Blue Ribbon trout stream</Badge>
            ) : null}
          </div>
          <h1 className="mt-2 text-4xl md:text-5xl">{view.river.name}</h1>
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
          eyebrow="What the DNR released"
          title="Stocking history"
          icon={Fish}
          description="Fish released into this river in this county since 2016. These are release records, not population estimates."
        >
          <TrendChart
            title={`Fish stocked in ${view.river.name}, ${view.county.name} County, by year`}
            unitLabel="fish released"
            points={points}
          />
          <div className="mt-6">
            <DataTable
              caption={`Michigan DNR stocking records for ${view.river.name} in ${view.county.name} County since 2016.${view.stocking.length > 40 ? ` Showing the 40 most recent of ${formatCount(view.stocking.length)}.` : ""}`}
              columns={STOCKING_COLUMNS}
              rows={stockingRows}
            />
          </div>
        </Section>
      )}

      {view.accessSites.length === 0 ? null : (
        <Section
          title="Public access"
          icon={Anchor}
          description="DNR-listed access sites on this river in this county."
        >
          <DataTable
            caption={`Public access sites on ${view.river.name} in ${view.county.name} County, from Michigan DNR boating access data.`}
            columns={ACCESS_COLUMNS}
            rows={accessRows}
          />
        </Section>
      )}

      {view.river.designatedTroutStream ? (
        <Section
          title="Trout regulations"
          icon={Waves}
          description="What the DNR publishes about this stream's designation."
        >
          <div className="prose-block">
            <ul>
              <li>
                Designation:{" "}
                {view.river.troutRegulation ??
                  "designated trout stream, classification varies by reach"}
              </li>
              {view.river.streamTypes === null ? null : (
                <li>Stream types recorded: {view.river.streamTypes}</li>
              )}
              {view.river.gearRestriction === null ? null : (
                <li>Gear restriction: {view.river.gearRestriction}</li>
              )}
              {view.river.blueRibbon ? (
                <li>
                  Blue Ribbon trout stream
                  {view.river.blueRibbonMiles === null
                    ? ""
                    : `, ${view.river.blueRibbonMiles} miles`}
                  {view.river.blueRibbonReach === null
                    ? ""
                    : `: ${view.river.blueRibbonReach}`}
                </li>
              ) : null}
            </ul>
          </div>
          <VerifyNotice href={SITE.dnrDigestUrl}>
            Trout stream rules change by reach, and seasons, gear and size limits differ
            between types.
          </VerifyNotice>
        </Section>
      ) : null}

      {view.sameNameElsewhere.length === 0 ? null : (
        <Section
          title={`Other waters named ${view.river.name}`}
          icon={MapIcon}
          description="Michigan reuses stream names. These are separate pages with their own records."
        >
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {view.sameNameElsewhere.map((river: River): ReactElement => (
              <li key={`${river.countySlug}-${river.slug}`}>
                <Link href={`/river/${river.countySlug}/${river.slug}/`} prefetch={false}>
                  {river.name} in {river.countySlug.replace(/-/g, " ")} county
                </Link>
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

      <WaterRecordsSection
        waterName={view.river.name}
        records={recordsForWater(view.county.slug, view.river.slug, "river")}
      />

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.lastUpdated} />
        <SourceNote
          label="Michigan DNR hydrography, trout regulations and stocking data"
          href={view.river.sourceUrl}
          retrieved={view.river.updatedAt}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          placeSchema({
            name: view.river.name,
            description: summaryText(view),
            path: `/river/${view.river.countySlug}/${view.river.slug}/`,
            geo: null,
            type: "RiverBodyOfWater",
          }),
          ...(view.stocking.length === 0
            ? []
            : [
                datasetSchema({
                  name: `${view.river.name} fish stocking records`,
                  description: `Michigan DNR fish stocking records for ${view.river.name} in ${view.county.name} County by species, count and date.`,
                  path: `/river/${view.river.countySlug}/${view.river.slug}/`,
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
