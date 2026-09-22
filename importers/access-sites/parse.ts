import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature } from "../lib/arcgis";

export type RawAccessSite = {
  readonly name: string;
  readonly waterbody: string | null;
  readonly waterbodyType: string | null;
  readonly siteType: string | null;
  readonly county: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly lanes: number | null;
  readonly piers: number | null;
  readonly trailerParking: number | null;
  readonly vehicleParking: number | null;
  readonly vaultToilets: number | null;
  readonly flushToilets: number | null;
  readonly carryDown: string | null;
  readonly ownedBy: string | null;
  readonly sourceId: string | null;
};

export function parseAccessSite(feature: GeoJsonFeature): RawAccessSite | null {
  const name: string | null =
    stringField(feature.properties, "name") ??
    stringField(feature.properties, "LABELNAME");
  const latitude: number | null = numberField(feature.properties, "Latitude");
  const longitude: number | null = numberField(feature.properties, "Longitude");
  const objectId: number | null = numberField(feature.properties, "OBJECTID");
  if (name === null || latitude === null || longitude === null) {
    return null;
  }
  return {
    name,
    waterbody: stringField(feature.properties, "waterbody"),
    waterbodyType: stringField(feature.properties, "WaterbodyType"),
    siteType: stringField(feature.properties, "BAS_Type"),
    county: stringField(feature.properties, "County"),
    latitude,
    longitude,
    lanes: numberField(feature.properties, "nLanes"),
    piers: numberField(feature.properties, "nPiers"),
    trailerParking: numberField(feature.properties, "nTrailerableParking"),
    vehicleParking: numberField(feature.properties, "nVehicleOnlyParking"),
    vaultToilets: numberField(feature.properties, "nVaultToilets"),
    flushToilets: numberField(feature.properties, "nFlushToilets"),
    carryDown: stringField(feature.properties, "CarryDown"),
    ownedBy: stringField(feature.properties, "OWNEDBY"),
    sourceId:
      stringField(feature.properties, "LEGACYID") ??
      (objectId === null ? null : `OBJECTID-${objectId}`),
  };
}

export function parseAccessSites(
  features: readonly GeoJsonFeature[],
): readonly RawAccessSite[] {
  const parsed: RawAccessSite[] = [];
  for (const feature of features) {
    const site: RawAccessSite | null = parseAccessSite(feature);
    if (site !== null) {
      parsed.push(site);
    }
  }
  return parsed;
}
