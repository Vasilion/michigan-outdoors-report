import { describe, expect, it } from "vitest";
import {
  checkCoordinateInMichigan,
  checkCountyCount,
  checkDuplicateSlugs,
  checkReferences,
  checkWaterCountyPairs,
  errorsOnly,
  runIntegrityChecks,
} from "../../src/lib/data/integrity";
import type { Issue, SnapshotBundle } from "../../src/lib/data/integrity";
import { loadBundle } from "../../src/lib/data/bundle";
import {
  countiesFileSchema,
  harvestSnapshotsFileSchema,
  lakesFileSchema,
  metaSchema,
} from "../../src/lib/data/schemas";
import { readSnapshot } from "../../src/lib/data/snapshot";
import type { County, Lake } from "../../src/lib/data/schemas";

const EMPTY: SnapshotBundle = {
  counties: [],
  species: [],
  lakes: [],
  publicLands: [],
  accessSites: [],
  stockingEvents: [],
  harvestSnapshots: [],
  seasons: [],
  directoryListings: [],
};

function county(slug: string): County {
  return {
    name: slug,
    slug,
    peninsula: "LP",
    areaSqMi: 500,
    centroid: { lat: 44.5, lng: -85.5 },
    neighborSlugs: [],
    sourceUrl: "https://gis-michigan.opendata.arcgis.com/",
    updatedAt: "2026-09-01",
  };
}

function lake(slug: string, countySlug: string): Lake {
  return {
    name: slug,
    slug,
    countySlug,
    peninsula: "LP",
    acres: 100,
    maxDepthFt: null,
    centroid: null,
    dnrMapUrl: null,
    hasSpecialRegs: false,
    sourceUrl: "https://www.michigan.gov/dnr",
    updatedAt: "2026-09-01",
  };
}

describe("integrity primitives", (): void => {
  it("warns rather than fails when the county table has not been imported", (): void => {
    const issues: readonly Issue[] = checkCountyCount([]);
    expect(issues.length).toBe(1);
    expect(issues[0]?.level).toBe("warning");
  });

  it("fails when the county count is not 83", (): void => {
    const issues: readonly Issue[] = checkCountyCount([county("alcona")]);
    expect(errorsOnly(issues).length).toBe(1);
  });

  it("detects duplicate slugs", (): void => {
    expect(checkDuplicateSlugs("lake", ["a", "b", "a"]).length).toBe(1);
    expect(checkDuplicateSlugs("lake", ["a", "b"]).length).toBe(0);
  });

  it("rejects coordinates outside Michigan", (): void => {
    expect(checkCoordinateInMichigan("site", 44.2, -85.1).length).toBe(0);
    expect(checkCoordinateInMichigan("site", 39.9, -75.1).length).toBe(1);
  });

  it("detects dangling references", (): void => {
    const known: ReadonlySet<string> = new Set<string>(["kent"]);
    expect(checkReferences("lake.countySlug", ["kent"], known).length).toBe(0);
    expect(checkReferences("lake.countySlug", ["ottawa"], known).length).toBe(1);
  });

  it("refuses a water reference that points at another county's lake of the same name", (): void => {
    const lakeKeys: ReadonlySet<string> = new Set<string>([
      "cheboygan::silver-lake",
      "washtenaw::silver-lake",
    ]);
    expect(
      checkWaterCountyPairs(
        "stockingEvent",
        [{ lakeCountySlug: "cheboygan", lakeSlug: "silver-lake" }],
        lakeKeys,
      ).length,
    ).toBe(0);
    expect(
      checkWaterCountyPairs(
        "stockingEvent",
        [{ lakeCountySlug: "kent", lakeSlug: "silver-lake" }],
        lakeKeys,
      ).length,
    ).toBe(1);
    expect(
      checkWaterCountyPairs(
        "accessSite",
        [{ lakeCountySlug: null, lakeSlug: "silver-lake" }],
        lakeKeys,
      ).length,
    ).toBe(1);
  });

  it("flags a lake whose county does not exist", (): void => {
    const issues: readonly Issue[] = runIntegrityChecks({
      ...EMPTY,
      counties: [county("kent")],
      lakes: [lake("long-lake", "ottawa")],
    });
    expect(
      errorsOnly(issues).some((issue: Issue): boolean =>
        issue.message.includes("ottawa"),
      ),
    ).toBe(true);
  });
});

describe("committed snapshot", (): void => {
  it("parses against the zod schemas", (): void => {
    expect((): unknown => readSnapshot("meta.json", metaSchema)).not.toThrow();
    expect((): unknown =>
      readSnapshot("counties.json", countiesFileSchema),
    ).not.toThrow();
    expect((): unknown => readSnapshot("lakes.json", lakesFileSchema)).not.toThrow();
    expect((): unknown =>
      readSnapshot("harvest-snapshots.json", harvestSnapshotsFileSchema),
    ).not.toThrow();
  });

  it("has no integrity errors", (): void => {
    expect(errorsOnly(runIntegrityChecks(loadBundle())).length).toBe(0);
  });
});
