import { groupBy } from "../data/aggregate";
import {
  findCounty,
  getCountyRecords,
  getGreatLakesRecords,
  getMeta,
  getRecordSummary,
  getStateRecords,
  getWaterRecords,
} from "../data/snapshot";
import type {
  County,
  CountyRecord,
  GreatLakesRecord,
  RecordSummary,
  StateRecord,
  WaterRecord,
} from "../data/schemas";

export const RECORD_MIN_ENTRIES: number = 25;
export const RECORD_MIN_COUNTIES: number = 5;

export function recordSummaryBySpecies(): Map<string, RecordSummary> {
  const map: Map<string, RecordSummary> = new Map<string, RecordSummary>();
  for (const summary of getRecordSummary()) {
    map.set(summary.speciesSlug, summary);
  }
  return map;
}

export function stateRecordBySpecies(): Map<string, StateRecord> {
  const map: Map<string, StateRecord> = new Map<string, StateRecord>();
  for (const record of getStateRecords()) {
    map.set(record.speciesSlug, record);
  }
  return map;
}

export function recordSpeciesWithPages(): readonly RecordSummary[] {
  return getRecordSummary()
    .filter(
      (summary: RecordSummary): boolean =>
        summary.entryCount >= RECORD_MIN_ENTRIES &&
        summary.countyCount >= RECORD_MIN_COUNTIES,
    )
    .slice()
    .sort((a: RecordSummary, b: RecordSummary): number => b.entryCount - a.entryCount);
}

export function countyRecordsBySpecies(): Map<string, CountyRecord[]> {
  return groupBy(
    getCountyRecords(),
    (record: CountyRecord): string => record.speciesSlug,
  );
}

export function countyRecordsByCounty(): Map<string, CountyRecord[]> {
  return groupBy(getCountyRecords(), (record: CountyRecord): string => record.countySlug);
}

export function waterRecordKey(
  countySlug: string,
  waterSlug: string,
  kind: "lake" | "river",
): string {
  return `${kind}::${countySlug}::${waterSlug}`;
}

export function waterRecordsByWater(): Map<string, WaterRecord[]> {
  const map: Map<string, WaterRecord[]> = new Map<string, WaterRecord[]>();
  for (const record of getWaterRecords()) {
    const slug: string | null = record.lakeSlug ?? record.riverSlug;
    if (slug === null) {
      continue;
    }
    const kind: "lake" | "river" = record.lakeSlug === null ? "river" : "lake";
    const key: string = waterRecordKey(record.countySlug, slug, kind);
    const bucket: WaterRecord[] = map.get(key) ?? [];
    bucket.push(record);
    map.set(key, bucket);
  }
  return map;
}

export function recordsForWater(
  countySlug: string,
  waterSlug: string,
  kind: "lake" | "river",
): readonly WaterRecord[] {
  const found: readonly WaterRecord[] =
    waterRecordsByWater().get(waterRecordKey(countySlug, waterSlug, kind)) ?? [];
  return [...found].sort((a: WaterRecord, b: WaterRecord): number =>
    b.entryCount === a.entryCount
      ? a.speciesName.localeCompare(b.speciesName)
      : b.entryCount - a.entryCount,
  );
}

export function recordsForCounty(countySlug: string): readonly CountyRecord[] {
  const found: readonly CountyRecord[] = countyRecordsByCounty().get(countySlug) ?? [];
  return [...found].sort((a: CountyRecord, b: CountyRecord): number =>
    b.entryCount === a.entryCount
      ? a.speciesName.localeCompare(b.speciesName)
      : b.entryCount - a.entryCount,
  );
}

export type SpeciesRecordView = {
  readonly summary: RecordSummary;
  readonly stateRecord: StateRecord | null;
  readonly stateRecordCounty: County | null;
  readonly countyLeaders: readonly CountyRecord[];
  readonly greatLakes: readonly GreatLakesRecord[];
  readonly dataDate: string;
  readonly lastUpdated: string;
};

export function buildSpeciesRecordView(speciesSlug: string): SpeciesRecordView | null {
  const summary: RecordSummary | undefined = recordSummaryBySpecies().get(speciesSlug);
  if (summary === undefined) {
    return null;
  }
  const stateRecord: StateRecord | null = stateRecordBySpecies().get(speciesSlug) ?? null;
  const leaders: readonly CountyRecord[] = [
    ...(countyRecordsBySpecies().get(speciesSlug) ?? []),
  ].sort((a: CountyRecord, b: CountyRecord): number => b.lengthIn - a.lengthIn);
  const greatLakes: readonly GreatLakesRecord[] = getGreatLakesRecords()
    .filter((record: GreatLakesRecord): boolean => record.speciesSlug === speciesSlug)
    .slice()
    .sort((a: GreatLakesRecord, b: GreatLakesRecord): number => b.lengthIn - a.lengthIn);
  const dates: string[] = [
    ...leaders.map((record: CountyRecord): string => record.updatedAt),
    ...(stateRecord === null ? [] : [stateRecord.updatedAt]),
  ].sort();
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  return {
    summary,
    stateRecord,
    stateRecordCounty:
      stateRecord === null || stateRecord.countySlug === null
        ? null
        : findCounty(stateRecord.countySlug),
    countyLeaders: leaders,
    greatLakes,
    dataDate,
    lastUpdated: dates[dates.length - 1] ?? dataDate,
  };
}

export function recordPageSlugs(): ReadonlySet<string> {
  return new Set<string>(
    recordSpeciesWithPages().map((entry: RecordSummary): string => entry.speciesSlug),
  );
}

export function hasRecordPage(speciesSlug: string): boolean {
  return recordPageSlugs().has(speciesSlug);
}

export function totalRecordEntries(): number {
  return getRecordSummary().reduce(
    (total: number, summary: RecordSummary): number => total + summary.entryCount,
    0,
  );
}
