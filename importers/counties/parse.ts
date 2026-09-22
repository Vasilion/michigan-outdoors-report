import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature, GeoJsonGeometry } from "../lib/arcgis";

export type RawCounty = {
  readonly name: string;
  readonly peninsula: string;
  readonly acres: number | null;
  readonly countyNumber: string | null;
  readonly geometry: GeoJsonGeometry | null;
};

export function parseCounty(feature: GeoJsonFeature): RawCounty | null {
  const name: string | null = stringField(feature.properties, "NAME");
  const peninsula: string | null = stringField(feature.properties, "PENIN");
  if (name === null || peninsula === null) {
    return null;
  }
  return {
    name,
    peninsula,
    acres: numberField(feature.properties, "ACRES"),
    countyNumber: stringField(feature.properties, "CO_NUMBER"),
    geometry: feature.geometry,
  };
}

export function parseCounties(features: readonly GeoJsonFeature[]): readonly RawCounty[] {
  const parsed: RawCounty[] = [];
  for (const feature of features) {
    const county: RawCounty | null = parseCounty(feature);
    if (county !== null) {
      parsed.push(county);
    }
  }
  return parsed;
}
