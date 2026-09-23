import { groupBy } from "../data/aggregate";
import {
  findCounty,
  getAccessSites,
  getMeta,
  getRivers,
  getSpecies,
  getStockingEvents,
} from "../data/snapshot";
import type { AccessSite, County, River, Species, StockingEvent } from "../data/schemas";
import { riverGate } from "../quality-gate";
import type { GateResult } from "../quality-gate";

export function riverKey(countySlug: string, riverSlug: string): string {
  return `${countySlug}::${riverSlug}`;
}

export function stockingByRiver(): Map<string, StockingEvent[]> {
  const events: StockingEvent[] = getStockingEvents().filter(
    (event: StockingEvent): boolean =>
      event.riverSlug !== null && event.riverCountySlug !== null,
  );
  return groupBy(events, (event: StockingEvent): string =>
    riverKey(event.riverCountySlug as string, event.riverSlug as string),
  );
}

export function accessSitesByRiver(): Map<string, AccessSite[]> {
  const sites: AccessSite[] = getAccessSites().filter(
    (site: AccessSite): boolean =>
      site.riverSlug !== null && site.riverCountySlug !== null,
  );
  return groupBy(sites, (site: AccessSite): string =>
    riverKey(site.riverCountySlug as string, site.riverSlug as string),
  );
}

export function riverGateFor(river: River): GateResult {
  const key: string = riverKey(river.countySlug, river.slug);
  return riverGate({
    accessSites: (accessSitesByRiver().get(key) ?? []).length,
    stockingEvents: (stockingByRiver().get(key) ?? []).length,
    countyCount: 1,
  });
}

export function riversWithPages(): readonly River[] {
  return getRivers().filter((river: River): boolean => riverGateFor(river).indexed);
}

export type RiverView = {
  readonly river: River;
  readonly county: County;
  readonly stocking: readonly StockingEvent[];
  readonly accessSites: readonly AccessSite[];
  readonly speciesStocked: readonly Species[];
  readonly lastStockedOn: string | null;
  readonly sameNameElsewhere: readonly River[];
  readonly dataDate: string;
  readonly lastUpdated: string;
};

export function buildRiverView(countySlug: string, riverSlug: string): RiverView | null {
  const river: River | undefined = getRivers().find(
    (entry: River): boolean =>
      entry.slug === riverSlug && entry.countySlug === countySlug,
  );
  if (river === undefined) {
    return null;
  }
  const county: County | null = findCounty(countySlug);
  if (county === null) {
    return null;
  }
  const key: string = riverKey(countySlug, riverSlug);
  const stocking: readonly StockingEvent[] = [...(stockingByRiver().get(key) ?? [])].sort(
    (a: StockingEvent, b: StockingEvent): number =>
      b.stockedOn.localeCompare(a.stockedOn),
  );
  const sites: readonly AccessSite[] = [...(accessSitesByRiver().get(key) ?? [])].sort(
    (a: AccessSite, b: AccessSite): number => a.name.localeCompare(b.name),
  );
  const speciesSlugs: readonly string[] = [
    ...new Set(stocking.map((event: StockingEvent): string => event.speciesSlug)),
  ].sort();
  const speciesStocked: Species[] = [];
  for (const slug of speciesSlugs) {
    const species: Species | undefined = getSpecies().find(
      (entry: Species): boolean => entry.slug === slug,
    );
    if (species !== undefined) {
      speciesStocked.push(species);
    }
  }
  const sameName: readonly River[] = riversWithPages().filter(
    (entry: River): boolean =>
      entry.slug === river.slug && entry.countySlug !== river.countySlug,
  );
  const dates: string[] = [
    river.updatedAt,
    ...stocking.map((event: StockingEvent): string => event.stockedOn),
    ...sites.map((site: AccessSite): string => site.updatedAt),
  ].sort();
  return {
    river,
    county,
    stocking,
    accessSites: sites,
    speciesStocked,
    lastStockedOn: stocking[0]?.stockedOn ?? null,
    sameNameElsewhere: sameName,
    dataDate: getMeta().generatedAt.slice(0, 10),
    lastUpdated: dates[dates.length - 1] ?? river.updatedAt,
  };
}

export function riversByCounty(): Map<string, River[]> {
  return groupBy(riversWithPages(), (river: River): string => river.countySlug);
}
