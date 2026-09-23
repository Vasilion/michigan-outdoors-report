import { fetchLayer, layerUrl } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const MASTER_ANGLER_LAYER: ArcGisLayer = {
  service: "Master_Angler_20220328",
  layerId: 0,
};

export function masterAnglerSourceUrl(): string {
  return layerUrl(MASTER_ANGLER_LAYER);
}

export function fetchMasterAngler(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(MASTER_ANGLER_LAYER, false, "SpeciesCaught IS NOT NULL");
}
