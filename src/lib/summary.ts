import { formatCount, formatLongDate, joinList, percentChange } from "./format";
import type { PercentChange } from "./format";

export function variantIndex(seed: string, optionCount: number): number {
  let hash: number = 7;
  for (let index: number = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return hash % optionCount;
}

export function pickVariant(seed: string, options: readonly string[]): string {
  if (options.length === 0) {
    throw new Error("pickVariant requires at least one option");
  }
  return options[variantIndex(seed, options.length)] as string;
}

export type HarvestSummaryInput = {
  readonly countyName: string;
  readonly speciesLabel: string;
  readonly seasonYear: number;
  readonly total: number;
  readonly priorTotal: number | null;
  readonly priorYear: number | null;
  readonly asOfDate: string;
  readonly isFinal: boolean;
};

export function harvestSummary(input: HarvestSummaryInput): string {
  const change: PercentChange | null =
    input.priorTotal !== null ? percentChange(input.total, input.priorTotal) : null;
  const comparison: string =
    change !== null && input.priorYear !== null
      ? ` That is ${change.text} the ${input.priorYear} season total of ${formatCount(input.priorTotal as number)}.`
      : "";
  const qualifier: string = input.isFinal
    ? `the ${input.seasonYear} season`
    : `the ${input.seasonYear} season so far`;
  const lead: string = pickVariant(
    `${input.countyName}-${input.speciesLabel}-${input.seasonYear}`,
    [
      `Hunters reported ${formatCount(input.total)} ${input.speciesLabel} in ${input.countyName} County during ${qualifier}.`,
      `${input.countyName} County hunters reported ${formatCount(input.total)} ${input.speciesLabel} during ${qualifier}.`,
    ],
  );
  const attribution: string = ` Figures come from Michigan DNR harvest reporting, current as of ${formatLongDate(input.asOfDate)}.`;
  return `${lead}${comparison}${attribution}`;
}

export type CountySummaryInput = {
  readonly countyName: string;
  readonly lakeCount: number;
  readonly publicLandAcres: number | null;
  readonly accessSiteCount: number;
  readonly latestHarvestTotal: number | null;
  readonly latestHarvestYear: number | null;
  readonly latestHarvestSpecies: string | null;
  readonly asOfDate: string;
};

export function countySummary(input: CountySummaryInput): string {
  const parts: string[] = [];
  const inventory: string[] = [];
  if (input.lakeCount > 0) {
    inventory.push(`${formatCount(input.lakeCount)} inland lakes with DNR records`);
  }
  if (input.publicLandAcres !== null && input.publicLandAcres > 0) {
    inventory.push(
      `${formatCount(Math.round(input.publicLandAcres))} acres of public land`,
    );
  }
  if (input.accessSiteCount > 0) {
    inventory.push(`${formatCount(input.accessSiteCount)} public access sites`);
  }
  if (inventory.length > 0) {
    parts.push(`${input.countyName} County, Michigan has ${joinList(inventory)}.`);
  }
  if (
    input.latestHarvestTotal !== null &&
    input.latestHarvestYear !== null &&
    input.latestHarvestSpecies !== null
  ) {
    parts.push(
      `Hunters reported ${formatCount(input.latestHarvestTotal)} ${input.latestHarvestSpecies} in the county during the ${input.latestHarvestYear} season.`,
    );
  }
  parts.push(
    `All figures on this page come from Michigan DNR open data, last updated ${formatLongDate(input.asOfDate)}.`,
  );
  return parts.join(" ");
}

export type LakeSummaryInput = {
  readonly lakeName: string;
  readonly countyName: string;
  readonly acres: number | null;
  readonly maxDepthFt: number | null;
  readonly stockedSpecies: readonly string[];
  readonly lastStockedOn: string | null;
  readonly accessSiteCount: number;
  readonly asOfDate: string;
};

export function lakeSummary(input: LakeSummaryInput): string {
  const parts: string[] = [];
  const size: string =
    input.acres !== null ? `${formatCount(Math.round(input.acres))}-acre ` : "";
  const depth: string =
    input.maxDepthFt !== null
      ? ` It reaches a maximum depth of ${formatCount(Math.round(input.maxDepthFt))} feet.`
      : "";
  parts.push(
    `${input.lakeName} is a ${size}lake in ${input.countyName} County, Michigan.${depth}`,
  );
  if (input.stockedSpecies.length > 0 && input.lastStockedOn !== null) {
    parts.push(
      `The Michigan DNR has stocked it with ${joinList(input.stockedSpecies)}, most recently on ${formatLongDate(input.lastStockedOn)}.`,
    );
  }
  if (input.accessSiteCount > 0) {
    parts.push(
      `${formatCount(input.accessSiteCount)} public access ${input.accessSiteCount === 1 ? "site serves" : "sites serve"} the lake.`,
    );
  }
  parts.push(`Data current as of ${formatLongDate(input.asOfDate)}.`);
  return parts.join(" ");
}

export type PublicLandSummaryInput = {
  readonly name: string;
  readonly typeLabel: string;
  readonly acres: number | null;
  readonly countyNames: readonly string[];
  readonly managingAgency: string;
  readonly asOfDate: string;
};

export function publicLandSummary(input: PublicLandSummaryInput): string {
  const acreage: string =
    input.acres !== null ? `${formatCount(Math.round(input.acres))}-acre ` : "";
  const counties: string =
    input.countyNames.length > 0
      ? ` in ${joinList(input.countyNames.map((name: string): string => `${name} County`))}`
      : "";
  return [
    `${input.name} is a ${acreage}${input.typeLabel}${counties}, managed by ${input.managingAgency}.`,
    `Boundary and acreage data come from Michigan DNR open data, last updated ${formatLongDate(input.asOfDate)}.`,
  ].join(" ");
}
