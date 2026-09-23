import Link from "next/link";
import type { ReactElement } from "react";
import { Trophy } from "lucide-react";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRowData } from "@/components/data";
import { Section } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format";
import { formatLength, formatWeight } from "@/lib/records";
import { recordPageSlugs } from "@/lib/views/records";
import type { CountyRecord, WaterRecord } from "@/lib/data/schemas";

const COUNTY_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "length", label: "Longest", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "water", label: "Water" },
  { key: "year", label: "Year", numeric: true },
  { key: "entries", label: "Entries", numeric: true },
];

const WATER_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "length", label: "Longest", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "year", label: "Year", numeric: true },
  { key: "entries", label: "Entries", numeric: true },
];

function speciesCell(
  speciesSlug: string,
  speciesName: string,
  paged: ReadonlySet<string>,
): ReactElement | string {
  return paged.has(speciesSlug) ? (
    <Link href={`/records/${speciesSlug}/`} prefetch={false}>
      {speciesName}
    </Link>
  ) : (
    speciesName
  );
}

export type CountyRecordsSectionProps = {
  readonly countyName: string;
  readonly records: readonly CountyRecord[];
};

export function CountyRecordsSection({
  countyName,
  records,
}: CountyRecordsSectionProps): ReactElement | null {
  if (records.length === 0) {
    return null;
  }
  const paged: ReadonlySet<string> = recordPageSlugs();
  const rows: readonly TableRowData[] = records.map(
    (record: CountyRecord): TableRowData => ({
      species: (
        <>
          {speciesCell(record.speciesSlug, record.speciesName, paged)}
          {record.stateRecord ? (
            <Badge className="ml-2" variant="accent">
              State record
            </Badge>
          ) : null}
        </>
      ),
      length: formatLength(record.lengthIn),
      weight: formatWeight(record.weightLb),
      water: record.waterName ?? "—",
      year: String(record.caughtYear),
      entries: formatCount(record.entryCount),
    }),
  );
  return (
    <Section
      eyebrow={`${formatCount(records.length)} species`}
      title="County fishing records"
      icon={Trophy}
      description={`The longest fish of each species ever entered in the DNR Master Angler program from ${countyName} County. Master Angler is length-based, so weight is shown only where the angler reported it.`}
    >
      <DataTable
        caption={`Master Angler records for ${countyName} County, Michigan.`}
        columns={COUNTY_COLUMNS}
        rows={rows}
      />
    </Section>
  );
}

export type WaterRecordsSectionProps = {
  readonly waterName: string;
  readonly records: readonly WaterRecord[];
};

export function WaterRecordsSection({
  waterName,
  records,
}: WaterRecordsSectionProps): ReactElement | null {
  if (records.length === 0) {
    return null;
  }
  const paged: ReadonlySet<string> = recordPageSlugs();
  const rows: readonly TableRowData[] = records.map(
    (record: WaterRecord): TableRowData => ({
      species: (
        <>
          {speciesCell(record.speciesSlug, record.speciesName, paged)}
          {record.stateRecord ? (
            <Badge className="ml-2" variant="accent">
              State record
            </Badge>
          ) : null}
        </>
      ),
      length: formatLength(record.lengthIn),
      weight: formatWeight(record.weightLb),
      year: String(record.caughtYear),
      entries: formatCount(record.entryCount),
    }),
  );
  return (
    <Section
      eyebrow="Master Angler"
      title="Records from this water"
      icon={Trophy}
      description={`Qualifying catches the DNR has logged from ${waterName}. Entries is how many Master Angler fish of that species have come out of it.`}
    >
      <DataTable
        caption={`Master Angler records from ${waterName}.`}
        columns={WATER_COLUMNS}
        rows={rows}
      />
    </Section>
  );
}
