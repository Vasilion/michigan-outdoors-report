import { getLandPrograms, getManagementUnits, getPublicLands } from "../data/snapshot";
import type { LandProgram, ManagementUnit, PublicLand } from "../data/schemas";

export type ProgramKey = "hunter_access" | "commercial_forest";

export type ProgramMeta = {
  readonly key: ProgramKey;
  readonly name: string;
  readonly shortName: string;
  readonly summary: string;
  readonly rules: string;
  readonly officialUrl: string;
};

export const PROGRAM_META: readonly ProgramMeta[] = [
  {
    key: "hunter_access",
    name: "Hunting Access Program",
    shortName: "HAP",
    summary:
      "Private land the DNR leases from willing landowners and opens to public hunting. Most parcels are farmland and edge cover in the southern Lower Peninsula, where public land is scarcest.",
    rules:
      "Every parcel has its own hunt type and check-in rule. Many use a self-service check-in station at the parking area. Nothing may be left overnight and access is walk-in only unless the parcel says otherwise.",
    officialUrl:
      "https://www.michigan.gov/dnr/things-to-do/hunting/hunting-access-program",
  },
  {
    key: "commercial_forest",
    name: "Commercial Forest",
    shortName: "CF",
    summary:
      "Privately owned timber land enrolled in a state tax program. In exchange for a reduced tax rate the owner must allow public foot access for hunting and fishing. It is the largest source of huntable land in the northern Lower Peninsula and the Upper Peninsula after state forest.",
    rules:
      "Foot access only, for hunting and fishing. No camping, no vehicles, no fires, and no other recreation unless the owner permits it. Land is still private property and active logging is common.",
    officialUrl:
      "https://www.michigan.gov/dnr/managing-resources/forestry/private-forestland/cfp",
  },
];

export function programMeta(key: ProgramKey): ProgramMeta {
  return (
    PROGRAM_META.find((meta: ProgramMeta): boolean => meta.key === key) ??
    (PROGRAM_META[0] as ProgramMeta)
  );
}

export function programsByCounty(): Map<string, LandProgram[]> {
  const map: Map<string, LandProgram[]> = new Map<string, LandProgram[]>();
  for (const program of getLandPrograms()) {
    const bucket: LandProgram[] = map.get(program.countySlug) ?? [];
    bucket.push(program);
    map.set(program.countySlug, bucket);
  }
  return map;
}

export function programsForCounty(countySlug: string): readonly LandProgram[] {
  return programsByCounty().get(countySlug) ?? [];
}

export function programTotals(key: ProgramKey): {
  counties: number;
  parcels: number;
  acres: number;
} {
  const rows: readonly LandProgram[] = getLandPrograms().filter(
    (program: LandProgram): boolean => program.program === key,
  );
  return {
    counties: rows.length,
    parcels: rows.reduce(
      (total: number, program: LandProgram): number => total + program.parcelCount,
      0,
    ),
    acres: Math.round(
      rows.reduce(
        (total: number, program: LandProgram): number => total + program.acres,
        0,
      ),
    ),
  };
}

export function unitsByCounty(): Map<string, ManagementUnit[]> {
  const map: Map<string, ManagementUnit[]> = new Map<string, ManagementUnit[]>();
  for (const unit of getManagementUnits()) {
    for (const slug of unit.countySlugs) {
      const bucket: ManagementUnit[] = map.get(slug) ?? [];
      bucket.push(unit);
      map.set(slug, bucket);
    }
  }
  return map;
}

export function unitsForCounty(countySlug: string): readonly ManagementUnit[] {
  const found: readonly ManagementUnit[] = unitsByCounty().get(countySlug) ?? [];
  return [...found].sort((a: ManagementUnit, b: ManagementUnit): number =>
    a.speciesSlug === b.speciesSlug
      ? a.unitCode.localeCompare(b.unitCode)
      : a.speciesSlug.localeCompare(b.speciesSlug),
  );
}

export function publicLandsByType(): Map<string, PublicLand[]> {
  const map: Map<string, PublicLand[]> = new Map<string, PublicLand[]>();
  for (const land of getPublicLands()) {
    const bucket: PublicLand[] = map.get(land.type) ?? [];
    bucket.push(land);
    map.set(land.type, bucket);
  }
  return map;
}

export function publicLandAcres(type: string): number {
  return Math.round(
    (publicLandsByType().get(type) ?? []).reduce(
      (total: number, land: PublicLand): number => total + (land.acres ?? 0),
      0,
    ),
  );
}

export function huntableAcresForCounty(countySlug: string): number {
  const stateAcres: number = getPublicLands()
    .filter((land: PublicLand): boolean => land.countySlugs.includes(countySlug))
    .reduce((total: number, land: PublicLand): number => total + (land.acres ?? 0), 0);
  const programAcres: number = programsForCounty(countySlug).reduce(
    (total: number, program: LandProgram): number => total + program.acres,
    0,
  );
  return Math.round(stateAcres + programAcres);
}

export function detailNumber(
  detail: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const value: unknown = detail[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed: number = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
