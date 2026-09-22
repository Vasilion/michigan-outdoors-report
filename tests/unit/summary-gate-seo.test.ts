import { describe, expect, it } from "vitest";
import {
  countySummary,
  harvestSummary,
  lakeSummary,
  pickVariant,
  publicLandSummary,
} from "../../src/lib/summary";
import {
  countyGate,
  countySpeciesFishingGate,
  countySpeciesHuntingGate,
  directoryIndexGate,
  lakeGate,
  publicLandGate,
  summarizeBuildReport,
} from "../../src/lib/quality-gate";
import type { BuildReport, GateResult } from "../../src/lib/quality-gate";
import { DESCRIPTION_MAX, buildMetadata, truncateAtWord } from "../../src/lib/seo";
import { absoluteUrl } from "../../src/lib/site";

describe("answer-first summaries", (): void => {
  it("states the number, the period and the source in one sentence", (): void => {
    const text: string = harvestSummary({
      countyName: "Alcona",
      speciesLabel: "deer",
      seasonYear: 2025,
      total: 3120,
      priorTotal: 2860,
      priorYear: 2024,
      asOfDate: "2026-02-01",
      isFinal: true,
    });
    expect(text).toContain("3,120");
    expect(text).toContain("2025 season");
    expect(text).toContain("up 9.1% from");
    expect(text).toContain("2,860");
    expect(text).toContain("Michigan DNR");
    expect(text).toContain("February 1, 2026");
  });

  it("omits the comparison when there is no prior season", (): void => {
    const text: string = harvestSummary({
      countyName: "Kent",
      speciesLabel: "turkeys",
      seasonYear: 2025,
      total: 410,
      priorTotal: null,
      priorYear: null,
      asOfDate: "2026-06-01",
      isFinal: false,
    });
    expect(text).toContain("so far");
    expect(text).not.toContain("That is");
  });

  it("varies phrasing deterministically by seed", (): void => {
    const options: readonly string[] = ["a", "b", "c"];
    expect(pickVariant("alcona-deer-2025", options)).toBe(
      pickVariant("alcona-deer-2025", options),
    );
  });

  it("leaves out sections with no data", (): void => {
    const text: string = countySummary({
      countyName: "Baraga",
      lakeCount: 0,
      publicLandAcres: null,
      accessSiteCount: 0,
      latestHarvestTotal: null,
      latestHarvestYear: null,
      latestHarvestSpecies: null,
      asOfDate: "2026-09-01",
    });
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
    expect(text).toContain("September 1, 2026");
  });

  it("writes a lake summary with acreage, stocking and access", (): void => {
    const text: string = lakeSummary({
      lakeName: "Houghton Lake",
      countyName: "Roscommon",
      acres: 20044,
      maxDepthFt: 22,
      stockedSpecies: ["walleye", "northern pike"],
      lastStockedOn: "2026-05-14",
      accessSiteCount: 3,
      asOfDate: "2026-09-01",
    });
    expect(text).toContain("20,044-acre");
    expect(text).toContain("walleye and northern pike");
    expect(text).toContain("May 14, 2026");
    expect(text).toContain("3 public access sites serve");
  });

  it("writes a public land summary", (): void => {
    const text: string = publicLandSummary({
      name: "Gladwin Field Trial Area",
      typeLabel: "state game area",
      acres: 5000,
      countyNames: ["Gladwin"],
      managingAgency: "Michigan DNR",
      asOfDate: "2026-08-01",
    });
    expect(text).toContain("5,000-acre state game area in Gladwin County");
  });
});

describe("quality gates", (): void => {
  it("publishes a lake with stocking and acreage", (): void => {
    const gate: GateResult = lakeGate({
      stockingEvents: 4,
      accessSites: 0,
      hasDnrMapUrl: false,
      acres: 220,
      hasGeometry: false,
    });
    expect(gate.indexed).toBe(true);
  });

  it("gates a lake with a name and nothing else", (): void => {
    const gate: GateResult = lakeGate({
      stockingEvents: 0,
      accessSites: 0,
      hasDnrMapUrl: false,
      acres: null,
      hasGeometry: false,
    });
    expect(gate.indexed).toBe(false);
    expect(gate.reasons.length).toBe(2);
  });

  it("requires two seasons of harvest for a county and species page", (): void => {
    expect(countySpeciesHuntingGate({ harvestSeasons: 1 }).indexed).toBe(false);
    expect(countySpeciesHuntingGate({ harvestSeasons: 2 }).indexed).toBe(true);
  });

  it("requires stocking for a county and fish species page", (): void => {
    expect(
      countySpeciesFishingGate({ stockingEvents: 0, watersWithSpecies: 3 }).indexed,
    ).toBe(false);
    expect(
      countySpeciesFishingGate({ stockingEvents: 5, watersWithSpecies: 1 }).indexed,
    ).toBe(true);
  });

  it("requires geometry and acreage for public land", (): void => {
    expect(publicLandGate({ hasGeometry: true, acres: null }).indexed).toBe(false);
    expect(publicLandGate({ hasGeometry: true, acres: 1200 }).indexed).toBe(true);
  });

  it("keeps a county hub with any inventory", (): void => {
    expect(
      countyGate({
        hasGeometry: true,
        areaSqMi: 600,
        lakeCount: 0,
        publicLandCount: 2,
        harvestSeasons: 0,
      }).indexed,
    ).toBe(true);
  });

  it("gates an empty directory index", (): void => {
    expect(directoryIndexGate({ listingCount: 0 }).indexed).toBe(false);
  });

  it("totals a build report", (): void => {
    const report: BuildReport = summarizeBuildReport("2026-09-22", [
      { template: "lake", generated: 10, indexed: 7, gated: 3, gatedExamples: [] },
      { template: "county", generated: 83, indexed: 83, gated: 0, gatedExamples: [] },
    ]);
    expect(report.totalIndexed).toBe(90);
    expect(report.totalGated).toBe(3);
  });
});

describe("seo metadata", (): void => {
  it("truncates on a word boundary", (): void => {
    expect(truncateAtWord("short", 20)).toBe("short");
    expect(truncateAtWord("a".repeat(30), 10).length).toBeLessThanOrEqual(10);
    expect(truncateAtWord("Michigan deer harvest totals by county", 20)).toContain("…");
  });

  it("builds a canonical url with a trailing slash", (): void => {
    expect(absoluteUrl("/county/alcona")).toMatch(/\/county\/alcona\/$/);
    expect(absoluteUrl("/downloads/lakes.csv")).toMatch(/\/downloads\/lakes\.csv$/);
  });

  it("marks gated pages noindex and keeps the canonical off them", (): void => {
    const gated: ReturnType<typeof buildMetadata> = buildMetadata({
      title: "Gated page",
      description: "A page that did not clear the data threshold.",
      path: "/lake/kent/nowhere/",
      indexable: false,
    });
    expect(gated.robots).toEqual({ index: false, follow: true });
  });

  it("clamps the description to the meta budget", (): void => {
    const long: string = "Michigan lake stocking records. ".repeat(20);
    const meta: ReturnType<typeof buildMetadata> = buildMetadata({
      title: "Long",
      description: long,
      path: "/",
      indexable: true,
    });
    expect((meta.description as string).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});
