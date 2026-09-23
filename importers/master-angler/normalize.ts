import { slugify } from "../../src/lib/slug";
import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature } from "../lib/arcgis";

export type NormalizedEntry = {
  readonly reportId: string;
  readonly speciesSlug: string;
  readonly speciesName: string;
  readonly anglerName: string | null;
  readonly caughtYear: number;
  readonly caughtOn: string | null;
  readonly waterName: string | null;
  readonly countyName: string | null;
  readonly lengthIn: number | null;
  readonly weightLb: number | null;
  readonly method: string | null;
  readonly bait: string | null;
  readonly stateRecord: boolean;
  readonly minLengthIn: number | null;
  readonly longitude: number | null;
  readonly latitude: number | null;
};

export function cleanSpeciesName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const collapsed: string = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word: string): string =>
      word.length === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`,
    )
    .join(" ");
}

function numericText(
  properties: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const direct: number | null = numberField(properties, key);
  if (direct !== null) {
    return direct;
  }
  const text: string | null = stringField(properties, key);
  if (text === null) {
    return null;
  }
  const parsed: number = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(properties: Readonly<Record<string, unknown>>): string | null {
  const value: unknown = properties["DateCaught"];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const date: Date = new Date(value);
  const iso: string = date.toISOString().slice(0, 10);
  return iso.startsWith("19") || iso.startsWith("20") ? iso : null;
}

export function normalizeEntries(
  features: readonly GeoJsonFeature[],
): readonly NormalizedEntry[] {
  const entries: NormalizedEntry[] = [];
  const seen: Set<string> = new Set<string>();
  for (const feature of features) {
    const rawSpecies: string | null = stringField(feature.properties, "SpeciesCaught");
    const year: number | null = numberField(feature.properties, "Year");
    if (rawSpecies === null || year === null) {
      continue;
    }
    const speciesName: string = cleanSpeciesName(rawSpecies);
    if (speciesName === "") {
      continue;
    }
    const reportId: string | null = stringField(feature.properties, "ReportId");
    const objectId: number | null = numberField(feature.properties, "OBJECTID");
    const key: string = reportId ?? `oid-${objectId ?? entries.length}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const record: string | null = stringField(feature.properties, "CurrentStateRecord");
    const fullName: string | null = cleanText(
      stringField(feature.properties, "FullName"),
    );
    entries.push({
      reportId: key,
      speciesSlug: slugify(speciesName),
      speciesName,
      anglerName: fullName === null ? null : titleCase(fullName),
      caughtYear: year,
      caughtOn: isoDate(feature.properties),
      waterName: cleanText(stringField(feature.properties, "Waterbody_Name")),
      countyName: cleanText(stringField(feature.properties, "County")),
      lengthIn: numericText(feature.properties, "FishLength"),
      weightLb: numericText(feature.properties, "FishWeight"),
      method: cleanText(stringField(feature.properties, "FishingMethod")),
      bait: cleanText(stringField(feature.properties, "BaitUsed")),
      stateRecord: record !== null && record.toLowerCase() === "yes",
      minLengthIn: numericText(feature.properties, "CurrentMinLength"),
      longitude: numberField(feature.properties, "Longitude"),
      latitude: numberField(feature.properties, "Latitude"),
    });
  }
  return entries;
}

export function speciesFromEntries(
  entries: readonly NormalizedEntry[],
): readonly { readonly slug: string; readonly name: string }[] {
  const byslug: Map<string, string> = new Map<string, string>();
  for (const entry of entries) {
    if (!byslug.has(entry.speciesSlug)) {
      byslug.set(entry.speciesSlug, entry.speciesName);
    }
  }
  return [...byslug.entries()]
    .map(([slug, name]: [string, string]) => ({ slug, name }))
    .sort((a: { slug: string }, b: { slug: string }): number =>
      a.slug.localeCompare(b.slug),
    );
}
