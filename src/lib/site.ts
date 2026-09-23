export type SiteConfig = {
  readonly name: string;
  readonly shortName: string;
  readonly url: string;
  readonly tagline: string;
  readonly description: string;
  readonly owner: string;
  readonly ownerUrl: string;
  readonly contactEmail: string | null;
  readonly repoUrl: string;
  readonly disclaimer: string;
  readonly dnrDigestUrl: string;
  readonly locale: string;
};

const RAW_SITE_URL: string = process.env.SITE_URL ?? "https://michiganoutdoorsreport.com";

const RAW_CONTACT_EMAIL: string = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export const SITE: SiteConfig = {
  name: "Michigan Outdoors Report",
  shortName: "MI Outdoors Report",
  url: RAW_SITE_URL.replace(/\/+$/, ""),
  tagline: "Michigan hunting and fishing data, county by county",
  description:
    "Harvest totals, fish stocking records, public land and boating access for all 83 Michigan counties, built from Michigan DNR public data.",
  owner: "UnyX Web Solutions",
  ownerUrl: "https://unyxwebsolutions.com",
  contactEmail: RAW_CONTACT_EMAIL === "" ? null : RAW_CONTACT_EMAIL,
  repoUrl: "https://github.com/Vasilion/michigan-outdoors-report",
  disclaimer:
    "Michigan Outdoors Report is not affiliated with, endorsed by, or connected to the Michigan Department of Natural Resources. Always verify regulations with the official DNR digest before hunting or fishing.",
  dnrDigestUrl: "https://www.michigan.gov/dnr/managing-resources/regulations",
  locale: "en-US",
};

export function absoluteUrl(path: string): string {
  const normalized: string = path.startsWith("/") ? path : `/${path}`;
  const withSlash: string =
    normalized.endsWith("/") || normalized.includes(".") ? normalized : `${normalized}/`;
  return `${SITE.url}${withSlash}`;
}
