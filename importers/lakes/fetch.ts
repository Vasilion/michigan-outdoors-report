import { fetchLayer } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const LAKE_LAYER: ArcGisLayer = {
  service: "FISHHydrographyOPENDATA",
  layerId: 3,
};

export const LAKE_WHERE: string =
  "(DNRName IS NOT NULL OR GNISName IS NOT NULL) AND SurfaceAcres >= 10 AND FType IN (390,436) AND MDNRID IS NOT NULL";

export function fetchLakes(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(LAKE_LAYER, false, LAKE_WHERE);
}
