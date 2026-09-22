import {
  getAccessSites,
  getCounties,
  getHarvestSnapshots,
  getLakes,
  getPublicLands,
  getStockingEvents,
} from "./data/snapshot";
import type {
  AccessSite,
  County,
  HarvestSnapshot,
  Lake,
  PublicLand,
  StockingEvent,
} from "./data/schemas";

export type DownloadRow = Readonly<Record<string, string | number | null>>;

export type DownloadSpec = {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly csvPath: string;
  readonly jsonPath: string;
  readonly sourceUrl: string;
  readonly columns: readonly string[];
  readonly rows: () => readonly DownloadRow[];
};

function text(value: string | null): string | null {
  return value;
}

export const DOWNLOADS: readonly DownloadSpec[] = [
  {
    key: "counties",
    label: "Michigan counties",
    description:
      "All Michigan counties with peninsula grouping, land area and centroid coordinates.",
    csvPath: "/downloads/counties.csv",
    jsonPath: "/downloads/counties.json",
    sourceUrl: "https://gis-michigan.opendata.arcgis.com/",
    columns: ["slug", "name", "peninsula", "area_sq_mi", "lat", "lng", "updated_at"],
    rows: (): readonly DownloadRow[] =>
      getCounties().map((county: County): DownloadRow => ({
        slug: county.slug,
        name: county.name,
        peninsula: county.peninsula,
        area_sq_mi: county.areaSqMi,
        lat: county.centroid === null ? null : county.centroid.lat,
        lng: county.centroid === null ? null : county.centroid.lng,
        updated_at: county.updatedAt,
      })),
  },
  {
    key: "harvest-by-county",
    label: "Reported harvest by county",
    description:
      "Reported harvest totals by county, species and season year, with the snapshot date each figure was read on.",
    csvPath: "/downloads/harvest-by-county.csv",
    jsonPath: "/downloads/harvest-by-county.json",
    sourceUrl: "https://www.michigan.gov/dnr",
    columns: [
      "county_slug",
      "species_slug",
      "season_year",
      "antlered",
      "antlerless",
      "total",
      "snapshot_date",
      "is_final",
    ],
    rows: (): readonly DownloadRow[] =>
      getHarvestSnapshots().map((row: HarvestSnapshot): DownloadRow => ({
        county_slug: row.countySlug,
        species_slug: row.speciesSlug,
        season_year: row.seasonYear,
        antlered: row.antlered,
        antlerless: row.antlerless,
        total: row.total,
        snapshot_date: row.snapshotDate,
        is_final: row.isFinal ? "true" : "false",
      })),
  },
  {
    key: "stocking-events",
    label: "Fish stocking events",
    description:
      "Michigan DNR fish stocking records by water, species, strain, count and date.",
    csvPath: "/downloads/stocking-events.csv",
    jsonPath: "/downloads/stocking-events.json",
    sourceUrl: "https://www.michigandnr.com/fishstock/",
    columns: [
      "water_name",
      "water_type",
      "county_slug",
      "species_slug",
      "strain",
      "count",
      "avg_length_in",
      "stocked_on",
    ],
    rows: (): readonly DownloadRow[] =>
      getStockingEvents().map((event: StockingEvent): DownloadRow => ({
        water_name: event.waterName,
        water_type: event.waterType,
        county_slug: event.countySlug,
        species_slug: event.speciesSlug,
        strain: text(event.strain),
        count: event.count,
        avg_length_in: event.avgLengthIn,
        stocked_on: event.stockedOn,
      })),
  },
  {
    key: "access-sites",
    label: "Public access sites",
    description:
      "Boating access and fishing access sites with coordinates, county and amenities.",
    csvPath: "/downloads/access-sites.csv",
    jsonPath: "/downloads/access-sites.json",
    sourceUrl: "https://gis-midnr.opendata.arcgis.com/",
    columns: ["slug", "name", "type", "county_slug", "lake_slug", "lat", "lng"],
    rows: (): readonly DownloadRow[] =>
      getAccessSites().map((site: AccessSite): DownloadRow => ({
        slug: site.slug,
        name: site.name,
        type: site.type,
        county_slug: site.countySlug,
        lake_slug: text(site.lakeSlug),
        lat: site.coordinate.lat,
        lng: site.coordinate.lng,
      })),
  },
  {
    key: "public-lands",
    label: "Public land units",
    description:
      "State game areas, state forests, national forests and other public hunting land with acreage.",
    csvPath: "/downloads/public-lands.csv",
    jsonPath: "/downloads/public-lands.json",
    sourceUrl: "https://gis-midnr.opendata.arcgis.com/",
    columns: ["slug", "name", "type", "acres", "managing_agency", "counties"],
    rows: (): readonly DownloadRow[] =>
      getPublicLands().map((land: PublicLand): DownloadRow => ({
        slug: land.slug,
        name: land.name,
        type: land.type,
        acres: land.acres,
        managing_agency: land.managingAgency,
        counties: land.countySlugs.join("|"),
      })),
  },
  {
    key: "lakes",
    label: "Inland lakes",
    description:
      "Inland lakes with county, acreage, maximum depth where known and the official DNR map link.",
    csvPath: "/downloads/lakes.csv",
    jsonPath: "/downloads/lakes.json",
    sourceUrl: "https://www.michigan.gov/dnr",
    columns: ["slug", "name", "county_slug", "acres", "max_depth_ft", "dnr_map_url"],
    rows: (): readonly DownloadRow[] =>
      getLakes().map((lake: Lake): DownloadRow => ({
        slug: lake.slug,
        name: lake.name,
        county_slug: lake.countySlug,
        acres: lake.acres,
        max_depth_ft: lake.maxDepthFt,
        dnr_map_url: text(lake.dnrMapUrl),
      })),
  },
];

export function csvEscape(value: string | number | null): string {
  if (value === null) {
    return "";
  }
  const asText: string = String(value);
  return /[",\n]/.test(asText) ? `"${asText.replace(/"/g, '""')}"` : asText;
}

export function toCsv(spec: DownloadSpec): string {
  const header: string = spec.columns.join(",");
  const lines: string[] = spec
    .rows()
    .map((row: DownloadRow): string =>
      spec.columns
        .map((column: string): string => csvEscape(row[column] ?? null))
        .join(","),
    );
  return [header, ...lines].join("\n") + "\n";
}
