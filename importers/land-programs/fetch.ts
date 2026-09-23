import { fetchLayerCentroids, layerUrl } from "../lib/arcgis";
import type { ArcGisLayer, CentroidFeature } from "../lib/arcgis";

export const HAP_LAYER: ArcGisLayer = {
  service: "DNRWILDLandsOPENDATA",
  layerId: 0,
};

export const COMMERCIAL_FOREST_LAYER: ArcGisLayer = {
  service: "CommercialForestOPENDATA",
  layerId: 0,
};

export function hapSourceUrl(): string {
  return layerUrl(HAP_LAYER);
}

export function commercialForestSourceUrl(): string {
  return layerUrl(COMMERCIAL_FOREST_LAYER);
}

export function fetchHunterAccess(): Promise<readonly CentroidFeature[]> {
  return fetchLayerCentroids(HAP_LAYER);
}

export function fetchCommercialForest(): Promise<readonly CentroidFeature[]> {
  return fetchLayerCentroids(COMMERCIAL_FOREST_LAYER);
}
