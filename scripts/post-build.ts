import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "tinyglobby";
import { DOWNLOADS } from "../src/lib/downloads";
import type { DownloadSpec } from "../src/lib/downloads";

const OUT_DIR: string = join(process.cwd(), "out");

function fail(message: string): never {
  process.stderr.write(`post-build: ${message}\n`);
  process.exit(1);
}

function requireFile(relativePath: string): number {
  const target: string = join(OUT_DIR, relativePath);
  if (!existsSync(target)) {
    fail(`expected ${relativePath} in the export output`);
  }
  const size: number = statSync(target).size;
  if (size === 0) {
    fail(`${relativePath} is empty`);
  }
  return size;
}

function main(): void {
  if (!existsSync(OUT_DIR)) {
    fail("out/ does not exist");
  }
  requireFile("index.html");
  requireFile("404.html");
  requireFile("robots.txt");
  requireFile("llms.txt");
  requireFile("sitemap.xml");
  requireFile("og/default.png");

  const sitemapXml: string = readFileSync(join(OUT_DIR, "sitemap.xml"), "utf8");
  const children: string[] = [
    ...sitemapXml.matchAll(/<loc>[^<]*\/(sitemap-[^<\/]+)<\/loc>/g),
  ]
    .map((match: RegExpMatchArray): string => match[1] ?? "")
    .filter((name: string): boolean => name !== "");
  for (const child of children) {
    requireFile(child);
  }

  for (const spec of DOWNLOADS) {
    requireFile(spec.csvPath.replace(/^\//, ""));
    requireFile(spec.jsonPath.replace(/^\//, ""));
  }

  const robots: string = readFileSync(join(OUT_DIR, "robots.txt"), "utf8");
  if (!robots.includes("GPTBot") || !robots.includes("Sitemap:")) {
    fail("robots.txt is missing AI crawler rules or the sitemap reference");
  }

  const htmlFiles: string[] = globSync(["**/*.html"], { cwd: OUT_DIR });
  const downloadCount: number = DOWNLOADS.length * 2;
  process.stdout.write(
    `post-build: ${htmlFiles.length} html files, ${children.length} sitemaps, ${downloadCount} download files verified\n`,
  );
  process.stdout.write(
    `post-build: datasets published: ${DOWNLOADS.map((spec: DownloadSpec): string => spec.key).join(", ")}\n`,
  );
}

main();
