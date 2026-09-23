import { slugify } from "../../src/lib/slug";
import type { RawLandParcel } from "./parse";
import type { GeoJsonGeometry } from "../lib/arcgis";

export type PublicLandType =
  | "state_game_area"
  | "state_forest"
  | "national_forest"
  | "state_park"
  | "hunter_access"
  | "gems"
  | "other";

export type TypeMapping = {
  readonly type: PublicLandType;
  readonly label: string;
  readonly agency: string;
};

export const TYPE_MAP: Readonly<Record<string, TypeMapping>> = {
  "state game area": {
    type: "state_game_area",
    label: "state game area",
    agency: "Michigan DNR Wildlife Division",
  },
  "state wildlife management area": {
    type: "other",
    label: "state wildlife management area",
    agency: "Michigan DNR Wildlife Division",
  },
  "state wildlife managment area": {
    type: "other",
    label: "state wildlife management area",
    agency: "Michigan DNR Wildlife Division",
  },
  "state wildlife research area": {
    type: "other",
    label: "state wildlife research area",
    agency: "Michigan DNR Wildlife Division",
  },
  "waterfowl production area": {
    type: "other",
    label: "waterfowl production area",
    agency: "U.S. Fish and Wildlife Service",
  },
  "national wildlife refuge (usfws)": {
    type: "other",
    label: "national wildlife refuge",
    agency: "U.S. Fish and Wildlife Service",
  },
  "state recreation area": {
    type: "state_park",
    label: "state recreation area",
    agency: "Michigan DNR Parks and Recreation Division",
  },
  "grouse enhanced management site": {
    type: "gems",
    label: "grouse enhanced management site",
    agency: "Michigan DNR Wildlife Division",
  },
  "park hunting land": {
    type: "state_park",
    label: "state park or recreation area",
    agency: "Michigan DNR Parks and Recreation Division",
  },
};

export type NormalizedPublicLand = {
  readonly name: string;
  readonly slug: string;
  readonly type: PublicLandType;
  readonly typeLabel: string;
  readonly managingAgency: string;
  readonly region: string | null;
  readonly huntingStatus: string | null;
  readonly description: string | null;
  readonly acres: number | null;
  readonly geometries: readonly GeoJsonGeometry[];
};

const NAME_NOISE: RegExp = /^[\s(]/;

export function isPublishable(parcel: RawLandParcel): boolean {
  if (NAME_NOISE.test(parcel.name)) {
    return false;
  }
  if (parcel.name.length < 4) {
    return false;
  }
  return TYPE_MAP[parcel.sourceType.toLowerCase()] !== undefined;
}

export function cleanName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s,;:-]+$/, "")
    .trim();
}

export function normalizePublicLands(
  parcels: readonly RawLandParcel[],
): readonly NormalizedPublicLand[] {
  const grouped: Map<string, NormalizedPublicLand> = new Map<
    string,
    NormalizedPublicLand
  >();

  for (const parcel of parcels) {
    if (!isPublishable(parcel)) {
      continue;
    }
    const mapping: TypeMapping = TYPE_MAP[parcel.sourceType.toLowerCase()] as TypeMapping;
    const name: string = cleanName(parcel.name);
    const slug: string = slugify(name);
    const existing: NormalizedPublicLand | undefined = grouped.get(slug);
    const geometries: GeoJsonGeometry[] =
      parcel.geometry === null ? [] : [parcel.geometry];

    if (existing === undefined) {
      grouped.set(slug, {
        name,
        slug,
        type: mapping.type,
        typeLabel: mapping.label,
        managingAgency: mapping.agency,
        region: parcel.region,
        huntingStatus: parcel.huntingStatus,
        description: parcel.description,
        acres: parcel.acres,
        geometries,
      });
      continue;
    }

    grouped.set(slug, {
      ...existing,
      region: existing.region ?? parcel.region,
      huntingStatus: existing.huntingStatus ?? parcel.huntingStatus,
      description: existing.description ?? parcel.description,
      acres:
        existing.acres === null && parcel.acres === null
          ? null
          : (existing.acres ?? 0) + (parcel.acres ?? 0),
      geometries: [...existing.geometries, ...geometries],
    });
  }

  return [...grouped.values()]
    .filter((land: NormalizedPublicLand): boolean => land.geometries.length > 0)
    .sort((a: NormalizedPublicLand, b: NormalizedPublicLand): number =>
      a.slug.localeCompare(b.slug),
    );
}
