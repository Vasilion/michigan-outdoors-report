import { accessSitesByLake, groupBy, stockingByLake, waterKey } from "../data/aggregate";
import {
  findCounty,
  getAccessSites,
  getLakes,
  getMeta,
  getSpecies,
  getStockingEvents,
} from "../data/snapshot";
import type { AccessSite, County, Lake, Species, StockingEvent } from "../data/schemas";
import { lakeGate } from "../quality-gate";
import type { GateResult } from "../quality-gate";

export function stockingKey(countySlug: string, speciesSlug: string): string {
  return `${countySlug}::${speciesSlug}`;
}

export function stockingByCountySpecies(): Map<string, StockingEvent[]> {
  const placed: StockingEvent[] = getStockingEvents().filter(
    (event: StockingEvent): boolean => event.countySlug !== null,
  );
  return groupBy(placed, (event: StockingEvent): string =>
    stockingKey(event.countySlug as string, event.speciesSlug),
  );
}

export function stockingBySpecies(): Map<string, StockingEvent[]> {
  return groupBy(
    getStockingEvents(),
    (event: StockingEvent): string => event.speciesSlug,
  );
}

export type SpeciesYearTotal = {
  readonly year: number;
  readonly count: number;
};

export function totalsByYear(
  events: readonly StockingEvent[],
): readonly SpeciesYearTotal[] {
  const totals: Map<number, number> = new Map<number, number>();
  for (const event of events) {
    const year: number = Number(event.stockedOn.slice(0, 4));
    totals.set(year, (totals.get(year) ?? 0) + event.count);
  }
  return [...totals.entries()]
    .map(([year, count]: [number, number]): SpeciesYearTotal => ({ year, count }))
    .sort((a: SpeciesYearTotal, b: SpeciesYearTotal): number => a.year - b.year);
}

export function totalFish(events: readonly StockingEvent[]): number {
  return events.reduce(
    (total: number, event: StockingEvent): number => total + event.count,
    0,
  );
}

export function speciesInEvents(events: readonly StockingEvent[]): readonly string[] {
  return [
    ...new Set(events.map((event: StockingEvent): string => event.speciesSlug)),
  ].sort();
}

export type LakeView = {
  readonly lake: Lake;
  readonly county: County;
  readonly stocking: readonly StockingEvent[];
  readonly accessSites: readonly AccessSite[];
  readonly speciesStocked: readonly Species[];
  readonly lastStockedOn: string | null;
  readonly nearbyLakes: readonly Lake[];
  readonly dataDate: string;
  readonly lastUpdated: string;
};

export function lakeGateFor(lake: Lake): GateResult {
  const key: string = waterKey(lake.countySlug, lake.slug);
  const stocking: readonly StockingEvent[] = stockingByLake().get(key) ?? [];
  const sites: readonly AccessSite[] = accessSitesByLake().get(key) ?? [];
  return lakeGate({
    stockingEvents: stocking.length,
    accessSites: sites.length,
    hasDnrMapUrl: lake.dnrMapUrl !== null,
    acres: lake.acres,
    hasGeometry: lake.centroid !== null,
  });
}

function distanceMiles(a: Lake, b: Lake): number {
  if (a.centroid === null || b.centroid === null) {
    return Number.POSITIVE_INFINITY;
  }
  const latDelta: number = (a.centroid.lat - b.centroid.lat) * 69;
  const lngDelta: number = (a.centroid.lng - b.centroid.lng) * 48;
  return Math.sqrt(latDelta * latDelta + lngDelta * lngDelta);
}

export function buildLakeView(countySlug: string, lakeSlug: string): LakeView | null {
  const lake: Lake | undefined = getLakes().find(
    (entry: Lake): boolean => entry.slug === lakeSlug && entry.countySlug === countySlug,
  );
  if (lake === undefined) {
    return null;
  }
  const county: County | null = findCounty(countySlug);
  if (county === null) {
    return null;
  }
  const stocking: readonly StockingEvent[] = [
    ...(stockingByLake().get(waterKey(lake.countySlug, lake.slug)) ?? []),
  ].sort((a: StockingEvent, b: StockingEvent): number =>
    b.stockedOn.localeCompare(a.stockedOn),
  );
  const sites: readonly AccessSite[] =
    accessSitesByLake().get(waterKey(lake.countySlug, lake.slug)) ?? [];
  const speciesSlugs: readonly string[] = speciesInEvents(stocking);
  const speciesStocked: Species[] = [];
  for (const slug of speciesSlugs) {
    const species: Species | undefined = getSpecies().find(
      (entry: Species): boolean => entry.slug === slug,
    );
    if (species !== undefined) {
      speciesStocked.push(species);
    }
  }
  const nearby: Lake[] = getLakes()
    .filter(
      (entry: Lake): boolean =>
        entry.slug !== lake.slug &&
        entry.centroid !== null &&
        distanceMiles(lake, entry) <= 15 &&
        lakeGateFor(entry).indexed,
    )
    .sort((a: Lake, b: Lake): number => distanceMiles(lake, a) - distanceMiles(lake, b))
    .slice(0, 8);

  const dates: string[] = [
    lake.updatedAt,
    ...stocking.map((event: StockingEvent): string => event.stockedOn),
    ...sites.map((site: AccessSite): string => site.updatedAt),
  ].sort();

  return {
    lake,
    county,
    stocking,
    accessSites: [...sites].sort((a: AccessSite, b: AccessSite): number =>
      a.name.localeCompare(b.name),
    ),
    speciesStocked,
    lastStockedOn: stocking[0]?.stockedOn ?? null,
    nearbyLakes: nearby,
    dataDate: getMeta().generatedAt.slice(0, 10),
    lastUpdated: dates[dates.length - 1] ?? lake.updatedAt,
  };
}

export function lakesWithPages(): readonly Lake[] {
  return getLakes().filter((lake: Lake): boolean => lakeGateFor(lake).indexed);
}

export function accessSitesByCountySlug(): Map<string, AccessSite[]> {
  return groupBy(getAccessSites(), (site: AccessSite): string => site.countySlug);
}
