import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR, isNoindex, loadPages } from "./lib/html-index";
import type { PageInfo } from "./lib/html-index";
import { listRoutes } from "../src/lib/routes/registry";
import type { RouteEntry } from "../src/lib/routes/registry";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";
import { SITE, absoluteUrl } from "../src/lib/site";

const TITLE_HARD_MAX: number = 75;

type Problem = {
  readonly where: string;
  readonly message: string;
};

function problem(where: string, message: string): Problem {
  return { where, message };
}

function checkPerPage(pages: readonly PageInfo[]): readonly Problem[] {
  const problems: Problem[] = [];
  for (const page of pages) {
    const where: string = page.urlPath;
    if (page.title === null || page.title.trim() === "") {
      problems.push(problem(where, "missing <title>"));
    } else if (page.title.length > TITLE_HARD_MAX) {
      problems.push(
        problem(
          where,
          `title is ${page.title.length} chars (hard max ${TITLE_HARD_MAX})`,
        ),
      );
    }
    if (page.description === null || page.description.trim() === "") {
      problems.push(problem(where, "missing meta description"));
    } else if (page.description.length > DESCRIPTION_MAX) {
      problems.push(
        problem(
          where,
          `meta description is ${page.description.length} chars (max ${DESCRIPTION_MAX})`,
        ),
      );
    }
    if (page.h1s.length !== 1) {
      problems.push(problem(where, `expected exactly one h1, found ${page.h1s.length}`));
    }
    if (!isNoindex(page)) {
      const expected: string = absoluteUrl(page.urlPath);
      if (page.canonical === null) {
        problems.push(problem(where, "missing canonical"));
      } else if (page.canonical !== expected) {
        problems.push(
          problem(where, `canonical is ${page.canonical}, expected ${expected}`),
        );
      }
    }
    for (const raw of page.jsonLdRaw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        const asRecord: Record<string, unknown> = parsed as Record<string, unknown>;
        if (asRecord["@context"] === undefined || asRecord["@type"] === undefined) {
          problems.push(problem(where, "JSON-LD block is missing @context or @type"));
        }
      } catch {
        problems.push(problem(where, "JSON-LD block is not valid JSON"));
      }
    }
  }
  return problems;
}

function checkUniqueness(pages: readonly PageInfo[]): readonly Problem[] {
  const problems: Problem[] = [];
  const titles: Map<string, string[]> = new Map<string, string[]>();
  const descriptions: Map<string, string[]> = new Map<string, string[]>();
  for (const page of pages) {
    if (isNoindex(page)) {
      continue;
    }
    if (page.title !== null) {
      const bucket: string[] = titles.get(page.title) ?? [];
      bucket.push(page.urlPath);
      titles.set(page.title, bucket);
    }
    if (page.description !== null) {
      const bucket: string[] = descriptions.get(page.description) ?? [];
      bucket.push(page.urlPath);
      descriptions.set(page.description, bucket);
    }
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) {
      problems.push(problem(paths.join(", "), `duplicate title: ${title}`));
    }
  }
  for (const [description, paths] of descriptions) {
    if (paths.length > 1) {
      problems.push(
        problem(
          paths.join(", "),
          `duplicate meta description: ${description.slice(0, 60)}...`,
        ),
      );
    }
  }
  return problems;
}

function sitemapUrls(): readonly string[] {
  const indexPath: string = join(OUT_DIR, "sitemap.xml");
  if (!existsSync(indexPath)) {
    return [];
  }
  const indexXml: string = readFileSync(indexPath, "utf8");
  const childNames: string[] = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match: RegExpMatchArray): string => (match[1] ?? "").replace(`${SITE.url}/`, ""),
  );
  const urls: string[] = [];
  for (const childName of childNames) {
    const childPath: string = join(OUT_DIR, childName);
    if (!existsSync(childPath)) {
      continue;
    }
    const childXml: string = readFileSync(childPath, "utf8");
    for (const match of childXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.push(match[1] ?? "");
    }
  }
  return urls;
}

function checkSitemaps(pages: readonly PageInfo[]): readonly Problem[] {
  const problems: Problem[] = [];
  const routes: readonly RouteEntry[] = listRoutes();
  const expected: Set<string> = new Set<string>(
    routes
      .filter((route: RouteEntry): boolean => route.indexable)
      .map((route: RouteEntry): string => absoluteUrl(route.path)),
  );
  const actual: Set<string> = new Set<string>(sitemapUrls());
  for (const url of expected) {
    if (!actual.has(url)) {
      problems.push(problem("sitemap", `indexable route missing from sitemaps: ${url}`));
    }
  }
  for (const url of actual) {
    if (!expected.has(url)) {
      problems.push(problem("sitemap", `sitemap contains a non-indexable url: ${url}`));
    }
  }
  const noindexUrls: Set<string> = new Set<string>(
    pages
      .filter((page: PageInfo): boolean => isNoindex(page))
      .map((page: PageInfo): string => absoluteUrl(page.urlPath)),
  );
  for (const url of noindexUrls) {
    if (actual.has(url)) {
      problems.push(problem("sitemap", `noindex page is listed in a sitemap: ${url}`));
    }
  }
  return problems;
}

function checkRoutesEmitted(pages: readonly PageInfo[]): readonly Problem[] {
  const emitted: Set<string> = new Set<string>(
    pages.map((page: PageInfo): string => page.urlPath),
  );
  return listRoutes()
    .filter((route: RouteEntry): boolean => route.indexable && !emitted.has(route.path))
    .map((route: RouteEntry): Problem =>
      problem("build", `indexable route was never emitted as HTML: ${route.path}`),
    );
}

function checkRequiredFiles(): readonly Problem[] {
  const required: readonly string[] = ["robots.txt", "sitemap.xml", "llms.txt"];
  return required
    .filter((file: string): boolean => !existsSync(join(OUT_DIR, file)))
    .map((file: string): Problem => problem("build", `missing required file: /${file}`));
}

function main(): void {
  if (!existsSync(OUT_DIR)) {
    process.stderr.write("out/ does not exist. Run pnpm build first.\n");
    process.exit(1);
  }
  const pages: readonly PageInfo[] = loadPages();
  const problems: Problem[] = [
    ...checkRequiredFiles(),
    ...checkPerPage(pages),
    ...checkUniqueness(pages),
    ...checkSitemaps(pages),
    ...checkRoutesEmitted(pages),
  ];
  if (problems.length > 0) {
    process.stderr.write(`SEO check failed with ${problems.length} problem(s):\n`);
    for (const entry of problems) {
      process.stderr.write(`  [${entry.where}] ${entry.message}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(
    `SEO check passed: ${pages.length} pages, titles and descriptions unique, sitemaps consistent, title budget ${TITLE_MAX} target / ${TITLE_HARD_MAX} hard max\n`,
  );
}

main();
