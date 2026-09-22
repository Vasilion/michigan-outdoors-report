import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

export const TITLE_MAX: number = 60;
export const DESCRIPTION_MAX: number = 155;

export type PageSeo = {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly indexable: boolean;
  readonly ogImagePath?: string;
  readonly dateModified?: string;
};

export function truncateAtWord(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  const cut: string = value.slice(0, max - 1);
  const lastSpace: number = cut.lastIndexOf(" ");
  const base: string = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,.;:-]+$/, "")}…`;
}

export function buildMetadata(seo: PageSeo): Metadata {
  const canonical: string = absoluteUrl(seo.path);
  const title: string = truncateAtWord(seo.title, TITLE_MAX + 20);
  const description: string = truncateAtWord(seo.description, DESCRIPTION_MAX);
  const images: string[] = [absoluteUrl(seo.ogImagePath ?? "/og-default.png")];
  return {
    title,
    description,
    alternates: { canonical },
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "article",
      siteName: SITE.name,
      title,
      description,
      url: canonical,
      images,
      locale: "en_US",
      ...(seo.dateModified === undefined ? {} : { modifiedTime: seo.dateModified }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}
