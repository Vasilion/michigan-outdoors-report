import {
  getAccessSites,
  getCounties,
  getDirectoryListings,
  getHarvestSnapshots,
  getLakes,
  getPublicLands,
  getSpecies,
  getStockingEvents,
} from "./snapshot";
import type {
  AccessSite,
  County,
  DirectoryListing,
  HarvestSnapshot,
  Lake,
  PublicLand,
  Species,
  StockingEvent,
} from "./schemas";

export function groupBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Map<K, T[]> {
  const grouped: Map<K, T[]> = new Map<K, T[]>();
  for (const item of items) {
    const key: K = keyOf(item);
    const bucket: T[] | undefined = grouped.get(key);
    if (bucket === undefined) {
      grouped.set(key, [item]);
    } else {
      bucket.push(item);
    }
  }
  return grouped;
}

export function lakesByCounty(): Map<string, Lake[]> {
  return groupBy(getLakes(), (lake: Lake): string => lake.countySlug);
}

export function accessSitesByCounty(): Map<string, AccessSite[]> {
  return groupBy(getAccessSites(), (site: AccessSite): string => site.countySlug);
}

export function waterKey(countySlug: string, lakeSlug: string): string {
  return `${countySlug}::${lakeSlug}`;
}

export function accessSitesByLake(): Map<string, AccessSite[]> {
  const sited: AccessSite[] = getAccessSites().filter(
    (site: AccessSite): boolean => site.lakeSlug !== null,
  );
  return groupBy(sited, (site: AccessSite): string =>
    waterKey(site.lakeCountySlug ?? site.countySlug, site.lakeSlug as string),
  );
}

export function stockingByLake(): Map<string, StockingEvent[]> {
  const events: StockingEvent[] = getStockingEvents().filter(
    (event: StockingEvent): boolean =>
      event.lakeSlug !== null && event.lakeCountySlug !== null,
  );
  return groupBy(events, (event: StockingEvent): string =>
    waterKey(event.lakeCountySlug as string, event.lakeSlug as string),
  );
}

export function stockingByCounty(): Map<string, StockingEvent[]> {
  const placed: StockingEvent[] = getStockingEvents().filter(
    (event: StockingEvent): boolean => event.countySlug !== null,
  );
  return groupBy(placed, (event: StockingEvent): string => event.countySlug as string);
}

export function publicLandsByCounty(): Map<string, PublicLand[]> {
  const pairs: { land: PublicLand; countySlug: string }[] = [];
  for (const land of getPublicLands()) {
    for (const countySlug of land.countySlugs) {
      pairs.push({ land, countySlug });
    }
  }
  const grouped: Map<string, PublicLand[]> = new Map<string, PublicLand[]>();
  for (const pair of pairs) {
    const bucket: PublicLand[] | undefined = grouped.get(pair.countySlug);
    if (bucket === undefined) {
      grouped.set(pair.countySlug, [pair.land]);
    } else {
      bucket.push(pair.land);
    }
  }
  return grouped;
}

export function harvestKey(countySlug: string, speciesSlug: string): string {
  return `${countySlug}::${speciesSlug}`;
}

export function harvestByCountySpecies(): Map<string, HarvestSnapshot[]> {
  const grouped: Map<string, HarvestSnapshot[]> = groupBy(
    getHarvestSnapshots(),
    (row: HarvestSnapshot): string => harvestKey(row.countySlug, row.speciesSlug),
  );
  for (const rows of grouped.values()) {
    rows.sort((a: HarvestSnapshot, b: HarvestSnapshot): number => a.seasonYear - b.seasonYear);
  }
  return grouped;
}

export function listingsByCategoryCounty(): Map<string, DirectoryListing[]> {
  return groupBy(
    getDirectoryListings(),
    (listing: DirectoryListing): string => `${listing.category}::${listing.countySlug}`,
  );
}

export function countyByName(): Map<string, County> {
  const map: Map<string, County> = new Map<string, County>();
  for (const county of getCounties()) {
    map.set(county.slug, county);
  }
  return map;
}

export function speciesBySlug(): Map<string, Species> {
  const map: Map<string, Species> = new Map<string, Species>();
  for (const entry of getSpecies()) {
    map.set(entry.slug, entry);
  }
  return map;
}

export function sumAcres(lands: readonly PublicLand[]): number {
  return lands.reduce(
    (total: number, land: PublicLand): number => total + (land.acres ?? 0),
    0,
  );
}

export function latestUpdatedAt(values: readonly string[], fallback: string): string {
  const sorted: string[] = [...values].sort();
  return sorted[sorted.length - 1] ?? fallback;
}
