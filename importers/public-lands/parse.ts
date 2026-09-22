import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature, GeoJsonGeometry } from "../lib/arcgis";

export type RawLandParcel = {
  readonly name: string;
  readonly sourceType: string;
  readonly landowner: string | null;
  readonly region: string | null;
  readonly county: string | null;
  readonly acres: number | null;
  readonly huntingStatus: string | null;
  readonly geometry: GeoJsonGeometry | null;
};

export function parseWildlifeProperty(feature: GeoJsonFeature): RawLandParcel | null {
  const name: string | null = stringField(feature.properties, "PropertyName");
  const sourceType: string | null = stringField(feature.properties, "PropertyType");
  if (name === null || sourceType === null) {
    return null;
  }
  return {
    name,
    sourceType,
    landowner: stringField(feature.properties, "Landowner"),
    region: stringField(feature.properties, "Region"),
    county: stringField(feature.properties, "County"),
    acres: numberField(feature.properties, "Acres"),
    huntingStatus: null,
    geometry: feature.geometry,
  };
}

export function parseParkHuntableLand(feature: GeoJsonFeature): RawLandParcel | null {
  const name: string | null = stringField(feature.properties, "Facility");
  if (name === null) {
    return null;
  }
  return {
    name,
    sourceType: "Park hunting land",
    landowner: "State",
    region: stringField(feature.properties, "District"),
    county: null,
    acres: numberField(feature.properties, "Acres"),
    huntingStatus: stringField(feature.properties, "HuntTrap"),
    geometry: feature.geometry,
  };
}

export function parseAll(
  features: readonly GeoJsonFeature[],
  parser: (feature: GeoJsonFeature) => RawLandParcel | null,
): readonly RawLandParcel[] {
  const parsed: RawLandParcel[] = [];
  for (const feature of features) {
    const parcel: RawLandParcel | null = parser(feature);
    if (parcel !== null) {
      parsed.push(parcel);
    }
  }
  return parsed;
}
