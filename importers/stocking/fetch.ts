import { fetchJson } from "../lib/http";

export const STOCKING_TABLE_URL: string =
  "https://utility.arcgis.com/usrsvcs/servers/fc7739be5f5247e7bf7f2c6bc9471140/rest/services/DNR/FishStockingReportGISAGO/MapServer/0";

export const STOCKING_DASHBOARD_URL: string =
  "https://midnr.maps.arcgis.com/apps/dashboards/77581b13c6984b919ab8ed927496a31f";

export const EARLIEST_SEASON_YEAR: number = 2016;

const PAGE_SIZE: number = 1000;

export type StockingApiRow = {
  readonly County_Name: string | null;
  readonly Water_Body_Name: string | null;
  readonly waters_id: number | null;
  readonly SPEC_COMM_Alt: string | null;
  readonly str_comm: string | null;
  readonly stocking_date: number | null;
  readonly Number_Fish_Stocked: number | null;
  readonly Average_Length: number | null;
  readonly Operation: string | null;
  readonly sitename: string | null;
  readonly GUID: string | null;
};

export type StockingApiResponse = {
  readonly features?: readonly { readonly attributes: StockingApiRow }[];
  readonly exceededTransferLimit?: boolean;
  readonly error?: { readonly message?: string };
};

export function stockingQueryUrl(offset: number, sinceYear: number): string {
  const where: string = `stocking_date >= date '${sinceYear}-01-01'`;
  const params: string[] = [
    `where=${encodeURIComponent(where)}`,
    "outFields=*",
    "returnGeometry=false",
    "orderByFields=stocking_date",
    `resultOffset=${offset}`,
    `resultRecordCount=${PAGE_SIZE}`,
    "f=json",
  ];
  return `${STOCKING_TABLE_URL}/query?${params.join("&")}`;
}

function fetchPage(
  offset: number,
  sinceYear: number,
  collected: StockingApiRow[],
): Promise<readonly StockingApiRow[]> {
  return fetchJson<StockingApiResponse>(stockingQueryUrl(offset, sinceYear), {
    cacheKey: `stocking-${sinceYear}-${offset}`,
  }).then((page: StockingApiResponse): Promise<readonly StockingApiRow[]> => {
    if (page.error !== undefined) {
      return Promise.reject(
        new Error(`stocking api error: ${page.error.message ?? "unknown"}`),
      );
    }
    const rows: readonly StockingApiRow[] = (page.features ?? []).map(
      (feature: { readonly attributes: StockingApiRow }): StockingApiRow =>
        feature.attributes,
    );
    const next: StockingApiRow[] = collected.concat(rows);
    if (rows.length < PAGE_SIZE) {
      return Promise.resolve(next);
    }
    return fetchPage(offset + PAGE_SIZE, sinceYear, next);
  });
}

export function fetchStocking(
  sinceYear: number = EARLIEST_SEASON_YEAR,
): Promise<readonly StockingApiRow[]> {
  return fetchPage(0, sinceYear, []);
}
