import {
  accessSitesByCounty,
  harvestByCountySpecies,
  harvestKey,
  lakesByCounty,
  publicLandsByCounty,
  sumAcres,
} from "../data/aggregate";
import { lakeGateFor, stockingByCountySpecies, stockingKey, totalFish } from "./water";
import { riversByCounty } from "./river";
import { findCounty, getMeta, getSeasons, getSpecies } from "../data/snapshot";
import type { AccessSite, Lake, River, StockingEvent } from "../data/schemas";
import type {
  County,
  HarvestSnapshot,
  PublicLand,
  Season,
  Species,
} from "../data/schemas";

export type PeninsulaLabel = "Upper Peninsula" | "Lower Peninsula";

export function peninsulaLabel(peninsula: "UP" | "LP"): PeninsulaLabel {
  return peninsula === "UP" ? "Upper Peninsula" : "Lower Peninsula";
}

export function seasonAppliesTo(season: Season, peninsula: "UP" | "LP"): boolean {
  const zone: string = season.zone.toLowerCase();
  if (zone === "statewide") {
    return true;
  }
  return zone === peninsulaLabel(peninsula).toLowerCase();
}

export type HarvestSeries = {
  readonly rows: readonly HarvestSnapshot[];
  readonly finalRows: readonly HarvestSnapshot[];
  readonly latestFinal: HarvestSnapshot | null;
  readonly previousFinal: HarvestSnapshot | null;
  readonly inProgress: HarvestSnapshot | null;
};

export function harvestSeries(countySlug: string, speciesSlug: string): HarvestSeries {
  const rows: readonly HarvestSnapshot[] =
    harvestByCountySpecies().get(harvestKey(countySlug, speciesSlug)) ?? [];
  const finalRows: readonly HarvestSnapshot[] = rows.filter(
    (row: HarvestSnapshot): boolean => row.isFinal,
  );
  const inProgress: HarvestSnapshot | null =
    rows.find((row: HarvestSnapshot): boolean => !row.isFinal) ?? null;
  return {
    rows,
    finalRows,
    latestFinal: finalRows[finalRows.length - 1] ?? null,
    previousFinal: finalRows[finalRows.length - 2] ?? null,
    inProgress,
  };
}

export type CountyFishSpecies = {
  readonly speciesSlug: string;
  readonly speciesName: string;
  readonly waters: number;
  readonly fish: number;
};

export type CountyView = {
  readonly county: County;
  readonly peninsula: PeninsulaLabel;
  readonly neighbors: readonly County[];
  readonly publicLands: readonly PublicLand[];
  readonly publicLandAcres: number;
  readonly seasons: readonly Season[];
  readonly gameSpecies: readonly Species[];
  readonly harvest: ReadonlyMap<string, HarvestSeries>;
  readonly lakes: readonly Lake[];
  readonly rivers: readonly River[];
  readonly accessSites: readonly AccessSite[];
  readonly fishSpecies: readonly CountyFishSpecies[];
  readonly dataDate: string;
};

export function buildCountyView(slug: string): CountyView | null {
  const county: County | null = findCounty(slug);
  if (county === null) {
    return null;
  }
  const lands: readonly PublicLand[] = [...(publicLandsByCounty().get(slug) ?? [])].sort(
    (a: PublicLand, b: PublicLand): number => (b.acres ?? 0) - (a.acres ?? 0),
  );

  const neighbors: County[] = [];
  for (const neighborSlug of county.neighborSlugs) {
    const neighbor: County | null = findCounty(neighborSlug);
    if (neighbor !== null) {
      neighbors.push(neighbor);
    }
  }

  const gameSpecies: readonly Species[] = getSpecies().filter(
    (species: Species): boolean => species.kind === "game",
  );
  const harvest: Map<string, HarvestSeries> = new Map<string, HarvestSeries>();
  for (const species of gameSpecies) {
    harvest.set(species.slug, harvestSeries(slug, species.slug));
  }

  const lakes: readonly Lake[] = [...(lakesByCounty().get(slug) ?? [])]
    .filter((lake: Lake): boolean => lakeGateFor(lake).indexed)
    .sort((a: Lake, b: Lake): number => (b.acres ?? 0) - (a.acres ?? 0));
  const sites: readonly AccessSite[] = accessSitesByCounty().get(slug) ?? [];
  const stocking: Map<string, StockingEvent[]> = stockingByCountySpecies();
  const fishSpecies: CountyFishSpecies[] = [];
  for (const species of getSpecies()) {
    if (species.kind !== "fish") {
      continue;
    }
    const events: StockingEvent[] = stocking.get(stockingKey(slug, species.slug)) ?? [];
    if (events.length === 0) {
      continue;
    }
    fishSpecies.push({
      speciesSlug: species.slug,
      speciesName: species.name,
      waters: new Set(events.map((event: StockingEvent): string => event.waterName)).size,
      fish: totalFish(events),
    });
  }
  fishSpecies.sort(
    (a: CountyFishSpecies, b: CountyFishSpecies): number => b.fish - a.fish,
  );

  const rivers: readonly River[] = [...(riversByCounty().get(slug) ?? [])].sort(
    (a: River, b: River): number => a.name.localeCompare(b.name),
  );

  return {
    county,
    peninsula: peninsulaLabel(county.peninsula),
    neighbors,
    lakes,
    rivers,
    accessSites: sites,
    fishSpecies,
    publicLands: lands,
    publicLandAcres: sumAcres(lands),
    seasons: getSeasons().filter((season: Season): boolean =>
      seasonAppliesTo(season, county.peninsula),
    ),
    gameSpecies,
    harvest,
    dataDate: getMeta().generatedAt.slice(0, 10),
  };
}

export function countyHarvestSeasons(slug: string, speciesSlug: string): number {
  return harvestSeries(slug, speciesSlug).finalRows.length;
}
