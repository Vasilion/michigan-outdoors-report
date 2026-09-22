import { fetchJson } from "./http";

export const DNR_SERVICES: string =
  "https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services";

export type ArcGisLayer = {
  readonly service: string;
  readonly layerId: number;
};

export type GeoJsonGeometry = {
  readonly type: string;
  readonly coordinates: unknown;
};

export type GeoJsonFeature = {
  readonly type: "Feature";
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: GeoJsonGeometry | null;
};

export type GeoJsonFeatureCollection = {
  readonly type: "FeatureCollection";
  readonly features: readonly GeoJsonFeature[];
  readonly exceededTransferLimit?: boolean;
};

const PAGE_SIZE: number = 1000;

export function layerUrl(layer: ArcGisLayer): string {
  return `${DNR_SERVICES}/${layer.service}/FeatureServer/${layer.layerId}`;
}

export type LayerQuery = {
  readonly where?: string;
  readonly includeGeometry?: boolean;
};

export function queryUrl(
  layer: ArcGisLayer,
  offset: number,
  includeGeometry: boolean,
  where: string = "1=1",
): string {
  const params: string[] = [
    `where=${encodeURIComponent(where)}`,
    "outFields=*",
    `returnGeometry=${includeGeometry ? "true" : "false"}`,
    "outSR=4326",
    `resultOffset=${offset}`,
    `resultRecordCount=${PAGE_SIZE}`,
    "f=geojson",
  ];
  return `${layerUrl(layer)}/query?${params.join("&")}`;
}

function fetchPage(
  layer: ArcGisLayer,
  includeGeometry: boolean,
  where: string,
  offset: number,
  collected: GeoJsonFeature[],
): Promise<readonly GeoJsonFeature[]> {
  const url: string = queryUrl(layer, offset, includeGeometry, where);
  return fetchJson<GeoJsonFeatureCollection>(url, {
    cacheKey: `${layer.service}-${layer.layerId}-${offset}`,
  }).then((page: GeoJsonFeatureCollection): Promise<readonly GeoJsonFeature[]> => {
    const features: readonly GeoJsonFeature[] = page.features ?? [];
    const next: GeoJsonFeature[] = collected.concat(features);
    if (features.length < PAGE_SIZE) {
      return Promise.resolve(next);
    }
    return fetchPage(layer, includeGeometry, where, offset + PAGE_SIZE, next);
  });
}

export function fetchLayer(
  layer: ArcGisLayer,
  includeGeometry: boolean,
  where: string = "1=1",
): Promise<readonly GeoJsonFeature[]> {
  return fetchPage(layer, includeGeometry, where, 0, []);
}

export function stringField(
  properties: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value: unknown = properties[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed: string = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function numberField(
  properties: Readonly<Record<string, unknown>>,
  key: string,
): number | null {
  const value: unknown = properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
