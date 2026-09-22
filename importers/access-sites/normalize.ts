import { slugify } from "../../src/lib/slug";
import type { RawAccessSite } from "./parse";

export type NormalizedAccessSite = {
  readonly name: string;
  readonly slug: string;
  readonly type: "boat_launch" | "fishing_access";
  readonly waterbodyName: string | null;
  readonly waterbodyType: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly lanes: number | null;
  readonly ownedBy: string | null;
  readonly amenities: readonly string[];
  readonly sourceRecordId: string;
};

export function amenitiesOf(raw: RawAccessSite): readonly string[] {
  const amenities: string[] = [];
  if (raw.lanes !== null && raw.lanes > 0) {
    amenities.push(`${raw.lanes} launch ${raw.lanes === 1 ? "lane" : "lanes"}`);
  }
  if (raw.piers !== null && raw.piers > 0) {
    amenities.push(`${raw.piers} ${raw.piers === 1 ? "pier" : "piers"}`);
  }
  if (raw.trailerParking !== null && raw.trailerParking > 0) {
    amenities.push(`${raw.trailerParking} trailer parking spaces`);
  }
  if (raw.vehicleParking !== null && raw.vehicleParking > 0) {
    amenities.push(`${raw.vehicleParking} vehicle parking spaces`);
  }
  const toilets: number = (raw.vaultToilets ?? 0) + (raw.flushToilets ?? 0);
  if (toilets > 0) {
    amenities.push("toilets");
  }
  if (raw.carryDown !== null && raw.carryDown.trim().toLowerCase().startsWith("y")) {
    amenities.push("carry-down access");
  }
  return amenities;
}

export function siteType(raw: RawAccessSite): "boat_launch" | "fishing_access" {
  const hasRamp: boolean = raw.lanes !== null && raw.lanes > 0;
  return hasRamp ? "boat_launch" : "fishing_access";
}

export function normalizeAccessSites(
  raws: readonly RawAccessSite[],
): readonly NormalizedAccessSite[] {
  const used: Set<string> = new Set<string>();
  const normalized: NormalizedAccessSite[] = [];
  for (const raw of raws) {
    if (raw.sourceId === null) {
      continue;
    }
    const base: string = slugify(raw.name);
    let slug: string = base;
    let suffix: number = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    normalized.push({
      name: raw.name.replace(/\s+/g, " ").trim(),
      slug,
      type: siteType(raw),
      waterbodyName: raw.waterbody,
      waterbodyType: raw.waterbodyType,
      latitude: raw.latitude,
      longitude: raw.longitude,
      lanes: raw.lanes,
      ownedBy: raw.ownedBy,
      amenities: amenitiesOf(raw),
      sourceRecordId: raw.sourceId,
    });
  }
  return [...normalized].sort(
    (a: NormalizedAccessSite, b: NormalizedAccessSite): number =>
      a.slug.localeCompare(b.slug),
  );
}
