import { harvestByCountySpecies } from "../data/aggregate";
import { getSpecies } from "../data/snapshot";
import type { HarvestSnapshot, Species, StockingEvent } from "../data/schemas";
import { stockingBySpecies } from "./water";

export function speciesHubPath(species: Species): string {
  const prefix: string = species.kind === "game" ? "hunting" : "fishing";
  return `/${prefix}/${species.slug}/`;
}

export function speciesHubIndexed(species: Species): boolean {
  if (species.kind === "game") {
    const harvest: Map<string, HarvestSnapshot[]> = harvestByCountySpecies();
    for (const key of harvest.keys()) {
      if (key.endsWith(`::${species.slug}`)) {
        return true;
      }
    }
    return false;
  }
  const stocked: Map<string, StockingEvent[]> = stockingBySpecies();
  return (stocked.get(species.slug) ?? []).length > 0;
}

export function speciesWithHubs(): readonly Species[] {
  return getSpecies().filter(speciesHubIndexed);
}

export function speciesHubHref(slug: string): string | null {
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean => entry.slug === slug,
  );
  if (species === undefined || !speciesHubIndexed(species)) {
    return null;
  }
  return speciesHubPath(species);
}
