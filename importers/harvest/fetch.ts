import { postJson } from "../lib/http";

export const HARVEST_SUMMARY_URL: string =
  "https://www.mdnr-elicense.com/HarvestReportSummary/DeerHarvestReportSummary";

export const HARVEST_PAGE_URL: string =
  "https://www.mdnr-elicense.com/HarvestReportSummary";

export const AREA_ID_COUNTY: string = "1";

export type HarvestApiRow = {
  readonly AreaUnit: string;
  readonly AntleredCount: number;
  readonly AntlerlessCount: number;
  readonly TotalCount: number;
  readonly LicenseYear: number;
  readonly HuntingSeason: string | null;
  readonly ReportDateTimeFormatted: string;
};

export type HarvestApiResponse = {
  readonly Success: boolean;
  readonly Message?: string;
  readonly Result?: readonly HarvestApiRow[];
};

export function fetchHarvestYear(licenseYear: number): Promise<HarvestApiResponse> {
  return postJson<HarvestApiResponse>(HARVEST_SUMMARY_URL, {
    LicenseYear: String(licenseYear),
    AreaId: AREA_ID_COUNTY,
  });
}
