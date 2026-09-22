import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature } from "../lib/arcgis";

export type RawLake = {
  readonly name: string;
  readonly alternateNames: string | null;
  readonly surfaceAcres: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly peninsula: string | null;
  readonly mdnrId: string | null;
  readonly waterId: number | null;
  readonly featureType: number | null;
};

export function parseLake(feature: GeoJsonFeature): RawLake | null {
  const name: string | null =
    stringField(feature.properties, "DNRName") ??
    stringField(feature.properties, "GNISName");
  const acres: number | null = numberField(feature.properties, "SurfaceAcres");
  const latitude: number | null = numberField(feature.properties, "Latitude");
  const longitude: number | null = numberField(feature.properties, "Longitude");
  if (name === null || acres === null || latitude === null || longitude === null) {
    return null;
  }
  return {
    name,
    alternateNames: stringField(feature.properties, "AlternateNames"),
    surfaceAcres: acres,
    latitude,
    longitude,
    peninsula: stringField(feature.properties, "Peninsula"),
    mdnrId: stringField(feature.properties, "MDNRID"),
    waterId: numberField(feature.properties, "WaterID"),
    featureType: numberField(feature.properties, "FType"),
  };
}

export function parseLakes(features: readonly GeoJsonFeature[]): readonly RawLake[] {
  const parsed: RawLake[] = [];
  for (const feature of features) {
    const lake: RawLake | null = parseLake(feature);
    if (lake !== null) {
      parsed.push(lake);
    }
  }
  return parsed;
}
