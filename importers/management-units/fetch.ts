import { fetchLayer, layerUrl } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const UNIT_SERVICE: string = "WILDGameSpeciesManagementUnitsAndZonesOPENDATA";

export type UnitSpec = {
  readonly speciesSlug: string;
  readonly label: string;
  readonly layerId: number;
  readonly codeField: string;
  readonly nameField: string | null;
  readonly seasonField: string | null;
};

export const UNIT_SPECS: readonly UnitSpec[] = [
  {
    speciesSlug: "deer",
    label: "deer management unit",
    layerId: 3,
    codeField: "DeerManagementUnit",
    nameField: "MangementUnitName",
    seasonField: null,
  },
  {
    speciesSlug: "turkey",
    label: "turkey management unit",
    layerId: 5,
    codeField: "ManagementUnit",
    nameField: null,
    seasonField: "Season",
  },
  {
    speciesSlug: "bear",
    label: "bear management unit",
    layerId: 2,
    codeField: "ManagementUnitName",
    nameField: "ManagementUnitName",
    seasonField: null,
  },
  {
    speciesSlug: "elk",
    label: "elk management unit",
    layerId: 4,
    codeField: "ManagementUnitName",
    nameField: null,
    seasonField: "Season",
  },
];

export function unitLayer(spec: UnitSpec): ArcGisLayer {
  return { service: UNIT_SERVICE, layerId: spec.layerId };
}

export function unitSourceUrl(spec: UnitSpec): string {
  return layerUrl(unitLayer(spec));
}

export function fetchUnits(spec: UnitSpec): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(unitLayer(spec), true);
}
