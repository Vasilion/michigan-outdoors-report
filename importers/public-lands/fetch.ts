import { fetchLayer } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const WILDLIFE_PROPERTY_LAYER: ArcGisLayer = {
  service: "DNRWILDLandsOPENDATA",
  layerId: 1,
};

export const PARKS_HUNTABLE_LAYER: ArcGisLayer = {
  service: "DNRBoundariesParksHuntableLandsOPENDATA",
  layerId: 2,
};

export function fetchWildlifeProperties(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(WILDLIFE_PROPERTY_LAYER, true);
}

export function fetchParkHuntableLands(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(PARKS_HUNTABLE_LAYER, true);
}
