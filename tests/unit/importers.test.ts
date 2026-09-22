import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from "../../importers/lib/arcgis";
import { numberField, queryUrl, stringField } from "../../importers/lib/arcgis";
import { parseCounties } from "../../importers/counties/parse";
import type { RawCounty } from "../../importers/counties/parse";
import {
  normalizeCounties,
  normalizePeninsula,
  titleCase,
} from "../../importers/counties/normalize";
import type { NormalizedCounty } from "../../importers/counties/normalize";
import { parseAll, parseWildlifeProperty } from "../../importers/public-lands/parse";
import type { RawLandParcel } from "../../importers/public-lands/parse";
import {
  cleanName,
  isPublishable,
  normalizePublicLands,
} from "../../importers/public-lands/normalize";
import type { NormalizedPublicLand } from "../../importers/public-lands/normalize";
import { collapseDuplicates, parseHarvestResponse } from "../../importers/harvest/parse";
import type { RawHarvestRow } from "../../importers/harvest/parse";
import { normalizeHarvestRows, unknownCounties } from "../../importers/harvest/normalize";
import type { NormalizedHarvestRow } from "../../importers/harvest/normalize";
import type { HarvestApiResponse } from "../../importers/harvest/fetch";

function loadFixture<T>(relativePath: string): T {
  const path: string = join(process.cwd(), "importers", relativePath);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("arcgis helpers", (): void => {
  it("builds a paged geojson query", (): void => {
    const url: string = queryUrl(
      { service: "Michigan_Counties", layerId: 0 },
      2000,
      true,
    );
    expect(url).toContain("/Michigan_Counties/FeatureServer/0/query");
    expect(url).toContain("resultOffset=2000");
    expect(url).toContain("f=geojson");
    expect(url).toContain("outSR=4326");
    expect(url).toContain("returnGeometry=true");
  });

  it("reads typed fields and rejects blanks", (): void => {
    const properties: Record<string, unknown> = { a: "  x  ", b: "   ", c: 4, d: "4" };
    expect(stringField(properties, "a")).toBe("x");
    expect(stringField(properties, "b")).toBeNull();
    expect(stringField(properties, "missing")).toBeNull();
    expect(numberField(properties, "c")).toBe(4);
    expect(numberField(properties, "d")).toBeNull();
  });
});

describe("counties importer", (): void => {
  const fixture: GeoJsonFeatureCollection = loadFixture<GeoJsonFeatureCollection>(
    "counties/fixtures/counties.geojson.json",
  );

  it("parses every feature that carries a name and peninsula", (): void => {
    const raws: readonly RawCounty[] = parseCounties(fixture.features);
    expect(raws.length).toBe(4);
  });

  it("title-cases names, slugs them and converts acres to square miles", (): void => {
    const normalized: readonly NormalizedCounty[] = normalizeCounties(
      parseCounties(fixture.features),
    );
    const kent: NormalizedCounty | undefined = normalized.find(
      (county: NormalizedCounty): boolean => county.slug === "kent",
    );
    expect(kent?.name).toBe("Kent");
    expect(kent?.areaSqMi).toBe(872);
    expect(kent?.peninsula).toBe("LP");
  });

  it("slugs a two-word county without the County suffix", (): void => {
    const normalized: readonly NormalizedCounty[] = normalizeCounties(
      parseCounties(fixture.features),
    );
    expect(
      normalized.some(
        (county: NormalizedCounty): boolean => county.slug === "grand-traverse",
      ),
    ).toBe(true);
  });

  it("drops a row whose peninsula code is not one the DNR publishes", (): void => {
    const normalized: readonly NormalizedCounty[] = normalizeCounties(
      parseCounties(fixture.features),
    );
    expect(normalized.length).toBe(3);
    expect(normalizePeninsula("XX")).toBeNull();
    expect(normalizePeninsula(" up ")).toBe("UP");
  });

  it("keeps a county with no geometry so the row is not silently lost", (): void => {
    const normalized: readonly NormalizedCounty[] = normalizeCounties(
      parseCounties(fixture.features),
    );
    const keweenaw: NormalizedCounty | undefined = normalized.find(
      (county: NormalizedCounty): boolean => county.slug === "keweenaw",
    );
    expect(keweenaw).toBeDefined();
    expect(keweenaw?.geometry).toBeNull();
  });

  it("title-cases hyphenated and multi-word names", (): void => {
    expect(titleCase("GRAND TRAVERSE")).toBe("Grand Traverse");
    expect(titleCase("ST. CLAIR")).toBe("St. Clair");
  });

  it("returns counties sorted by slug so the snapshot is deterministic", (): void => {
    const normalized: readonly NormalizedCounty[] = normalizeCounties(
      parseCounties(fixture.features),
    );
    const slugs: string[] = normalized.map(
      (county: NormalizedCounty): string => county.slug,
    );
    expect(slugs).toEqual([...slugs].sort());
  });
});

describe("public lands importer", (): void => {
  const fixture: GeoJsonFeatureCollection = loadFixture<GeoJsonFeatureCollection>(
    "public-lands/fixtures/parcels.geojson.json",
  );
  const parcels: readonly RawLandParcel[] = parseAll(
    fixture.features,
    parseWildlifeProperty,
  );

  it("strips the DNR's parenthetical working notes from a name", (): void => {
    expect(cleanName("Allegan State Game Area (north unit; general)")).toBe(
      "Allegan State Game Area",
    );
    expect(cleanName("Hillcrest State Game Area (owned but no show in MiHunt)")).toBe(
      "Hillcrest State Game Area",
    );
  });

  it("refuses parcels whose type is not a publishable DNR category", (): void => {
    const privateTract: RawLandParcel | undefined = parcels.find(
      (parcel: RawLandParcel): boolean => parcel.name === "Somewhere Private Tract",
    );
    expect(privateTract).toBeDefined();
    expect(isPublishable(privateTract as RawLandParcel)).toBe(false);
  });

  it("refuses a parcel whose name is itself a working note", (): void => {
    const temp: RawLandParcel | undefined = parcels.find(
      (parcel: RawLandParcel): boolean => parcel.name.startsWith("("),
    );
    expect(isPublishable(temp as RawLandParcel)).toBe(false);
  });

  it("dissolves parcels of one property into a single unit and sums acreage", (): void => {
    const lands: readonly NormalizedPublicLand[] = normalizePublicLands(parcels);
    const allegan: NormalizedPublicLand | undefined = lands.find(
      (land: NormalizedPublicLand): boolean => land.slug === "allegan-state-game-area",
    );
    expect(allegan).toBeDefined();
    expect(allegan?.geometries.length).toBe(2);
    expect(Math.round(allegan?.acres ?? 0)).toBe(55091);
    expect(allegan?.type).toBe("state_game_area");
    expect(allegan?.typeLabel).toBe("state game area");
  });

  it("drops a unit with no geometry, since the page could not clear its gate", (): void => {
    const lands: readonly NormalizedPublicLand[] = normalizePublicLands(parcels);
    expect(
      lands.some(
        (land: NormalizedPublicLand): boolean => land.slug === "no-geometry-game-area",
      ),
    ).toBe(false);
  });

  it("publishes only the two real units in the fixture", (): void => {
    expect(normalizePublicLands(parcels).length).toBe(1);
  });
});

describe("harvest importer", (): void => {
  const response: HarvestApiResponse = loadFixture<HarvestApiResponse>(
    "harvest/fixtures/harvest-2025.json",
  );

  it("throws with the API message rather than importing nothing silently", (): void => {
    const failure: HarvestApiResponse = loadFixture<HarvestApiResponse>(
      "harvest/fixtures/harvest-error.json",
    );
    expect((): readonly RawHarvestRow[] => parseHarvestResponse(failure, 2025)).toThrow(
      /An Error Occurred/,
    );
  });

  it("skips rows with no county name", (): void => {
    const rows: readonly RawHarvestRow[] = parseHarvestResponse(response, 2025);
    expect(rows.length).toBe(3);
  });

  it("merges multiple season rows for one county into a season total", (): void => {
    const merged: readonly RawHarvestRow[] = collapseDuplicates(
      parseHarvestResponse(response, 2025),
    );
    const calhoun: RawHarvestRow | undefined = merged.find(
      (row: RawHarvestRow): boolean => row.countyName === "Calhoun",
    );
    expect(merged.length).toBe(2);
    expect(calhoun?.total).toBe(5799);
    expect(calhoun?.antlered).toBe(2877);
  });

  it("slugs county names and flags closed seasons as final", (): void => {
    const known: ReadonlySet<string> = new Set<string>(["calhoun", "grand-traverse"]);
    const normalized: readonly NormalizedHarvestRow[] = normalizeHarvestRows(
      collapseDuplicates(parseHarvestResponse(response, 2025)),
      "deer",
      2026,
      known,
    );
    expect(normalized.length).toBe(2);
    expect(normalized.every((row: NormalizedHarvestRow): boolean => row.isFinal)).toBe(
      true,
    );
    expect(
      normalized.some(
        (row: NormalizedHarvestRow): boolean => row.countySlug === "grand-traverse",
      ),
    ).toBe(true);
  });

  it("marks the current license year as still in progress", (): void => {
    const known: ReadonlySet<string> = new Set<string>(["calhoun", "grand-traverse"]);
    const normalized: readonly NormalizedHarvestRow[] = normalizeHarvestRows(
      collapseDuplicates(parseHarvestResponse(response, 2025)),
      "deer",
      2025,
      known,
    );
    expect(normalized.every((row: NormalizedHarvestRow): boolean => !row.isFinal)).toBe(
      true,
    );
  });

  it("reports counties the database has never heard of instead of dropping them", (): void => {
    const known: ReadonlySet<string> = new Set<string>(["calhoun"]);
    const missing: readonly string[] = unknownCounties(
      collapseDuplicates(parseHarvestResponse(response, 2025)),
      known,
    );
    expect(missing).toEqual(["Grand Traverse"]);
  });
});

describe("fixture shape", (): void => {
  it("keeps every fixture parseable as a feature collection", (): void => {
    const counties: GeoJsonFeatureCollection = loadFixture<GeoJsonFeatureCollection>(
      "counties/fixtures/counties.geojson.json",
    );
    expect(counties.type).toBe("FeatureCollection");
    expect(
      counties.features.every(
        (feature: GeoJsonFeature): boolean => feature.type === "Feature",
      ),
    ).toBe(true);
  });
});
