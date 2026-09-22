export type GateResult = {
  readonly indexed: boolean;
  readonly reasons: readonly string[];
};

export type TemplateName =
  | "home"
  | "county"
  | "county-species-hunting"
  | "county-species-fishing"
  | "lake"
  | "river"
  | "public-land"
  | "species-hub"
  | "seasons"
  | "directory-category"
  | "directory-category-county"
  | "directory-listing"
  | "editorial";

const PASS: GateResult = { indexed: true, reasons: [] };

function fail(reasons: readonly string[]): GateResult {
  return { indexed: false, reasons };
}

export type CountyGateInput = {
  readonly hasGeometry: boolean;
  readonly areaSqMi: number | null;
  readonly lakeCount: number;
  readonly publicLandCount: number;
  readonly harvestSeasons: number;
};

export function countyGate(input: CountyGateInput): GateResult {
  const reasons: string[] = [];
  if (!input.hasGeometry && input.areaSqMi === null) {
    reasons.push("no geometry or area");
  }
  if (
    input.lakeCount === 0 &&
    input.publicLandCount === 0 &&
    input.harvestSeasons === 0
  ) {
    reasons.push("no lakes, public land, or harvest data");
  }
  return reasons.length === 0 ? PASS : fail(reasons);
}

export type CountySpeciesHuntingGateInput = {
  readonly harvestSeasons: number;
};

export function countySpeciesHuntingGate(
  input: CountySpeciesHuntingGateInput,
): GateResult {
  return input.harvestSeasons >= 2
    ? PASS
    : fail([`harvest data for ${input.harvestSeasons} season(s), need 2`]);
}

export type CountySpeciesFishingGateInput = {
  readonly stockingEvents: number;
  readonly watersWithSpecies: number;
};

export function countySpeciesFishingGate(
  input: CountySpeciesFishingGateInput,
): GateResult {
  return input.stockingEvents > 0 && input.watersWithSpecies > 0
    ? PASS
    : fail(["no stocking records for this species in this county"]);
}

export type LakeGateInput = {
  readonly stockingEvents: number;
  readonly accessSites: number;
  readonly hasDnrMapUrl: boolean;
  readonly acres: number | null;
  readonly hasGeometry: boolean;
};

export function lakeGate(input: LakeGateInput): GateResult {
  const reasons: string[] = [];
  const hasContent: boolean =
    input.stockingEvents > 0 || input.accessSites > 0 || input.hasDnrMapUrl;
  if (!hasContent) {
    reasons.push("no stocking records, access sites, or DNR map link");
  }
  if (input.acres === null && !input.hasGeometry) {
    reasons.push("no acreage or geometry");
  }
  return reasons.length === 0 ? PASS : fail(reasons);
}

export type RiverGateInput = {
  readonly accessSites: number;
  readonly stockingEvents: number;
  readonly countyCount: number;
};

export function riverGate(input: RiverGateInput): GateResult {
  const hasContent: boolean = input.accessSites > 0 || input.stockingEvents > 0;
  const reasons: string[] = [];
  if (!hasContent) {
    reasons.push("no access sites or stocking records");
  }
  if (input.countyCount === 0) {
    reasons.push("not linked to any county");
  }
  return reasons.length === 0 ? PASS : fail(reasons);
}

export type PublicLandGateInput = {
  readonly hasGeometry: boolean;
  readonly acres: number | null;
};

export function publicLandGate(input: PublicLandGateInput): GateResult {
  const reasons: string[] = [];
  if (!input.hasGeometry) {
    reasons.push("no geometry");
  }
  if (input.acres === null) {
    reasons.push("no acreage");
  }
  return reasons.length === 0 ? PASS : fail(reasons);
}

export type DirectoryIndexGateInput = {
  readonly listingCount: number;
};

export function directoryIndexGate(input: DirectoryIndexGateInput): GateResult {
  return input.listingCount > 0
    ? PASS
    : fail(["no listings in this category and county"]);
}

export type BuildReportRow = {
  readonly template: TemplateName;
  readonly generated: number;
  readonly indexed: number;
  readonly gated: number;
  readonly gatedExamples: readonly string[];
};

export type BuildReport = {
  readonly generatedAt: string;
  readonly rows: readonly BuildReportRow[];
  readonly totalIndexed: number;
  readonly totalGated: number;
};

export function summarizeBuildReport(
  generatedAt: string,
  rows: readonly BuildReportRow[],
): BuildReport {
  const totalIndexed: number = rows.reduce(
    (sum: number, row: BuildReportRow): number => sum + row.indexed,
    0,
  );
  const totalGated: number = rows.reduce(
    (sum: number, row: BuildReportRow): number => sum + row.gated,
    0,
  );
  return { generatedAt, rows, totalIndexed, totalGated };
}
