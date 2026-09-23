import { numberField, stringField } from "../lib/arcgis";
import type { CentroidFeature } from "../lib/arcgis";

export type LandProgram = "hunter_access" | "commercial_forest";

export type NormalizedParcel = {
  readonly program: LandProgram;
  readonly sourceKey: string;
  readonly acres: number | null;
  readonly longitude: number | null;
  readonly latitude: number | null;
  readonly attributes: Readonly<Record<string, unknown>>;
};

function centroidPair(feature: CentroidFeature): {
  longitude: number | null;
  latitude: number | null;
} {
  if (feature.centroid === null || feature.centroid === undefined) {
    return { longitude: null, latitude: null };
  }
  const { x, y } = feature.centroid;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { longitude: null, latitude: null };
  }
  return { longitude: x, latitude: y };
}

function cleanText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const collapsed: string = value.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

export function normalizeHunterAccess(
  features: readonly CentroidFeature[],
): readonly NormalizedParcel[] {
  const parcels: NormalizedParcel[] = [];
  for (const feature of features) {
    const id: number | null = numberField(feature.attributes, "HAPID");
    const objectId: number | null = numberField(feature.attributes, "OBJECTID");
    const key: string =
      id === null ? `oid-${objectId ?? 0}` : `hap-${id}-${objectId ?? 0}`;
    const active: string | null = stringField(feature.attributes, "ActiveOrInactive");
    const pair: { longitude: number | null; latitude: number | null } =
      centroidPair(feature);
    parcels.push({
      program: "hunter_access",
      sourceKey: key,
      acres: numberField(feature.attributes, "acres"),
      longitude: pair.longitude,
      latitude: pair.latitude,
      attributes: {
        active: active === null ? null : active.toLowerCase() === "active",
        county: cleanText(stringField(feature.attributes, "COUNTY")),
        huntType: cleanText(stringField(feature.attributes, "HuntType")),
        info: cleanText(stringField(feature.attributes, "HAPInfo")),
        comment: cleanText(stringField(feature.attributes, "SpecialComment")),
        agriculturalAcres: numberField(feature.attributes, "AgriculturalAcres"),
        forestAcres: numberField(feature.attributes, "ForestAcres"),
        grasslandAcres: numberField(feature.attributes, "GrasslandandBushAcres"),
        wetlandAcres: numberField(feature.attributes, "WetlandAcres"),
      },
    });
  }
  return parcels;
}

export function normalizeCommercialForest(
  features: readonly CentroidFeature[],
): readonly NormalizedParcel[] {
  const parcels: NormalizedParcel[] = [];
  const seen: Set<string> = new Set<string>();
  for (const feature of features) {
    const objectId: number | null = numberField(feature.attributes, "OBJECTID");
    if (objectId === null) {
      continue;
    }
    const key: string = `cf-${objectId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const pair: { longitude: number | null; latitude: number | null } =
      centroidPair(feature);
    parcels.push({
      program: "commercial_forest",
      sourceKey: key,
      acres: numberField(feature.attributes, "GISAcres"),
      longitude: pair.longitude,
      latitude: pair.latitude,
      attributes: {
        parcelId: numberField(feature.attributes, "parid"),
      },
    });
  }
  return parcels;
}

export function activeHunterAccess(
  parcels: readonly NormalizedParcel[],
): readonly NormalizedParcel[] {
  return parcels.filter(
    (parcel: NormalizedParcel): boolean => parcel.attributes["active"] === true,
  );
}
