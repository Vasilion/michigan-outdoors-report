import { fetchLayer } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const ACCESS_LAYER: ArcGisLayer = {
  service: "DNR_State_Sponsored_Developed_Boating_Access_Sites_Public_View",
  layerId: 0,
};

export function fetchAccessSites(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(ACCESS_LAYER, false);
}
