import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Fish, Map as MapIcon, Trophy, Waves } from "lucide-react";
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
import { CountyChoropleth } from "@/components/map/county-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { breadcrumbSchema, faqSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb, FaqEntry } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import { getCounties, getSpecies } from "@/lib/data/snapshot";
import type {
  CountyRecord,
  GreatLakesRecord,
  RecordSummary,
  Species,
} from "@/lib/data/schemas";
import { buildSpeciesRecordView, recordSpeciesWithPages } from "@/lib/views/records";
import { lakesWithPages } from "@/lib/views/water";
import { speciesHubIndexed, speciesHubPath } from "@/lib/views/species-hub";
import { riversWithPages } from "@/lib/views/river";
import type { SpeciesRecordView } from "@/lib/views/records";
import { MASTER_ANGLER_URL, formatLength, formatWeight } from "@/lib/records";

export type RecordParams = {
  readonly species: string;
};

export type RecordPageProps = {
  readonly params: Promise<RecordParams>;
};

export function generateStaticParams(): RecordParams[] {
  return recordSpeciesWithPages().map((entry: RecordSummary): RecordParams => ({
    species: entry.speciesSlug,
  }));
}

export function generateMetadata({ params }: RecordPageProps): Promise<Metadata> {
  return params.then((resolved: RecordParams): Metadata => {
    const view: SpeciesRecordView | null = buildSpeciesRecordView(resolved.species);
    if (view === null) {
      return buildMetadata({
        title: "Records",
        description: "Michigan fishing records.",
        path: "/records/",
        indexable: false,
      });
    }
    const name: string = view.summary.speciesName;
    const best: string =
      view.stateRecord === null
        ? `${formatCount(view.summary.entryCount)} Master Angler entries`
        : `state record ${formatLength(view.stateRecord.lengthIn)}`;
    return buildMetadata({
      title: `Michigan ${name} Records by County`,
      description: `Michigan ${name.toLowerCase()} records: ${best}, plus the longest one entered in each of ${formatCount(view.summary.countyCount)} counties.`,
      path: `/records/${view.summary.speciesSlug}/`,
      indexable: true,
      ogImagePath: "/og/default.png",
      dateModified: view.lastUpdated,
    });
  });
}

const COUNTY_COLUMNS: readonly TableColumn[] = [
  { key: "county", label: "County" },
  { key: "length", label: "Longest", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "water", label: "Water" },
  { key: "year", label: "Year", numeric: true },
  { key: "entries", label: "Entries", numeric: true },
];

const GREAT_LAKES_COLUMNS: readonly TableColumn[] = [
  { key: "water", label: "Water" },
  { key: "length", label: "Longest", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "year", label: "Year", numeric: true },
  { key: "entries", label: "Entries", numeric: true },
];

function waterLink(
  record: CountyRecord,
  pagedWaters: ReadonlySet<string>,
): ReactElement | string {
  if (
    record.lakeSlug !== null &&
    pagedWaters.has(`lake::${record.countySlug}::${record.lakeSlug}`)
  ) {
    return (
      <Link href={`/lake/${record.countySlug}/${record.lakeSlug}/`} prefetch={false}>
        {record.waterName ?? record.lakeSlug}
      </Link>
    );
  }
  if (
    record.riverSlug !== null &&
    pagedWaters.has(`river::${record.countySlug}::${record.riverSlug}`)
  ) {
    return (
      <Link href={`/river/${record.countySlug}/${record.riverSlug}/`} prefetch={false}>
        {record.waterName ?? record.riverSlug}
      </Link>
    );
  }
  return record.waterName ?? "—";
}

export default function SpeciesRecordPage({
  params,
}: RecordPageProps): Promise<ReactElement> {
  return params.then((resolved: RecordParams): ReactElement => {
    const view: SpeciesRecordView | null = buildSpeciesRecordView(resolved.species);
    if (view === null) {
      notFound();
    }
    const name: string = view.summary.speciesName;
    const countyNames: Map<string, string> = new Map<string, string>();
    for (const county of getCounties()) {
      countyNames.set(county.slug, county.name);
    }

    const pagedWaters: Set<string> = new Set<string>();
    for (const lake of lakesWithPages()) {
      pagedWaters.add(`lake::${lake.countySlug}::${lake.slug}`);
    }
    for (const river of riversWithPages()) {
      pagedWaters.add(`river::${river.countySlug}::${river.slug}`);
    }

    const curated: Species | undefined = getSpecies().find(
      (entry: Species): boolean =>
        entry.slug === view.summary.speciesSlug && speciesHubIndexed(entry),
    );

    const crumbs: readonly Crumb[] = [
      { name: "Home", path: "/" },
      { name: "Records", path: "/records/" },
      { name: name, path: `/records/${view.summary.speciesSlug}/` },
    ];

    const stateLine: string =
      view.stateRecord === null
        ? `No ${name.toLowerCase()} currently holds a Michigan state record.`
        : `The Michigan state record ${name.toLowerCase()} measured ${formatLength(view.stateRecord.lengthIn)}${view.stateRecord.weightLb === null ? "" : ` and weighed ${formatWeight(view.stateRecord.weightLb)}`}, taken from ${view.stateRecord.waterName ?? "an unrecorded water"} in ${view.stateRecord.caughtYear}.`;

    const minimum: string =
      view.summary.minLengthIn === null
        ? ""
        : ` A ${name.toLowerCase()} must reach ${formatLength(view.summary.minLengthIn)} to qualify for Master Angler.`;

    const summary: string = `${stateLine} The DNR Master Angler database holds ${formatCount(view.summary.entryCount)} qualifying ${name.toLowerCase()} entries from ${formatCount(view.summary.countyCount)} Michigan counties between ${view.summary.firstYear} and ${view.summary.lastYear}.${minimum} Data read ${formatLongDate(view.dataDate)}.`;

    const facts: StatProps[] = [
      {
        label: "Master Angler entries",
        value: formatCount(view.summary.entryCount),
        icon: Fish,
        tone: "accent",
      },
      {
        label: "Counties with entries",
        value: formatCount(view.summary.countyCount),
        icon: MapIcon,
      },
      {
        label: "Longest recorded",
        value: formatLength(view.summary.bestLengthIn),
        icon: Trophy,
      },
      {
        label: "Qualifying length",
        value: formatLength(view.summary.minLengthIn),
        icon: Waves,
      },
    ];

    const countyRows: readonly TableRowData[] = view.countyLeaders.map(
      (record: CountyRecord): TableRowData => ({
        county: (
          <Link href={`/county/${record.countySlug}/`} prefetch={false}>
            {countyNames.get(record.countySlug) ?? record.countySlug}
          </Link>
        ),
        length: (
          <>
            {formatLength(record.lengthIn)}
            {record.stateRecord ? (
              <Badge className="ml-2" variant="accent">
                State record
              </Badge>
            ) : null}
          </>
        ),
        weight: formatWeight(record.weightLb),
        water: waterLink(record, pagedWaters),
        year: String(record.caughtYear),
        entries: formatCount(record.entryCount),
      }),
    );

    const greatLakesRows: readonly TableRowData[] = view.greatLakes.map(
      (record: GreatLakesRecord): TableRowData => ({
        water: record.waterName,
        length: formatLength(record.lengthIn),
        weight: formatWeight(record.weightLb),
        year: String(record.caughtYear),
        entries: formatCount(record.entryCount),
      }),
    );

    const mapValues: Map<string, number> = new Map<string, number>();
    for (const record of view.countyLeaders) {
      mapValues.set(record.countySlug, record.lengthIn);
    }

    const top: CountyRecord | undefined = view.countyLeaders[0];

    const faqs: FaqEntry[] = [
      {
        question: `What is the Michigan state record ${name.toLowerCase()}?`,
        answer:
          view.stateRecord === null
            ? `No current Michigan state record is listed for ${name.toLowerCase()}.`
            : `${stateLine}${view.stateRecord.anglerName === null ? "" : ` It was caught by ${view.stateRecord.anglerName}.`}`,
      },
    ];
    if (top !== undefined) {
      faqs.push({
        question: `Which Michigan county produces the biggest ${name.toLowerCase()}?`,
        answer: `By the longest Master Angler entry on record, ${countyNames.get(top.countySlug) ?? top.countySlug} County leads with a ${formatLength(top.lengthIn)} ${name.toLowerCase()} taken in ${top.caughtYear}${top.waterName === null ? "" : ` from ${top.waterName}`}. Entry counts vary a lot by county, so a county with more anglers will tend to post more records.`,
      });
    }
    if (view.summary.minLengthIn !== null) {
      faqs.push({
        question: `How big does a ${name.toLowerCase()} have to be for Master Angler in Michigan?`,
        answer: `The DNR minimum qualifying length for ${name.toLowerCase()} is ${formatLength(view.summary.minLengthIn)}. Minimums are set per species and change occasionally, so check the current Master Angler page before submitting an entry.`,
      });
    }

    return (
      <div className="wrap pb-16">
        <Breadcrumbs items={[...crumbs]} />
        <p className="eyebrow">Master Angler records</p>
        <h1 className="mt-2 text-4xl md:text-5xl">
          Michigan {name.toLowerCase()} records
        </h1>
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
          title="Longest entry by county"
          icon={MapIcon}
          description="Darker counties have produced a longer Master Angler entry. Counties with no entry are unshaded."
        >
          <CountyChoropleth
            title={`Longest Master Angler ${name.toLowerCase()} entry by Michigan county`}
            unitLabel="inches"
            values={mapValues}
            names={countyNames}
            hrefFor={(slug: string): string => `/county/${slug}/`}
          />
        </Section>

        <Section
          title="County leaderboard"
          icon={Trophy}
          description="Ranked by the longest single entry. Entry count shows how much fishing pressure sits behind that number."
        >
          <DataTable
            caption={`Longest Master Angler ${name.toLowerCase()} entries by Michigan county.`}
            columns={COUNTY_COLUMNS}
            rows={countyRows}
          />
        </Section>

        {greatLakesRows.length === 0 ? null : (
          <Section
            title="Great Lakes waters"
            icon={Waves}
            description="Great Lakes and connecting waters sit outside county boundaries, so they are listed separately."
          >
            <DataTable
              caption={`Longest Master Angler ${name.toLowerCase()} entries from Michigan Great Lakes waters.`}
              columns={GREAT_LAKES_COLUMNS}
              rows={greatLakesRows}
            />
          </Section>
        )}

        {curated === undefined ? null : (
          <Section title="More on this species">
            <Card>
              <CardContent>
                <Link href={speciesHubPath(curated)} prefetch={false}>
                  {curated.name} stocking and county data
                </Link>
              </CardContent>
            </Card>
          </Section>
        )}

        <div className="mt-10 grid gap-2">
          <LastUpdated isoDate={view.lastUpdated} />
          <SourceNote
            label="Michigan DNR Master Angler database"
            href={MASTER_ANGLER_URL}
            retrieved={view.dataDate}
          />
        </div>

        <JsonLd
          schemas={[
            breadcrumbSchema(crumbs),
            faqSchema(faqs),
            itemListSchema(
              `Michigan counties by longest ${name.toLowerCase()} record`,
              view.countyLeaders.slice(0, 25).map((record: CountyRecord) => ({
                name: countyNames.get(record.countySlug) ?? record.countySlug,
                path: `/county/${record.countySlug}/`,
              })),
            ),
          ]}
        />
      </div>
    );
  });
}
