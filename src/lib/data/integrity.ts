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
} from "./schemas";

export const MICHIGAN_COUNTY_COUNT: number = 83;

export const MICHIGAN_BOUNDS: Readonly<{
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}> = {
  minLat: 41.6,
  maxLat: 48.4,
  minLng: -90.5,
  maxLng: -82.1,
};

export type IssueLevel = "error" | "warning";

export type Issue = {
  readonly level: IssueLevel;
  readonly code: string;
  readonly message: string;
};

export type SnapshotBundle = {
  readonly counties: readonly County[];
  readonly species: readonly Species[];
  readonly lakes: readonly Lake[];
  readonly publicLands: readonly PublicLand[];
  readonly accessSites: readonly AccessSite[];
  readonly stockingEvents: readonly StockingEvent[];
  readonly harvestSnapshots: readonly HarvestSnapshot[];
  readonly seasons: readonly Season[];
  readonly directoryListings: readonly DirectoryListing[];
};

function error(code: string, message: string): Issue {
  return { level: "error", code, message };
}

function warning(code: string, message: string): Issue {
  return { level: "warning", code, message };
}

export function checkCountyCount(counties: readonly County[]): readonly Issue[] {
  if (counties.length === 0) {
    return [
      warning(
        "counties-empty",
        "counties.json is empty; the county importer has not run yet",
      ),
    ];
  }
  if (counties.length !== MICHIGAN_COUNTY_COUNT) {
    return [
      error(
        "county-count",
        `expected ${MICHIGAN_COUNTY_COUNT} counties, found ${counties.length}`,
      ),
    ];
  }
  return [];
}

export function checkDuplicateSlugs(
  label: string,
  slugs: readonly string[],
): readonly Issue[] {
  const seen: Set<string> = new Set<string>();
  const duplicates: Set<string> = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) {
      duplicates.add(slug);
    }
    seen.add(slug);
  }
  return [...duplicates].map((slug: string): Issue =>
    error("duplicate-slug", `duplicate ${label} slug: ${slug}`),
  );
}

export function checkCoordinateInMichigan(
  label: string,
  lat: number,
  lng: number,
): readonly Issue[] {
  const inBounds: boolean =
    lat >= MICHIGAN_BOUNDS.minLat &&
    lat <= MICHIGAN_BOUNDS.maxLat &&
    lng >= MICHIGAN_BOUNDS.minLng &&
    lng <= MICHIGAN_BOUNDS.maxLng;
  return inBounds
    ? []
    : [
        error(
          "coordinate-out-of-bounds",
          `${label} coordinate ${lat},${lng} is outside Michigan`,
        ),
      ];
}

export function checkReferences(
  label: string,
  references: readonly string[],
  known: ReadonlySet<string>,
): readonly Issue[] {
  const missing: Set<string> = new Set<string>();
  for (const reference of references) {
    if (!known.has(reference)) {
      missing.add(reference);
    }
  }
  return [...missing].map((reference: string): Issue =>
    error("missing-reference", `${label} references unknown slug: ${reference}`),
  );
}

export function runIntegrityChecks(bundle: SnapshotBundle): readonly Issue[] {
  const issues: Issue[] = [];
  const countySlugs: Set<string> = new Set<string>(
    bundle.counties.map((county: County): string => county.slug),
  );
  const speciesSlugs: Set<string> = new Set<string>(
    bundle.species.map((species: Species): string => species.slug),
  );
  const lakeSlugs: Set<string> = new Set<string>(
    bundle.lakes.map((lake: Lake): string => lake.slug),
  );

  issues.push(...checkCountyCount(bundle.counties));
  issues.push(
    ...checkDuplicateSlugs(
      "county",
      bundle.counties.map((county: County): string => county.slug),
    ),
  );
  issues.push(
    ...checkDuplicateSlugs(
      "lake",
      bundle.lakes.map((lake: Lake): string => `${lake.countySlug}/${lake.slug}`),
    ),
  );
  issues.push(
    ...checkDuplicateSlugs(
      "public-land",
      bundle.publicLands.map((land: PublicLand): string => land.slug),
    ),
  );
  issues.push(
    ...checkDuplicateSlugs(
      "directory-listing",
      bundle.directoryListings.map((listing: DirectoryListing): string => listing.slug),
    ),
  );
  issues.push(
    ...checkReferences(
      "lake.countySlug",
      bundle.lakes.map((lake: Lake): string => lake.countySlug),
      countySlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "accessSite.countySlug",
      bundle.accessSites.map((site: AccessSite): string => site.countySlug),
      countySlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "accessSite.lakeSlug",
      bundle.accessSites
        .map((site: AccessSite): string | null => site.lakeSlug)
        .filter((slug: string | null): slug is string => slug !== null),
      lakeSlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "stockingEvent.speciesSlug",
      bundle.stockingEvents.map((event: StockingEvent): string => event.speciesSlug),
      speciesSlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "harvestSnapshot.countySlug",
      bundle.harvestSnapshots.map((row: HarvestSnapshot): string => row.countySlug),
      countySlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "harvestSnapshot.speciesSlug",
      bundle.harvestSnapshots.map((row: HarvestSnapshot): string => row.speciesSlug),
      speciesSlugs,
    ),
  );
  issues.push(
    ...checkReferences(
      "season.speciesSlug",
      bundle.seasons.map((season: Season): string => season.speciesSlug),
      speciesSlugs,
    ),
  );

  for (const site of bundle.accessSites) {
    issues.push(
      ...checkCoordinateInMichigan(
        `accessSite ${site.slug}`,
        site.coordinate.lat,
        site.coordinate.lng,
      ),
    );
  }
  for (const county of bundle.counties) {
    if (county.centroid !== null) {
      issues.push(
        ...checkCoordinateInMichigan(
          `county ${county.slug}`,
          county.centroid.lat,
          county.centroid.lng,
        ),
      );
    }
  }
  for (const row of bundle.harvestSnapshots) {
    if (row.total < 0) {
      issues.push(
        error("negative-count", `harvest total is negative for ${row.countySlug}`),
      );
    }
  }
  for (const season of bundle.seasons) {
    if (season.endDate < season.startDate) {
      issues.push(
        error("season-range", `season ${season.name} ends before it starts`),
      );
    }
  }
  return issues;
}

export function errorsOnly(issues: readonly Issue[]): readonly Issue[] {
  return issues.filter((issue: Issue): boolean => issue.level === "error");
}
