import { slugify } from "../../src/lib/slug";
import { stringField } from "../lib/arcgis";
import type { GeoJsonFeature } from "../lib/arcgis";

export type TroutDesignation = {
  readonly designated: boolean;
  readonly streamTypes: readonly string[];
  readonly regulation: string | null;
  readonly gearRestriction: string | null;
};

export type RiverSeed = {
  readonly name: string;
  readonly countySlug: string;
};

export type NormalizedRiver = {
  readonly name: string;
  readonly slug: string;
  readonly countySlug: string;
  readonly designated: boolean;
  readonly streamTypes: readonly string[];
  readonly regulation: string | null;
  readonly gearRestriction: string | null;
};

const RIVER_SUFFIX: RegExp =
  /\b(river|creek|stream|brook|drain|channel|bayou|run|outlet|branch)\b/i;

export function looksLikeRiver(name: string): boolean {
  return RIVER_SUFFIX.test(name);
}

export function cleanRiverName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s,;:-]+$/, "")
    .trim();
}

export function troutDesignationsByName(
  features: readonly GeoJsonFeature[],
): Map<string, TroutDesignation> {
  const types: Map<string, Set<string>> = new Map<string, Set<string>>();
  const regs: Map<string, Set<string>> = new Map<string, Set<string>>();
  const gear: Map<string, Set<string>> = new Map<string, Set<string>>();
  const designated: Set<string> = new Set<string>();

  for (const feature of features) {
    const rawName: string | null = stringField(feature.properties, "DNRName");
    if (rawName === null) {
      continue;
    }
    const key: string = cleanRiverName(rawName).toLowerCase();
    const isDesignated: boolean = feature.properties["Designated"] === 1;
    const streamType: string | null = stringField(feature.properties, "StreamType");
    const regulation: string | null = stringField(feature.properties, "RegulationDesc");
    const restriction: string | null = stringField(feature.properties, "GearRestriction");

    if (isDesignated) {
      designated.add(key);
      if (streamType !== null && streamType.toLowerCase() !== "unclassified") {
        const bucket: Set<string> = types.get(key) ?? new Set<string>();
        bucket.add(streamType);
        types.set(key, bucket);
      }
      if (regulation !== null) {
        const bucket: Set<string> = regs.get(key) ?? new Set<string>();
        bucket.add(regulation);
        regs.set(key, bucket);
      }
    }
    if (restriction !== null) {
      const bucket: Set<string> = gear.get(key) ?? new Set<string>();
      bucket.add(restriction);
      gear.set(key, bucket);
    }
  }

  const result: Map<string, TroutDesignation> = new Map<string, TroutDesignation>();
  const names: Set<string> = new Set<string>([
    ...designated,
    ...types.keys(),
    ...gear.keys(),
  ]);
  for (const key of names) {
    const typeList: string[] = [...(types.get(key) ?? new Set<string>())].sort();
    const regList: string[] = [...(regs.get(key) ?? new Set<string>())].sort();
    const gearList: string[] = [...(gear.get(key) ?? new Set<string>())].sort();
    result.set(key, {
      designated: designated.has(key),
      streamTypes: typeList,
      regulation: regList.length === 1 ? (regList[0] as string) : null,
      gearRestriction: gearList.length === 1 ? (gearList[0] as string) : null,
    });
  }
  return result;
}

export function knownRiverNames(features: readonly GeoJsonFeature[]): Set<string> {
  const names: Set<string> = new Set<string>();
  for (const feature of features) {
    const rawName: string | null = stringField(feature.properties, "DNRName");
    if (rawName !== null) {
      names.add(cleanRiverName(rawName).toLowerCase());
    }
  }
  return names;
}

export function normalizeRivers(
  seeds: readonly RiverSeed[],
  knownNames: ReadonlySet<string>,
  trout: ReadonlyMap<string, TroutDesignation>,
): readonly NormalizedRiver[] {
  const byKey: Map<string, NormalizedRiver> = new Map<string, NormalizedRiver>();
  for (const seed of seeds) {
    const name: string = cleanRiverName(seed.name);
    if (name.length < 4 || !looksLikeRiver(name)) {
      continue;
    }
    const lower: string = name.toLowerCase();
    if (!knownNames.has(lower)) {
      continue;
    }
    const slug: string = slugify(name);
    const key: string = `${seed.countySlug}::${slug}`;
    if (byKey.has(key)) {
      continue;
    }
    const designation: TroutDesignation | undefined = trout.get(lower);
    byKey.set(key, {
      name,
      slug,
      countySlug: seed.countySlug,
      designated: designation?.designated ?? false,
      streamTypes: designation?.streamTypes ?? [],
      regulation: designation?.regulation ?? null,
      gearRestriction: designation?.gearRestriction ?? null,
    });
  }
  return [...byKey.values()].sort((a: NormalizedRiver, b: NormalizedRiver): number =>
    a.countySlug === b.countySlug
      ? a.slug.localeCompare(b.slug)
      : a.countySlug.localeCompare(b.countySlug),
  );
}
