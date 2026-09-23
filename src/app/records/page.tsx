import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Award, Fish, Ruler, Trophy } from "lucide-react";
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
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { breadcrumbSchema, faqSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb, FaqEntry } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import { getMeta, getStateRecords } from "@/lib/data/snapshot";
import type { RecordSummary, StateRecord } from "@/lib/data/schemas";
import {
  recordPageSlugs,
  recordSpeciesWithPages,
  totalRecordEntries,
} from "@/lib/views/records";
import { MASTER_ANGLER_URL, formatLength, formatWeight } from "@/lib/records";

export const metadata: Metadata = buildMetadata({
  title: "Michigan State Record Fish and Master Angler Records",
  description:
    "Every current Michigan state record fish, plus county-by-county Master Angler records for 47 species from 1919 to today.",
  path: "/records/",
  indexable: true,
  ogImagePath: "/og/default.png",
});

const RECORD_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "length", label: "Length", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "water", label: "Water" },
  { key: "year", label: "Year", numeric: true },
  { key: "angler", label: "Angler" },
];

const SPECIES_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "entries", label: "Entries", numeric: true },
  { key: "counties", label: "Counties", numeric: true },
  { key: "best", label: "Longest", numeric: true },
  { key: "years", label: "Years" },
];

export default function RecordsIndexPage(): ReactElement {
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  const stateRecords: readonly StateRecord[] = [...getStateRecords()].sort(
    (a: StateRecord, b: StateRecord): number =>
      a.speciesName.localeCompare(b.speciesName),
  );
  const species: readonly RecordSummary[] = recordSpeciesWithPages();
  const paged: ReadonlySet<string> = recordPageSlugs();
  const total: number = totalRecordEntries();
  const oldest: number = Math.min(
    ...getStateRecords().map((record: StateRecord): number => record.caughtYear),
  );

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Records", path: "/records/" },
  ];

  const summary: string = `Michigan has ${formatCount(stateRecords.length)} current state record fish, and the DNR Master Angler program has logged ${formatCount(total)} qualifying catches since 1919. This page lists every standing state record and links to county-level records for ${formatCount(species.length)} species. Master Angler is a length-based program, so records here are ranked by length; weight is shown when the angler reported it. Data read ${formatLongDate(dataDate)}.`;

  const facts: StatProps[] = [
    {
      label: "Current state records",
      value: formatCount(stateRecords.length),
      icon: Trophy,
      tone: "accent",
    },
    { label: "Master Angler entries", value: formatCount(total), icon: Award },
    { label: "Species with records", value: formatCount(species.length), icon: Fish },
    { label: "Oldest standing record", value: String(oldest), icon: Ruler },
  ];

  const recordRows: readonly TableRowData[] = stateRecords.map(
    (record: StateRecord): TableRowData => ({
      species: !paged.has(record.speciesSlug) ? (
        record.speciesName
      ) : (
        <Link href={`/records/${record.speciesSlug}/`} prefetch={false}>
          {record.speciesName}
        </Link>
      ),
      length: formatLength(record.lengthIn),
      weight: formatWeight(record.weightLb),
      water: record.waterName ?? "—",
      year: String(record.caughtYear),
      angler: record.anglerName ?? "—",
    }),
  );

  const speciesRows: readonly TableRowData[] = species.map(
    (entry: RecordSummary): TableRowData => ({
      species: (
        <Link href={`/records/${entry.speciesSlug}/`} prefetch={false}>
          {entry.speciesName}
        </Link>
      ),
      entries: formatCount(entry.entryCount),
      counties: formatCount(entry.countyCount),
      best: formatLength(entry.bestLengthIn),
      years: `${entry.firstYear}–${entry.lastYear}`,
    }),
  );

  const faqs: readonly FaqEntry[] = [
    {
      question: "What is the Michigan Master Angler program?",
      answer:
        "Master Angler is the Michigan DNR's recognition program for large fish. An angler submits a catch that meets or beats a published minimum length for that species, and the DNR adds it to a public database. It is length-based, which is why a fish can qualify without a reported weight.",
    },
    {
      question:
        "How is a Michigan state record fish different from a Master Angler entry?",
      answer: `A state record is the single largest fish of its species ever verified in Michigan. A Master Angler entry only has to beat the published minimum length for the species. There are ${formatCount(stateRecords.length)} current state records and ${formatCount(total)} Master Angler entries.`,
    },
    {
      question: "Are these records ranked by weight or length?",
      answer:
        "By length. The Master Angler program records length for nearly every entry but weight for only about a quarter of them, so ranking by weight would silently discard most of the data. Weight is shown wherever the angler reported it.",
    },
  ];

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">State and county records</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Michigan fishing records</h1>
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
        eyebrow="The big list"
        title="Every current Michigan state record fish"
        icon={Trophy}
        description="The largest verified catch of each species in state history. Species names link to county-level records where enough entries exist."
      >
        <DataTable
          caption="Current Michigan state record fish by species, from the DNR Master Angler database."
          columns={RECORD_COLUMNS}
          rows={recordRows}
        />
      </Section>

      <Section
        title="Records by species"
        icon={Fish}
        description="Each species page ranks all 83 counties by the longest fish of that species ever entered there."
      >
        <DataTable
          caption="Michigan Master Angler entry counts by species."
          columns={SPECIES_COLUMNS}
          rows={speciesRows}
        />
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={dataDate} />
        <SourceNote
          label="Michigan DNR Master Angler database"
          href={MASTER_ANGLER_URL}
          retrieved={dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          faqSchema(faqs),
          itemListSchema(
            "Michigan fishing record pages by species",
            species.map((entry: RecordSummary) => ({
              name: entry.speciesName,
              path: `/records/${entry.speciesSlug}/`,
            })),
          ),
        ]}
      />
    </div>
  );
}
