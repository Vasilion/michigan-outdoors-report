import { countySlug } from "../../src/lib/slug";
import type { RawCounty } from "./parse";
import type { GeoJsonGeometry } from "../lib/arcgis";

const ACRES_PER_SQ_MI: number = 640;

export type NormalizedCounty = {
  readonly name: string;
  readonly slug: string;
  readonly peninsula: "UP" | "LP";
  readonly areaSqMi: number | null;
  readonly sourceRecordId: string | null;
  readonly geometry: GeoJsonGeometry | null;
};

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part: string): string =>
      /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join("");
}

export function normalizePeninsula(value: string): "UP" | "LP" | null {
  const upper: string = value.trim().toUpperCase();
  if (upper === "UP" || upper === "LP") {
    return upper;
  }
  return null;
}

export function normalizeCounty(raw: RawCounty): NormalizedCounty | null {
  const peninsula: "UP" | "LP" | null = normalizePeninsula(raw.peninsula);
  if (peninsula === null) {
    return null;
  }
  const name: string = titleCase(raw.name);
  return {
    name,
    slug: countySlug(name),
    peninsula,
    areaSqMi: raw.acres === null ? null : Math.round(raw.acres / ACRES_PER_SQ_MI),
    sourceRecordId: raw.countyNumber,
    geometry: raw.geometry,
  };
}

export function normalizeCounties(
  raws: readonly RawCounty[],
): readonly NormalizedCounty[] {
  const normalized: NormalizedCounty[] = [];
  for (const raw of raws) {
    const county: NormalizedCounty | null = normalizeCounty(raw);
    if (county !== null) {
      normalized.push(county);
    }
  }
  return [...normalized].sort((a: NormalizedCounty, b: NormalizedCounty): number =>
    a.slug.localeCompare(b.slug),
  );
}
