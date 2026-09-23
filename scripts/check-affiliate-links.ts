import {
  affiliateConfig,
  anyNetworkConfigured,
  buildProductLink,
} from "../src/lib/affiliate";
import type { AffiliateConfig, ProductLink } from "../src/lib/affiliate";
import { getGearCategories, getGearProducts } from "../src/lib/gear";
import { GEAR_MIN_LINKED_PRODUCTS } from "../src/lib/gear";
import type { GearCategory, GearProduct } from "../src/lib/gear";

type CheckResult = {
  readonly slug: string;
  readonly href: string;
  readonly status: number | null;
  readonly error: string | null;
};

const ASIN_PATTERN: RegExp = /^[A-Z0-9]{10}$/;

function checkOne(slug: string, href: string): Promise<CheckResult> {
  return fetch(href, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  })
    .then((response: Response): CheckResult => {
      return { slug, href, status: response.status, error: null };
    })
    .catch((cause: unknown): CheckResult => {
      return {
        slug,
        href,
        status: null,
        error: cause instanceof Error ? cause.message : String(cause),
      };
    });
}

function main(): Promise<void> {
  const config: AffiliateConfig = affiliateConfig();
  const products: readonly GearProduct[] = getGearProducts();
  const categories: readonly GearCategory[] = getGearCategories();
  const problems: string[] = [];

  const categorySlugs: Set<string> = new Set<string>(
    categories.map((category: GearCategory): string => category.slug),
  );
  const seen: Set<string> = new Set<string>();
  for (const product of products) {
    if (!categorySlugs.has(product.category)) {
      problems.push(`${product.slug}: unknown category "${product.category}"`);
    }
    if (seen.has(product.slug)) {
      problems.push(`${product.slug}: duplicate slug`);
    }
    seen.add(product.slug);
    if (product.asin !== null && !ASIN_PATTERN.test(product.asin)) {
      problems.push(`${product.slug}: "${product.asin}" is not a 10-character ASIN`);
    }
    if (product.network === "amazon" && product.url !== null) {
      problems.push(`${product.slug}: amazon products use asin, not url`);
    }
    if (product.network !== "amazon" && product.asin !== null) {
      problems.push(`${product.slug}: asin is only valid for the amazon network`);
    }
  }

  const checkable: { slug: string; href: string }[] = [];
  for (const product of products) {
    const link: ProductLink | null = buildProductLink(
      { network: product.network, asin: product.asin, url: product.url },
      config,
    );
    if (link !== null) {
      checkable.push({ slug: product.slug, href: link.href });
    }
  }

  for (const category of categories) {
    const linked: number = checkable.filter((entry: { slug: string }): boolean => {
      const product: GearProduct | undefined = products.find(
        (candidate: GearProduct): boolean => candidate.slug === entry.slug,
      );
      return product !== undefined && product.category === category.slug;
    }).length;
    if (linked > 0 && linked < GEAR_MIN_LINKED_PRODUCTS) {
      console.log(
        `note: /gear/${category.slug}/ has ${linked} linked item(s), needs ${GEAR_MIN_LINKED_PRODUCTS} to be published`,
      );
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`affiliate: ${problem}`);
    }
    process.exitCode = 1;
    return Promise.resolve();
  }

  if (!anyNetworkConfigured(config)) {
    console.log(
      `affiliate: no network configured, ${products.length} products validated but no links to check`,
    );
    return Promise.resolve();
  }

  if (checkable.length === 0) {
    console.log("affiliate: no product links to check yet");
    return Promise.resolve();
  }

  return Promise.all(
    checkable.map((entry: { slug: string; href: string }): Promise<CheckResult> =>
      checkOne(entry.slug, entry.href),
    ),
  ).then((results: readonly CheckResult[]): void => {
    const broken: readonly CheckResult[] = results.filter(
      (result: CheckResult): boolean =>
        result.error !== null || result.status === null || result.status >= 400,
    );
    for (const result of broken) {
      console.error(
        `affiliate: ${result.slug} -> ${result.href} (${result.error ?? result.status})`,
      );
    }
    console.log(`affiliate: checked ${results.length} link(s), ${broken.length} failing`);
    if (broken.length > 0) {
      process.exitCode = 1;
    }
  });
}

main().catch((cause: unknown): void => {
  console.error(cause);
  process.exitCode = 1;
});
