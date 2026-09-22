import { postJson } from "../lib/http";

export const HARVEST_SUMMARY_URL: string =
  "https://www.mdnr-elicense.com/HarvestReportSummary/DeerHarvestReportSummary";

export const TURKEY_SUMMARY_URL: string =
  "https://www.mdnr-elicense.com/HarvestReportSummary/TurkeyHarvestReportSummary";

export type HarvestSource = {
  readonly speciesSlug: string;
  readonly url: string;
  readonly firstYear: number;
  readonly hasAntlerSplit: boolean;
};

export const HARVEST_SOURCES: readonly HarvestSource[] = [
  {
    speciesSlug: "deer",
    url: HARVEST_SUMMARY_URL,
    firstYear: 2022,
    hasAntlerSplit: true,
  },
  {
    speciesSlug: "turkey",
    url: TURKEY_SUMMARY_URL,
    firstYear: 2026,
    hasAntlerSplit: false,
  },
];

export const HARVEST_PAGE_URL: string =
  "https://www.mdnr-elicense.com/HarvestReportSummary";

export const AREA_ID_COUNTY: string = "1";

export type HarvestApiRow = {
  readonly AreaUnit: string;
  readonly AntleredCount?: number;
  readonly AntlerlessCount?: number;
  readonly TotalCount: number;
  readonly LicenseYear: number;
  readonly HuntingSeason?: string | null;
  readonly HuntSeason?: string | null;
  readonly ReportDateTimeFormatted: string;
};

export type HarvestApiResponse = {
  readonly Success: boolean;
  readonly Message?: string;
  readonly Result?: readonly HarvestApiRow[];
};

export function fetchHarvestYear(
  licenseYear: number,
  url: string = HARVEST_SUMMARY_URL,
): Promise<HarvestApiResponse> {
  return postJson<HarvestApiResponse>(url, {
    LicenseYear: String(licenseYear),
    AreaId: AREA_ID_COUNTY,
  });
}
