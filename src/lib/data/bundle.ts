import type { SnapshotBundle } from "./integrity";
import {
  getAccessSites,
  getCounties,
  getDirectoryListings,
  getHarvestSnapshots,
  getLakes,
  getPublicLands,
  getSeasons,
  getSpecies,
  getStockingEvents,
} from "./snapshot";

export function loadBundle(): SnapshotBundle {
  return {
    counties: getCounties(),
    species: getSpecies(),
    lakes: getLakes(),
    publicLands: getPublicLands(),
    accessSites: getAccessSites(),
    stockingEvents: getStockingEvents(),
    harvestSnapshots: getHarvestSnapshots(),
    seasons: getSeasons(),
    directoryListings: getDirectoryListings(),
  };
}
