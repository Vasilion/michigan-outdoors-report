import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { affiliateConfig, buildProductLink } from "./affiliate";
import type { AffiliateConfig, ProductLink } from "./affiliate";

const priceBandSchema = z.enum(["under-50", "50-100", "100-250", "250-plus"]);

const gearCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  title: z.string(),
  intro: z.string(),
  speciesSlugs: z.array(z.string()),
});

const gearProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  category: z.string(),
  network: z.enum(["amazon", "avantlink", "impact", "direct"]),
  asin: z.string().nullable(),
  url: z.string().nullable(),
  priceBand: priceBandSchema,
  why: z.string(),
  michiganNote: z.string().nullable(),
});

const gearFileSchema = z.object({
  categories: z.array(gearCategorySchema),
  products: z.array(gearProductSchema),
});

export type PriceBand = z.infer<typeof priceBandSchema>;
export type GearCategory = z.infer<typeof gearCategorySchema>;
export type GearProduct = z.infer<typeof gearProductSchema>;

export const PRICE_BAND_LABEL: Readonly<Record<PriceBand, string>> = {
  "under-50": "Under $50",
  "50-100": "$50 to $100",
  "100-250": "$100 to $250",
  "250-plus": "$250 and up",
};

const GEAR_PATH: string = join(process.cwd(), "content", "gear.yaml");

let cached: z.infer<typeof gearFileSchema> | null = null;

function gearFile(): z.infer<typeof gearFileSchema> {
  if (cached === null) {
    cached = gearFileSchema.parse(parse(readFileSync(GEAR_PATH, "utf8")));
  }
  return cached;
}

export function getGearCategories(): readonly GearCategory[] {
  return gearFile().categories;
}

export function getGearProducts(): readonly GearProduct[] {
  return gearFile().products;
}

export type ResolvedProduct = {
  readonly product: GearProduct;
  readonly link: ProductLink | null;
};

export function resolveProduct(product: GearProduct): ResolvedProduct {
  const config: AffiliateConfig = affiliateConfig();
  return {
    product,
    link: buildProductLink(
      { network: product.network, asin: product.asin, url: product.url },
      config,
    ),
  };
}

export function productsInCategory(categorySlug: string): readonly ResolvedProduct[] {
  return getGearProducts()
    .filter((product: GearProduct): boolean => product.category === categorySlug)
    .map(resolveProduct);
}

export function linkedProductCount(categorySlug: string): number {
  return productsInCategory(categorySlug).filter(
    (entry: ResolvedProduct): boolean => entry.link !== null,
  ).length;
}

export const GEAR_MIN_LINKED_PRODUCTS: number = 3;

export function gearCategoryIndexed(categorySlug: string): boolean {
  return linkedProductCount(categorySlug) >= GEAR_MIN_LINKED_PRODUCTS;
}

export function indexedGearCategories(): readonly GearCategory[] {
  return getGearCategories().filter((category: GearCategory): boolean =>
    gearCategoryIndexed(category.slug),
  );
}

export function findGearCategory(slug: string): GearCategory | null {
  return (
    getGearCategories().find(
      (category: GearCategory): boolean => category.slug === slug,
    ) ?? null
  );
}

export function gearCategoriesForSpecies(speciesSlug: string): readonly GearCategory[] {
  return indexedGearCategories().filter((category: GearCategory): boolean =>
    category.speciesSlugs.includes(speciesSlug),
  );
}

export function gearEnabled(): boolean {
  return indexedGearCategories().length > 0;
}

export function gearIndexIndexable(): boolean {
  return indexedGearCategories().length > 0;
}
