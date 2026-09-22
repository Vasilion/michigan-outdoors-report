import type { ReactElement, ReactNode } from "react";

export const MONETIZATION: Readonly<{
  adsEnabled: boolean;
  affiliateDisclosure: string;
  featuredListingsEnabled: boolean;
}> = {
  adsEnabled: false,
  affiliateDisclosure:
    "Some links on this page are affiliate links. If you buy through them we may earn a commission at no extra cost to you. It never changes which products we list or how we rank them.",
  featuredListingsEnabled: true,
};

export type AffiliateLinkProps = {
  readonly href: string;
  readonly children: ReactNode;
};

export function AffiliateLink({ href, children }: AffiliateLinkProps): ReactElement {
  return (
    <a href={href} rel="sponsored nofollow noopener" target="_blank">
      {children}
    </a>
  );
}

export function AffiliateDisclosure(): ReactElement {
  return (
    <p className="rounded-lg border border-sand-200 bg-sand-100 p-3 text-sm text-bark-500">
      {MONETIZATION.affiliateDisclosure}
    </p>
  );
}

export type AdSlotProps = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
};

export function AdSlot({ id, width, height }: AdSlotProps): ReactElement | null {
  if (!MONETIZATION.adsEnabled) {
    return null;
  }
  return (
    <div
      id={id}
      aria-hidden="true"
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: "100%" }}
      className="mx-auto bg-sand-100"
    />
  );
}

export type FeaturedBadgeProps = {
  readonly label?: string;
};

export function FeaturedBadge({ label }: FeaturedBadgeProps): ReactElement {
  return (
    <span className="rounded-full bg-blaze-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-blaze-600">
      {label ?? "Featured listing"}
    </span>
  );
}
