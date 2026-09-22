import { countySlug, slugify } from "../../src/lib/slug";
import type { StockingApiRow } from "./fetch";

const RIVER_WORDS: RegExp = /\b(river|creek|stream|brook|drain|channel|bayou|run)\b/i;

export type NormalizedStocking = {
  readonly waterName: string;
  readonly waterType: "lake" | "river";
  readonly countySlug: string | null;
  readonly countyName: string | null;
  readonly speciesSlug: string;
  readonly speciesName: string;
  readonly strain: string | null;
  readonly count: number;
  readonly avgLengthIn: number | null;
  readonly stockedOn: string;
  readonly sourceRecordId: string;
};

export function cleanField(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed: string = value.replace(/\s+/g, " ").trim();
  return trimmed === "" ? null : trimmed;
}

export function cleanWaterName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function baseWaterName(value: string): string {
  return cleanWaterName(value.replace(/\([^)]*\)/g, " "));
}

export function classifyWater(name: string): "lake" | "river" {
  return RIVER_WORDS.test(name) ? "river" : "lake";
}

export function speciesNameOf(raw: string): string {
  const cleaned: string = cleanWaterName(raw);
  return cleaned
    .split(" ")
    .map((word: string): string =>
      word.length === 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

export function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function normalizeStocking(
  rows: readonly StockingApiRow[],
): readonly NormalizedStocking[] {
  const normalized: NormalizedStocking[] = [];
  for (const row of rows) {
    const waterRaw: string | null = cleanField(row.Water_Body_Name);
    const speciesRaw: string | null = cleanField(row.SPEC_COMM_Alt);
    const guid: string | null = cleanField(row.GUID);
    if (
      waterRaw === null ||
      speciesRaw === null ||
      guid === null ||
      row.stocking_date === null ||
      row.Number_Fish_Stocked === null ||
      row.Number_Fish_Stocked < 0
    ) {
      continue;
    }
    const countyName: string | null = cleanField(row.County_Name);
    const speciesName: string = speciesNameOf(speciesRaw);
    normalized.push({
      waterName: cleanWaterName(waterRaw),
      waterType: classifyWater(waterRaw),
      countySlug: countyName === null ? null : countySlug(countyName),
      countyName,
      speciesSlug: slugify(speciesName),
      speciesName,
      strain: cleanField(row.str_comm),
      count: row.Number_Fish_Stocked,
      avgLengthIn: row.Average_Length === null ? null : row.Average_Length,
      stockedOn: toIsoDate(row.stocking_date),
      sourceRecordId: guid,
    });
  }
  return normalized;
}

export function distinctSpecies(
  rows: readonly NormalizedStocking[],
): readonly { readonly slug: string; readonly name: string }[] {
  const seen: Map<string, string> = new Map<string, string>();
  for (const row of rows) {
    if (!seen.has(row.speciesSlug)) {
      seen.set(row.speciesSlug, row.speciesName);
    }
  }
  return [...seen.entries()]
    .map(([slug, name]: [string, string]) => ({ slug, name }))
    .sort((a: { slug: string }, b: { slug: string }): number =>
      a.slug.localeCompare(b.slug),
    );
}
