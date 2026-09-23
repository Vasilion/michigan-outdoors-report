import Link from "next/link";
import type { ReactElement } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { AffiliateDisclosure, AffiliateLink } from "@/components/commerce";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PRICE_BAND_LABEL } from "@/lib/gear";
import type { GearCategory, ResolvedProduct } from "@/lib/gear";

export type ProductCardProps = {
  readonly entry: ResolvedProduct;
};

export function ProductCard({ entry }: ProductCardProps): ReactElement {
  const title: string =
    entry.product.brand === null
      ? entry.product.name
      : `${entry.product.brand} ${entry.product.name}`;
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">
            {entry.link === null ? (
              title
            ) : (
              <AffiliateLink href={entry.link.href}>
                {title}
                <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
              </AffiliateLink>
            )}
          </h3>
          <Badge variant="outline">{PRICE_BAND_LABEL[entry.product.priceBand]}</Badge>
        </div>
        <p className="text-sm">{entry.product.why}</p>
        {entry.product.michiganNote === null ? null : (
          <p className="text-muted-foreground border-l-2 border-sand-200 pl-3 text-sm">
            {entry.product.michiganNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export type GearGridProps = {
  readonly entries: readonly ResolvedProduct[];
};

export function GearGrid({ entries }: GearGridProps): ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map((entry: ResolvedProduct): ReactElement => (
        <ProductCard key={entry.product.slug} entry={entry} />
      ))}
    </div>
  );
}

export type GearCalloutProps = {
  readonly categories: readonly GearCategory[];
};

export function GearCallout({ categories }: GearCalloutProps): ReactElement | null {
  if (categories.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ShoppingBag aria-hidden="true" className="text-blaze-600 h-4 w-4" />
        <span className="text-sm font-medium">Gear for this:</span>
        {categories.map((category: GearCategory): ReactElement => (
          <Link key={category.slug} href={`/gear/${category.slug}/`} prefetch={false}>
            {category.name}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function GearDisclosure(): ReactElement {
  return <AffiliateDisclosure />;
}
