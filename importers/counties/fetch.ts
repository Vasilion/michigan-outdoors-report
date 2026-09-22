import { fetchLayer } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const COUNTY_LAYER: ArcGisLayer = {
  service: "Michigan_Counties",
  layerId: 0,
};

export function fetchCounties(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(COUNTY_LAYER, true);
}
