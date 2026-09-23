import { numberField, stringField } from "../lib/arcgis";
import type { GeoJsonFeature, GeoJsonGeometry } from "../lib/arcgis";
import type { UnitSpec } from "./fetch";

export type NormalizedUnit = {
  readonly speciesSlug: string;
  readonly unitCode: string;
  readonly name: string;
  readonly unitYear: number | null;
  readonly geometries: readonly GeoJsonGeometry[];
};

function unitYear(feature: GeoJsonFeature): number | null {
  const direct: number | null = numberField(feature.properties, "Year");
  if (direct !== null) {
    return direct;
  }
  const text: string | null = stringField(feature.properties, "Year");
  if (text === null) {
    return null;
  }
  const parsed: number = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeUnits(
  spec: UnitSpec,
  features: readonly GeoJsonFeature[],
): readonly NormalizedUnit[] {
  const grouped: Map<string, NormalizedUnit> = new Map<string, NormalizedUnit>();
  for (const feature of features) {
    const code: string | null = stringField(feature.properties, spec.codeField);
    if (code === null) {
      continue;
    }
    const season: string | null =
      spec.seasonField === null
        ? null
        : stringField(feature.properties, spec.seasonField);
    const key: string = season === null ? code : `${code}-${season}`;
    const rawName: string | null =
      spec.nameField === null ? null : stringField(feature.properties, spec.nameField);
    const name: string =
      rawName ?? (season === null ? code : `${code} (${season} season)`);
    const existing: NormalizedUnit | undefined = grouped.get(key);
    const geometries: readonly GeoJsonGeometry[] =
      feature.geometry === null ? [] : [feature.geometry];
    if (existing === undefined) {
      grouped.set(key, {
        speciesSlug: spec.speciesSlug,
        unitCode: key,
        name,
        unitYear: unitYear(feature),
        geometries,
      });
      continue;
    }
    grouped.set(key, {
      ...existing,
      geometries: [...existing.geometries, ...geometries],
    });
  }
  return [...grouped.values()].sort((a: NormalizedUnit, b: NormalizedUnit): number =>
    a.unitCode.localeCompare(b.unitCode),
  );
}
