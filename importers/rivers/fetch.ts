import { fetchLayer } from "../lib/arcgis";
import type { ArcGisLayer, GeoJsonFeature } from "../lib/arcgis";

export const FLOWLINE_LAYER: ArcGisLayer = {
  service: "FISHHydrographyOPENDATA",
  layerId: 2,
};

export const TROUT_REGS_LAYER: ArcGisLayer = {
  service: "DNRFisheriesTroutRegsOPENDATA",
  layerId: 0,
};

export const FLOWLINE_WHERE: string = "DNRName IS NOT NULL";
export const TROUT_WHERE: string = "DNRName IS NOT NULL";

export function fetchFlowlines(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(FLOWLINE_LAYER, false, FLOWLINE_WHERE);
}

export function fetchTroutRegs(): Promise<readonly GeoJsonFeature[]> {
  return fetchLayer(TROUT_REGS_LAYER, false, TROUT_WHERE);
}
