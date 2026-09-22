import { slugify } from "../../src/lib/slug";
import type { RawLake } from "./parse";

export const MIN_SURFACE_ACRES: number = 10;
export const LAKE_FEATURE_TYPES: readonly number[] = [390, 436];

export type NormalizedLake = {
  readonly name: string;
  readonly baseSlug: string;
  readonly acres: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly peninsula: "UP" | "LP" | null;
  readonly mdnrId: string | null;
  readonly waterId: number | null;
  readonly alternateNames: string | null;
};

export function cleanLakeName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/^"+|"+$/g, "")
    .trim();
}

export function isPublishableLake(raw: RawLake): boolean {
  if (raw.surfaceAcres < MIN_SURFACE_ACRES) {
    return false;
  }
  if (raw.featureType !== null && !LAKE_FEATURE_TYPES.includes(raw.featureType)) {
    return false;
  }
  const name: string = cleanLakeName(raw.name).toLowerCase();
  if (name.length < 3) {
    return false;
  }
  return !name.startsWith("no name") && !name.startsWith("unnamed");
}

export function normalizePeninsula(value: string | null): "UP" | "LP" | null {
  if (value === null) {
    return null;
  }
  const lower: string = value.trim().toLowerCase();
  if (lower.startsWith("upper")) {
    return "UP";
  }
  if (lower.startsWith("lower")) {
    return "LP";
  }
  return null;
}

export function normalizeLakes(raws: readonly RawLake[]): readonly NormalizedLake[] {
  const normalized: NormalizedLake[] = [];
  for (const raw of raws) {
    if (!isPublishableLake(raw)) {
      continue;
    }
    const name: string = cleanLakeName(raw.name);
    normalized.push({
      name,
      baseSlug: slugify(name),
      acres: Math.round(raw.surfaceAcres * 10) / 10,
      latitude: raw.latitude,
      longitude: raw.longitude,
      peninsula: normalizePeninsula(raw.peninsula),
      mdnrId: raw.mdnrId,
      waterId: raw.waterId,
      alternateNames: raw.alternateNames,
    });
  }
  return [...normalized].sort((a: NormalizedLake, b: NormalizedLake): number =>
    a.baseSlug === b.baseSlug ? b.acres - a.acres : a.baseSlug.localeCompare(b.baseSlug),
  );
}
