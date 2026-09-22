import { countySlug } from "../../src/lib/slug";
import type { RawHarvestRow } from "./parse";

export type NormalizedHarvestRow = {
  readonly countySlug: string;
  readonly speciesSlug: string;
  readonly seasonYear: number;
  readonly antlered: number | null;
  readonly antlerless: number | null;
  readonly total: number;
  readonly isFinal: boolean;
};

export function normalizeHarvestRows(
  rows: readonly RawHarvestRow[],
  speciesSlug: string,
  currentLicenseYear: number,
  knownCountySlugs: ReadonlySet<string>,
): readonly NormalizedHarvestRow[] {
  const normalized: NormalizedHarvestRow[] = [];
  for (const row of rows) {
    const slug: string = countySlug(row.countyName);
    if (!knownCountySlugs.has(slug)) {
      continue;
    }
    normalized.push({
      countySlug: slug,
      speciesSlug,
      seasonYear: row.seasonYear,
      antlered: row.antlered,
      antlerless: row.antlerless,
      total: row.total,
      isFinal: row.seasonYear < currentLicenseYear,
    });
  }
  return normalized;
}

export function unknownCounties(
  rows: readonly RawHarvestRow[],
  knownCountySlugs: ReadonlySet<string>,
): readonly string[] {
  const unknown: Set<string> = new Set<string>();
  for (const row of rows) {
    const slug: string = countySlug(row.countyName);
    if (!knownCountySlugs.has(slug)) {
      unknown.add(row.countyName);
    }
  }
  return [...unknown].sort();
}
