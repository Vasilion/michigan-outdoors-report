import { describe, expect, it } from "vitest";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  itemListSchema,
  localBusinessSchema,
  organizationSchema,
  placeSchema,
  websiteSchema,
} from "../../src/lib/schema/builders";
import { SITEMAP_GROUPS, STATIC_ROUTES, listRoutes } from "../../src/lib/routes/registry";
import type { RouteEntry } from "../../src/lib/routes/registry";
import type { TemplateName } from "../../src/lib/quality-gate";
import { DOWNLOADS, csvEscape, toCsv } from "../../src/lib/downloads";
import type { DownloadSpec } from "../../src/lib/downloads";
import { findComments, isAllowedComment } from "../../scripts/lib/comments";
import { normalizeInternalHref, toUrlPath } from "../../scripts/lib/html-index";

describe("json-ld builders", (): void => {
  it("stamps @context and @type on every graph", (): void => {
    const graphs: readonly Record<string, unknown>[] = [
      organizationSchema() as unknown as Record<string, unknown>,
      websiteSchema() as unknown as Record<string, unknown>,
      breadcrumbSchema([{ name: "Home", path: "/" }]) as unknown as Record<
        string,
        unknown
      >,
      faqSchema([{ question: "q", answer: "a" }]) as unknown as Record<string, unknown>,
      itemListSchema("list", [{ name: "n", path: "/x/" }]) as unknown as Record<
        string,
        unknown
      >,
    ];
    for (const graph of graphs) {
      expect(graph["@context"]).toBe("https://schema.org");
      expect(typeof graph["@type"]).toBe("string");
    }
  });

  it("serializes to valid JSON", (): void => {
    const graph: string = JSON.stringify(
      datasetSchema({
        name: "Harvest",
        description: "Reported harvest by county.",
        path: "/data/",
        dateModified: "2026-09-01",
        sourceUrl: "https://www.michigan.gov/dnr",
        distributions: [{ url: "/downloads/harvest-by-county.csv", format: "text/csv" }],
      }),
    );
    expect((): unknown => JSON.parse(graph)).not.toThrow();
    expect(graph).toContain("DataDownload");
  });

  it("emits absolute urls with trailing slashes for places", (): void => {
    const place: Record<string, unknown> = placeSchema({
      name: "Houghton Lake",
      description: "A lake.",
      path: "/lake/roscommon/houghton-lake/",
      geo: { lat: 44.3, lng: -84.7 },
      type: "LakeBodyOfWater",
    }) as unknown as Record<string, unknown>;
    expect(String(place["url"])).toMatch(/\/lake\/roscommon\/houghton-lake\/$/);
    expect(place["geo"]).toBeDefined();
  });

  it("omits optional fields rather than emitting nulls", (): void => {
    const listing: string = JSON.stringify(
      localBusinessSchema({
        name: "Northwoods Processing",
        path: "/directory/listing/northwoods-processing/",
        category: "processor",
        phone: null,
        website: null,
        address: null,
        geo: null,
      }),
    );
    expect(listing).not.toContain("null");
  });
});

describe("route registry", (): void => {
  it("emits every static route with a trailing slash", (): void => {
    for (const spec of STATIC_ROUTES) {
      expect(spec.path === "/" || spec.path.endsWith("/")).toBe(true);
    }
  });

  it("never emits a duplicate path", (): void => {
    const routes: readonly RouteEntry[] = listRoutes();
    const paths: Set<string> = new Set<string>(
      routes.map((route: RouteEntry): string => route.path),
    );
    expect(paths.size).toBe(routes.length);
  });

  it("gives every route a template that lands in exactly one sitemap group", (): void => {
    const routes: readonly RouteEntry[] = listRoutes();
    for (const route of routes) {
      const groups: string[] = Object.entries(SITEMAP_GROUPS)
        .filter(([, templates]: [string, readonly TemplateName[]]): boolean =>
          templates.includes(route.template),
        )
        .map(([group]: [string, readonly TemplateName[]]): string => group);
      expect(groups.length).toBe(1);
    }
  });

  it("keeps the search page out of the index", (): void => {
    const search: RouteEntry | undefined = listRoutes().find(
      (route: RouteEntry): boolean => route.path === "/search/",
    );
    expect(search?.indexable).toBe(false);
  });

  it("gives every route an ISO lastmod", (): void => {
    for (const route of listRoutes()) {
      expect(route.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("downloads", (): void => {
  it("writes a header row even when a dataset is empty", (): void => {
    for (const spec of DOWNLOADS) {
      const csv: string = toCsv(spec);
      expect(csv.split("\n")[0]).toBe(spec.columns.join(","));
    }
  });

  it("quotes values containing separators", (): void => {
    expect(csvEscape('Smith, Inc "the best"')).toBe('"Smith, Inc ""the best"""');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(42)).toBe("42");
  });

  it("gives every dataset a distinct download path", (): void => {
    const paths: Set<string> = new Set<string>(
      DOWNLOADS.map((spec: DownloadSpec): string => spec.csvPath),
    );
    expect(paths.size).toBe(DOWNLOADS.length);
  });
});

describe("no-comments checker", (): void => {
  it("flags line and block comments", (): void => {
    expect(findComments("a.ts", "const a: number = 1;\n").length).toBe(0);
    expect(findComments("a.ts", "const a: number = 1; // why\n").length).toBe(1);
    expect(findComments("a.ts", "/* header */\nconst a: number = 1;").length).toBe(1);
    expect(findComments("a.tsx", "const a = <div>{/* note */}</div>;").length).toBe(1);
  });

  it("does not mistake a comment-like string literal for a comment", (): void => {
    expect(findComments("a.ts", 'const a: string = "// not a comment";').length).toBe(0);
    expect(findComments("a.ts", "const a: string = `/* nope */`;").length).toBe(0);
  });

  it("allows tooling directives only", (): void => {
    expect(isAllowedComment("// eslint-disable-next-line no-console")).toBe(true);
    expect(isAllowedComment("// @ts-expect-error")).toBe(true);
    expect(isAllowedComment("// explain the thing")).toBe(false);
  });
});

describe("html index helpers", (): void => {
  it("maps export files to url paths", (): void => {
    expect(toUrlPath("index.html")).toBe("/");
    expect(toUrlPath("about/index.html")).toBe("/about/");
    expect(toUrlPath("404.html")).toBe("/404.html");
  });

  it("keeps only internal hrefs", (): void => {
    expect(normalizeInternalHref("https://example.com/x")).toBeNull();
    expect(normalizeInternalHref("#main")).toBeNull();
    expect(normalizeInternalHref("mailto:a@b.c")).toBeNull();
    expect(normalizeInternalHref("/county/kent/#lakes")).toBe("/county/kent/");
    expect(normalizeInternalHref("/search/?q=deer")).toBe("/search/");
  });
});
