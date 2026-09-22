import { readFileSync } from "node:fs";
import { join, posix, sep } from "node:path";
import { globSync } from "tinyglobby";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

export const OUT_DIR: string = join(process.cwd(), "out");

export type PageInfo = {
  readonly file: string;
  readonly urlPath: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly canonical: string | null;
  readonly robots: string | null;
  readonly h1s: readonly string[];
  readonly internalLinks: readonly string[];
  readonly jsonLdRaw: readonly string[];
};

export function toUrlPath(relativeFile: string): string {
  const normalized: string = relativeFile.split(sep).join(posix.sep);
  if (normalized === "index.html") {
    return "/";
  }
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }
  return `/${normalized}`;
}

export function normalizeInternalHref(href: string): string | null {
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }
  if (/^https?:\/\//i.test(href)) {
    return null;
  }
  const withoutHash: string = href.split("#")[0] ?? "";
  const withoutQuery: string = withoutHash.split("?")[0] ?? "";
  if (withoutQuery === "") {
    return null;
  }
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

export function parsePage(file: string, html: string): PageInfo {
  const $: CheerioAPI = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_index: number, element: Element): void => {
    const href: string | undefined = $(element).attr("href");
    if (href === undefined) {
      return;
    }
    const normalized: string | null = normalizeInternalHref(href);
    if (normalized !== null) {
      links.push(normalized);
    }
  });
  const jsonLdRaw: string[] = [];
  $('script[type="application/ld+json"]').each(
    (_index: number, element: Element): void => {
      jsonLdRaw.push($(element).text());
    },
  );
  const h1s: string[] = [];
  $("h1").each((_index: number, element: Element): void => {
    h1s.push($(element).text().trim());
  });
  return {
    file,
    urlPath: toUrlPath(file),
    title: $("head title").first().text() || null,
    description: $('meta[name="description"]').attr("content") ?? null,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    robots: $('meta[name="robots"]').attr("content") ?? null,
    h1s,
    internalLinks: links,
    jsonLdRaw,
  };
}

export function loadPages(): readonly PageInfo[] {
  const files: string[] = globSync(["**/*.html"], { cwd: OUT_DIR });
  return files.map((file: string): PageInfo =>
    parsePage(file, readFileSync(join(OUT_DIR, file), "utf8")),
  );
}

export function isNoindex(page: PageInfo): boolean {
  return page.robots !== null && page.robots.toLowerCase().includes("noindex");
}
