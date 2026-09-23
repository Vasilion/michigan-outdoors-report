export type AffiliateNetwork = "amazon" | "avantlink" | "impact" | "direct";

export type AffiliateConfig = {
  readonly amazonTag: string | null;
  readonly avantlinkId: string | null;
  readonly impactId: string | null;
};

export function affiliateConfig(): AffiliateConfig {
  const amazon: string = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";
  const avantlink: string = process.env.NEXT_PUBLIC_AVANTLINK_ID ?? "";
  const impact: string = process.env.NEXT_PUBLIC_IMPACT_ID ?? "";
  return {
    amazonTag: amazon === "" ? null : amazon,
    avantlinkId: avantlink === "" ? null : avantlink,
    impactId: impact === "" ? null : impact,
  };
}

export function amazonUrl(asin: string, tag: string | null): string {
  const base: string = `https://www.amazon.com/dp/${asin}`;
  return tag === null ? base : `${base}?tag=${encodeURIComponent(tag)}`;
}

export function withQueryParam(url: string, key: string, value: string): string {
  const separator: string = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export type ProductLinkInput = {
  readonly network: AffiliateNetwork;
  readonly asin: string | null;
  readonly url: string | null;
};

export type ProductLink = {
  readonly href: string;
  readonly monetized: boolean;
};

export function buildProductLink(
  input: ProductLinkInput,
  config: AffiliateConfig,
): ProductLink | null {
  if (input.network === "amazon") {
    if (input.asin === null) {
      return null;
    }
    return {
      href: amazonUrl(input.asin, config.amazonTag),
      monetized: config.amazonTag !== null,
    };
  }
  if (input.url === null) {
    return null;
  }
  if (input.network === "avantlink") {
    return config.avantlinkId === null
      ? { href: input.url, monetized: false }
      : {
          href: withQueryParam(input.url, "avad", config.avantlinkId),
          monetized: true,
        };
  }
  if (input.network === "impact") {
    return config.impactId === null
      ? { href: input.url, monetized: false }
      : {
          href: withQueryParam(input.url, "irclickid", config.impactId),
          monetized: true,
        };
  }
  return { href: input.url, monetized: false };
}

export function anyNetworkConfigured(config: AffiliateConfig): boolean {
  return (
    config.amazonTag !== null || config.avantlinkId !== null || config.impactId !== null
  );
}
