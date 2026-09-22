import { z } from "zod";

const ISO_DATE: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const SLUG: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isoDateSchema = z.string().regex(ISO_DATE, "expected YYYY-MM-DD");
export const slugSchema = z.string().regex(SLUG, "expected a lowercase-hyphen slug");

export const coordinateSchema = z.object({
  lat: z.number().min(41).max(48.5),
  lng: z.number().min(-91).max(-82),
});

export const countySchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  peninsula: z.enum(["UP", "LP"]),
  areaSqMi: z.number().positive().nullable(),
  centroid: coordinateSchema.nullable(),
  neighborSlugs: z.array(slugSchema),
  sourceUrl: z.url(),
  updatedAt: isoDateSchema,
});

export const speciesSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  kind: z.enum(["game", "fish"]),
  pluralName: z.string().min(1),
  officialUrl: z.url().nullable(),
  sameAsUrl: z.url().nullable(),
  updatedAt: isoDateSchema,
});

export const lakeSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  countySlug: slugSchema,
  peninsula: z.enum(["UP", "LP"]).nullable(),
  acres: z.number().positive().nullable(),
  maxDepthFt: z.number().positive().nullable(),
  centroid: coordinateSchema.nullable(),
  dnrMapUrl: z.url().nullable(),
  hasSpecialRegs: z.boolean(),
  sourceUrl: z.url(),
  updatedAt: isoDateSchema,
});

export const riverSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  countySlugs: z.array(slugSchema),
  designatedTroutStream: z.boolean(),
  sourceUrl: z.url(),
  updatedAt: isoDateSchema,
});

export const publicLandSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  type: z.enum([
    "state_game_area",
    "state_forest",
    "national_forest",
    "state_park",
    "hunter_access",
    "other",
  ]),
  typeLabel: z.string().min(1),
  acres: z.number().positive().nullable(),
  countySlugs: z.array(slugSchema),
  managingAgency: z.string().min(1),
  region: z.string().nullable(),
  huntingStatus: z.string().nullable(),
  officialUrl: z.url().nullable(),
  centroid: coordinateSchema.nullable(),
  sourceUrl: z.url(),
  updatedAt: isoDateSchema,
});

export const accessSiteSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  type: z.enum(["boat_launch", "fishing_access"]),
  coordinate: coordinateSchema,
  lakeSlug: slugSchema.nullable(),
  lakeCountySlug: slugSchema.nullable(),
  riverSlug: slugSchema.nullable(),
  countySlug: slugSchema,
  amenities: z.array(z.string()),
  sourceUrl: z.url(),
  updatedAt: isoDateSchema,
});

export const stockingEventSchema = z.object({
  waterType: z.enum(["lake", "river"]),
  waterName: z.string().min(1),
  lakeSlug: slugSchema.nullable(),
  lakeCountySlug: slugSchema.nullable(),
  riverSlug: slugSchema.nullable(),
  countySlug: slugSchema.nullable(),
  speciesSlug: slugSchema,
  strain: z.string().nullable(),
  count: z.number().int().nonnegative(),
  avgLengthIn: z.number().positive().nullable(),
  stockedOn: isoDateSchema,
  sourceUrl: z.url(),
});

export const harvestSnapshotSchema = z.object({
  countySlug: slugSchema,
  speciesSlug: slugSchema,
  seasonYear: z.number().int().min(1990).max(2100),
  antlered: z.number().int().nonnegative().nullable(),
  antlerless: z.number().int().nonnegative().nullable(),
  total: z.number().int().nonnegative(),
  snapshotDate: isoDateSchema,
  isFinal: z.boolean(),
  sourceUrl: z.url(),
});

export const seasonSchema = z.object({
  speciesSlug: slugSchema,
  name: z.string().min(1),
  zone: z.string().min(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  notes: z.string().nullable(),
  sourceUrl: z.url(),
  lastVerified: isoDateSchema,
});

export const directoryListingSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  category: z.enum([
    "processor",
    "taxidermist",
    "guide",
    "charter",
    "bait_shop",
    "outfitter",
  ]),
  countySlug: slugSchema,
  address: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.url().nullable(),
  coordinate: coordinateSchema.nullable(),
  featured: z.boolean(),
  featuredUntil: isoDateSchema.nullable(),
  verified: z.boolean(),
  sourceUrl: z.url().nullable(),
  updatedAt: isoDateSchema,
});

export const redirectSchema = z.object({
  fromPath: z.string().startsWith("/"),
  toPath: z.string().startsWith("/"),
  createdAt: isoDateSchema,
});

export const importerRunSchema = z.object({
  importer: z.string().min(1),
  finishedAt: z.string().min(1),
  rowsUpserted: z.number().int().nonnegative(),
  status: z.enum(["ok", "failed", "skipped"]),
});

export const metaSchema = z.object({
  generatedAt: z.string().min(1),
  snapshotVersion: z.number().int().positive(),
  runs: z.array(importerRunSchema),
});


export const ringSchema = z.array(z.tuple([z.number(), z.number()]));

export const countyShapeSchema = z.object({
  slug: slugSchema,
  rings: z.array(ringSchema),
});

export const stateOutlineSchema = z.object({
  rings: z.array(ringSchema),
});

export const countyShapesFileSchema = z.array(countyShapeSchema);
export const stateOutlineFileSchema = z.array(stateOutlineSchema);

export type CountyShape = z.infer<typeof countyShapeSchema>;
export type StateOutline = z.infer<typeof stateOutlineSchema>;

export const countiesFileSchema = z.array(countySchema);
export const speciesFileSchema = z.array(speciesSchema);
export const lakesFileSchema = z.array(lakeSchema);
export const riversFileSchema = z.array(riverSchema);
export const publicLandsFileSchema = z.array(publicLandSchema);
export const accessSitesFileSchema = z.array(accessSiteSchema);
export const stockingEventsFileSchema = z.array(stockingEventSchema);
export const harvestSnapshotsFileSchema = z.array(harvestSnapshotSchema);
export const seasonsFileSchema = z.array(seasonSchema);
export const directoryListingsFileSchema = z.array(directoryListingSchema);
export const redirectsFileSchema = z.array(redirectSchema);

export type Coordinate = z.infer<typeof coordinateSchema>;
export type County = z.infer<typeof countySchema>;
export type Species = z.infer<typeof speciesSchema>;
export type Lake = z.infer<typeof lakeSchema>;
export type River = z.infer<typeof riverSchema>;
export type PublicLand = z.infer<typeof publicLandSchema>;
export type AccessSite = z.infer<typeof accessSiteSchema>;
export type StockingEvent = z.infer<typeof stockingEventSchema>;
export type HarvestSnapshot = z.infer<typeof harvestSnapshotSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type DirectoryListing = z.infer<typeof directoryListingSchema>;
export type Redirect = z.infer<typeof redirectSchema>;
export type ImporterRun = z.infer<typeof importerRunSchema>;
export type SnapshotMeta = z.infer<typeof metaSchema>;
