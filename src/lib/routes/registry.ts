import {
  accessSitesByCounty,
  accessSitesByLake,
  harvestByCountySpecies,
  harvestKey,
  lakesByCounty,
  listingsByCategoryCounty,
  publicLandsByCounty,
  stockingByLake,
  waterKey,
} from "../data/aggregate";
import {
  getCounties,
  getDirectoryListings,
  getLakes,
  getMeta,
  getPublicLands,
  getSeasons,
  getSpecies,
} from "../data/snapshot";
import type {
  AccessSite,
  County,
  DirectoryListing,
  HarvestSnapshot,
  Lake,
  PublicLand,
  Season,
  Species,
  StockingEvent,
} from "../data/schemas";
import {
  countyGate,
  countySpeciesFishingGate,
  countySpeciesHuntingGate,
  directoryIndexGate,
  lakeGate,
  publicLandGate,
} from "../quality-gate";
import type { GateResult, TemplateName } from "../quality-gate";
import { stockingByCountySpecies, stockingBySpecies, stockingKey } from "../views/water";

export type RouteEntry = {
  readonly path: string;
  readonly template: TemplateName;
  readonly lastmod: string;
  readonly indexable: boolean;
  readonly gateReasons: readonly string[];
};

export type StaticRouteSpec = {
  readonly path: string;
  readonly template: TemplateName;
  readonly indexable: boolean;
};

export const STATIC_ROUTES: readonly StaticRouteSpec[] = [
  { path: "/", template: "home", indexable: true },
  { path: "/hunting/", template: "species-hub", indexable: true },
  { path: "/fishing/", template: "species-hub", indexable: true },
  { path: "/about/", template: "editorial", indexable: true },
  { path: "/methodology/", template: "editorial", indexable: true },
  { path: "/data/", template: "editorial", indexable: true },
  { path: "/contact/", template: "editorial", indexable: true },
  { path: "/advertise/", template: "editorial", indexable: true },
  { path: "/privacy/", template: "editorial", indexable: true },
  { path: "/terms/", template: "editorial", indexable: true },
  { path: "/search/", template: "editorial", indexable: false },
];

function snapshotDate(): string {
  return getMeta().generatedAt.slice(0, 10);
}

function entry(
  path: string,
  template: TemplateName,
  lastmod: string,
  gate: GateResult,
): RouteEntry {
  return {
    path,
    template,
    lastmod,
    indexable: gate.indexed,
    gateReasons: gate.reasons,
  };
}

function newest(values: readonly string[], fallback: string): string {
  const sorted: string[] = [...values].sort();
  return sorted[sorted.length - 1] ?? fallback;
}

export function countyRoutes(): readonly RouteEntry[] {
  const lakes: Map<string, Lake[]> = lakesByCounty();
  const lands: Map<string, PublicLand[]> = publicLandsByCounty();
  const harvest: Map<string, HarvestSnapshot[]> = harvestByCountySpecies();
  const sites: Map<string, AccessSite[]> = accessSitesByCounty();
  return getCounties().map((county: County): RouteEntry => {
    let harvestSeasons: number = 0;
    for (const [key, rows] of harvest) {
      if (key.startsWith(county.slug + "::")) {
        harvestSeasons = Math.max(harvestSeasons, rows.length);
      }
    }
    const gate: GateResult = countyGate({
      hasGeometry: county.centroid !== null,
      areaSqMi: county.areaSqMi,
      lakeCount: (lakes.get(county.slug) ?? []).length,
      publicLandCount: (lands.get(county.slug) ?? []).length,
      harvestSeasons,
    });
    const lastmod: string = newest(
      [
        county.updatedAt,
        ...(sites.get(county.slug) ?? []).map(
          (site: AccessSite): string => site.updatedAt,
        ),
      ],
      county.updatedAt,
    );
    return entry("/county/" + county.slug + "/", "county", lastmod, gate);
  });
}

export function countySpeciesHuntingRoutes(): readonly RouteEntry[] {
  const harvest: Map<string, HarvestSnapshot[]> = harvestByCountySpecies();
  const gameSpecies: readonly Species[] = getSpecies().filter(
    (species: Species): boolean => species.kind === "game",
  );
  const routes: RouteEntry[] = [];
  for (const county of getCounties()) {
    for (const species of gameSpecies) {
      const rows: HarvestSnapshot[] =
        harvest.get(harvestKey(county.slug, species.slug)) ?? [];
      const gate: GateResult = countySpeciesHuntingGate({ harvestSeasons: rows.length });
      const lastmod: string = newest(
        rows.map((row: HarvestSnapshot): string => row.snapshotDate),
        county.updatedAt,
      );
      routes.push(
        entry(
          "/county/" + county.slug + "/" + species.slug + "-hunting/",
          "county-species-hunting",
          lastmod,
          gate,
        ),
      );
    }
  }
  return routes;
}

export function lakeRoutes(): readonly RouteEntry[] {
  const stocking: Map<string, StockingEvent[]> = stockingByLake();
  const sites: Map<string, AccessSite[]> = accessSitesByLake();
  return getLakes().map((lake: Lake): RouteEntry => {
    const key: string = waterKey(lake.countySlug, lake.slug);
    const events: StockingEvent[] = stocking.get(key) ?? [];
    const gate: GateResult = lakeGate({
      stockingEvents: events.length,
      accessSites: (sites.get(key) ?? []).length,
      hasDnrMapUrl: lake.dnrMapUrl !== null,
      acres: lake.acres,
      hasGeometry: lake.centroid !== null,
    });
    const lastmod: string = newest(
      [lake.updatedAt, ...events.map((event: StockingEvent): string => event.stockedOn)],
      lake.updatedAt,
    );
    return entry(
      "/lake/" + lake.countySlug + "/" + lake.slug + "/",
      "lake",
      lastmod,
      gate,
    );
  });
}

export function publicLandRoutes(): readonly RouteEntry[] {
  return getPublicLands().map((land: PublicLand): RouteEntry => {
    const gate: GateResult = publicLandGate({
      hasGeometry: land.centroid !== null,
      acres: land.acres,
    });
    return entry("/public-land/" + land.slug + "/", "public-land", land.updatedAt, gate);
  });
}

export function countySpeciesFishingRoutes(): readonly RouteEntry[] {
  const grouped: Map<string, StockingEvent[]> = stockingByCountySpecies();
  const fishSpecies: readonly Species[] = getSpecies().filter(
    (species: Species): boolean => species.kind === "fish",
  );
  const routes: RouteEntry[] = [];
  for (const county of getCounties()) {
    for (const species of fishSpecies) {
      const events: StockingEvent[] =
        grouped.get(stockingKey(county.slug, species.slug)) ?? [];
      if (events.length === 0) {
        continue;
      }
      const waters: Set<string> = new Set<string>(
        events.map((event: StockingEvent): string => event.waterName),
      );
      const gate: GateResult = countySpeciesFishingGate({
        stockingEvents: events.length,
        watersWithSpecies: waters.size,
      });
      const lastmod: string = newest(
        events.map((event: StockingEvent): string => event.stockedOn),
        county.updatedAt,
      );
      routes.push(
        entry(
          "/county/" + county.slug + "/" + species.slug + "-fishing/",
          "county-species-fishing",
          lastmod,
          gate,
        ),
      );
    }
  }
  return routes;
}

export function speciesHubRoutes(): readonly RouteEntry[] {
  const harvest: Map<string, HarvestSnapshot[]> = harvestByCountySpecies();
  const stocked: Map<string, StockingEvent[]> = stockingBySpecies();
  return getSpecies().map((species: Species): RouteEntry => {
    const prefix: string = species.kind === "game" ? "hunting" : "fishing";
    let hasData: boolean = false;
    if (species.kind === "game") {
      for (const key of harvest.keys()) {
        if (key.endsWith("::" + species.slug)) {
          hasData = true;
        }
      }
    } else {
      hasData = (stocked.get(species.slug) ?? []).length > 0;
    }
    const gate: GateResult = hasData
      ? { indexed: true, reasons: [] }
      : { indexed: false, reasons: ["no statewide data for this species"] };
    return entry(
      "/" + prefix + "/" + species.slug + "/",
      "species-hub",
      species.updatedAt,
      gate,
    );
  });
}

export function seasonRoutes(): readonly RouteEntry[] {
  const seasons: readonly Season[] = getSeasons();
  const bySpecies: Map<string, Season[]> = new Map<string, Season[]>();
  for (const season of seasons) {
    const bucket: Season[] | undefined = bySpecies.get(season.speciesSlug);
    if (bucket === undefined) {
      bySpecies.set(season.speciesSlug, [season]);
    } else {
      bucket.push(season);
    }
  }
  const fallback: string = snapshotDate();
  const indexLastmod: string = newest(
    seasons.map((season: Season): string => season.lastVerified),
    fallback,
  );
  const routes: RouteEntry[] = [
    entry("/seasons/", "seasons", indexLastmod, {
      indexed: seasons.length > 0,
      reasons: seasons.length > 0 ? [] : ["no season data loaded"],
    }),
  ];
  for (const [speciesSlug, rows] of bySpecies) {
    const lastmod: string = newest(
      rows.map((season: Season): string => season.lastVerified),
      fallback,
    );
    routes.push(
      entry("/seasons/" + speciesSlug + "/", "seasons", lastmod, {
        indexed: true,
        reasons: [],
      }),
    );
  }
  return routes;
}

export function directoryRoutes(): readonly RouteEntry[] {
  const listings: readonly DirectoryListing[] = getDirectoryListings();
  const byCategoryCounty: Map<string, DirectoryListing[]> = listingsByCategoryCounty();
  const fallback: string = snapshotDate();
  const categories: Set<string> = new Set<string>(
    listings.map((listing: DirectoryListing): string => listing.category),
  );
  const routes: RouteEntry[] = [];
  for (const category of categories) {
    const inCategory: DirectoryListing[] = listings.filter(
      (listing: DirectoryListing): boolean => listing.category === category,
    );
    const lastmod: string = newest(
      inCategory.map((listing: DirectoryListing): string => listing.updatedAt),
      fallback,
    );
    routes.push(
      entry(
        "/directory/" + category + "/",
        "directory-category",
        lastmod,
        directoryIndexGate({ listingCount: inCategory.length }),
      ),
    );
  }
  for (const [key, rows] of byCategoryCounty) {
    const parts: string[] = key.split("::");
    const category: string = parts[0] ?? "";
    const countySlug: string = parts[1] ?? "";
    const lastmod: string = newest(
      rows.map((listing: DirectoryListing): string => listing.updatedAt),
      fallback,
    );
    routes.push(
      entry(
        "/directory/" + category + "/" + countySlug + "/",
        "directory-category-county",
        lastmod,
        directoryIndexGate({ listingCount: rows.length }),
      ),
    );
  }
  for (const listing of listings) {
    routes.push(
      entry(
        "/directory/listing/" + listing.slug + "/",
        "directory-listing",
        listing.updatedAt,
        { indexed: true, reasons: [] },
      ),
    );
  }
  return routes;
}

export function staticRoutes(): readonly RouteEntry[] {
  const lastmod: string = snapshotDate();
  return STATIC_ROUTES.map((spec: StaticRouteSpec): RouteEntry => ({
    path: spec.path,
    template: spec.template,
    lastmod,
    indexable: spec.indexable,
    gateReasons: spec.indexable ? [] : ["static route excluded from the index by policy"],
  }));
}

export function listRoutes(): readonly RouteEntry[] {
  return [
    ...staticRoutes(),
    ...countyRoutes(),
    ...countySpeciesHuntingRoutes(),
    ...countySpeciesFishingRoutes(),
    ...lakeRoutes(),
    ...publicLandRoutes(),
    ...speciesHubRoutes(),
    ...seasonRoutes(),
    ...directoryRoutes(),
  ];
}

export function listIndexableRoutes(): readonly RouteEntry[] {
  return listRoutes().filter((route: RouteEntry): boolean => route.indexable);
}

export const SITEMAP_GROUPS: Readonly<Record<string, readonly TemplateName[]>> = {
  core: ["home", "editorial"],
  counties: ["county", "county-species-hunting", "county-species-fishing"],
  lakes: ["lake", "river"],
  land: ["public-land"],
  species: ["species-hub", "seasons"],
  directory: ["directory-category", "directory-category-county", "directory-listing"],
};
