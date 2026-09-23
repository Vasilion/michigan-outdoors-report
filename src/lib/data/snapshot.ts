import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodType } from "zod";
import {
  accessSitesFileSchema,
  countiesFileSchema,
  countyShapesFileSchema,
  stateOutlineFileSchema,
  directoryListingsFileSchema,
  harvestSnapshotsFileSchema,
  lakesFileSchema,
  metaSchema,
  publicLandsFileSchema,
  redirectsFileSchema,
  riversFileSchema,
  seasonsFileSchema,
  speciesFileSchema,
  stockingEventsFileSchema,
  landProgramsFileSchema,
  managementUnitsFileSchema,
  stateRecordsFileSchema,
  countyRecordsFileSchema,
  waterRecordsFileSchema,
  greatLakesRecordsFileSchema,
  recordSummaryFileSchema,
} from "./schemas";
import type {
  AccessSite,
  County,
  CountyShape,
  StateOutline,
  DirectoryListing,
  HarvestSnapshot,
  Lake,
  PublicLand,
  Redirect,
  River,
  Season,
  SnapshotMeta,
  Species,
  StockingEvent,
  LandProgram,
  ManagementUnit,
  StateRecord,
  CountyRecord,
  WaterRecord,
  GreatLakesRecord,
  RecordSummary,
} from "./schemas";

export const DATA_DIR: string = join(process.cwd(), "data");

const cache: Map<string, unknown> = new Map<string, unknown>();

export function readSnapshot<T>(fileName: string, schema: ZodType<T>): T {
  const cached: unknown = cache.get(fileName);
  if (cached !== undefined) {
    return cached as T;
  }
  const path: string = join(DATA_DIR, fileName);
  const raw: string = readFileSync(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  const result: T = schema.parse(parsed);
  cache.set(fileName, result);
  return result;
}

export function getMeta(): SnapshotMeta {
  return readSnapshot("meta.json", metaSchema);
}

export function getCounties(): readonly County[] {
  return readSnapshot("counties.json", countiesFileSchema);
}

export function getSpecies(): readonly Species[] {
  return readSnapshot("species.json", speciesFileSchema);
}

export function getLakes(): readonly Lake[] {
  return readSnapshot("lakes.json", lakesFileSchema);
}

export function getRivers(): readonly River[] {
  return readSnapshot("rivers.json", riversFileSchema);
}

export function getPublicLands(): readonly PublicLand[] {
  return readSnapshot("public-lands.json", publicLandsFileSchema);
}

export function getAccessSites(): readonly AccessSite[] {
  return readSnapshot("access-sites.json", accessSitesFileSchema);
}

export function getStockingEvents(): readonly StockingEvent[] {
  return readSnapshot("stocking-events.json", stockingEventsFileSchema);
}

export function getHarvestSnapshots(): readonly HarvestSnapshot[] {
  return readSnapshot("harvest-snapshots.json", harvestSnapshotsFileSchema);
}

export function getSeasons(): readonly Season[] {
  return readSnapshot("seasons.json", seasonsFileSchema);
}

export function getDirectoryListings(): readonly DirectoryListing[] {
  return readSnapshot("directory-listings.json", directoryListingsFileSchema);
}

export function getRedirects(): readonly Redirect[] {
  return readSnapshot("redirects.json", redirectsFileSchema);
}

export function getCountyShapes(): readonly CountyShape[] {
  return readSnapshot("county-shapes.json", countyShapesFileSchema);
}

export function getStateOutline(): StateOutline | null {
  const rows: readonly StateOutline[] = readSnapshot(
    "state-outline.json",
    stateOutlineFileSchema,
  );
  return rows[0] ?? null;
}

export function findCounty(slug: string): County | null {
  return getCounties().find((county: County): boolean => county.slug === slug) ?? null;
}

export function findSpecies(slug: string): Species | null {
  return getSpecies().find((entry: Species): boolean => entry.slug === slug) ?? null;
}

export function latestDataDate(dates: readonly string[]): string {
  const sorted: string[] = [...dates].sort();
  return sorted[sorted.length - 1] ?? getMeta().generatedAt.slice(0, 10);
}

export function getLandPrograms(): readonly LandProgram[] {
  return readSnapshot("land-programs.json", landProgramsFileSchema);
}

export function getManagementUnits(): readonly ManagementUnit[] {
  return readSnapshot("management-units.json", managementUnitsFileSchema);
}

export function getStateRecords(): readonly StateRecord[] {
  return readSnapshot("state-records.json", stateRecordsFileSchema);
}

export function getCountyRecords(): readonly CountyRecord[] {
  return readSnapshot("county-records.json", countyRecordsFileSchema);
}

export function getWaterRecords(): readonly WaterRecord[] {
  return readSnapshot("water-records.json", waterRecordsFileSchema);
}

export function getGreatLakesRecords(): readonly GreatLakesRecord[] {
  return readSnapshot("great-lakes-records.json", greatLakesRecordsFileSchema);
}

export function getRecordSummary(): readonly RecordSummary[] {
  return readSnapshot("record-summary.json", recordSummaryFileSchema);
}
