import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DOWNLOADS, toCsv } from "../src/lib/downloads";
import type { DownloadSpec } from "../src/lib/downloads";
import { SITEMAP_GROUPS, listRoutes } from "../src/lib/routes/registry";
import type { RouteEntry } from "../src/lib/routes/registry";
import { summarizeBuildReport } from "../src/lib/quality-gate";
import type { BuildReport, BuildReportRow, TemplateName } from "../src/lib/quality-gate";
import { getMeta } from "../src/lib/data/snapshot";
import { SITE, absoluteUrl } from "../src/lib/site";

const ROOT: string = process.cwd();
const PUBLIC_DIR: string = join(ROOT, "public");
const REPORTS_DIR: string = join(ROOT, "reports");

function write(relativePath: string, contents: string): void {
  const target: string = join(PUBLIC_DIR, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlsetXml(routes: readonly RouteEntry[]): string {
  const entries: string = routes
    .map(
      (route: RouteEntry): string =>
        `  <url>\n    <loc>${xmlEscape(absoluteUrl(route.path))}</loc>\n    <lastmod>${route.lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function sitemapIndexXml(files: readonly { name: string; lastmod: string }[]): string {
  const entries: string = files
    .map(
      (file: { name: string; lastmod: string }): string =>
        `  <sitemap>\n    <loc>${xmlEscape(`${SITE.url}/${file.name}`)}</loc>\n    <lastmod>${file.lastmod}</lastmod>\n  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
}

function newest(values: readonly string[], fallback: string): string {
  const sorted: string[] = [...values].sort();
  return sorted[sorted.length - 1] ?? fallback;
}

function writeSitemaps(routes: readonly RouteEntry[], fallbackDate: string): number {
  const indexable: readonly RouteEntry[] = routes.filter(
    (route: RouteEntry): boolean => route.indexable,
  );
  const files: { name: string; lastmod: string }[] = [];
  for (const [group, templates] of Object.entries(SITEMAP_GROUPS)) {
    const inGroup: RouteEntry[] = indexable.filter((route: RouteEntry): boolean =>
      (templates as readonly TemplateName[]).includes(route.template),
    );
    if (inGroup.length === 0) {
      continue;
    }
    const sorted: RouteEntry[] = [...inGroup].sort(
      (a: RouteEntry, b: RouteEntry): number => a.path.localeCompare(b.path),
    );
    const name: string = `sitemap-${group}.xml`;
    write(name, urlsetXml(sorted));
    files.push({
      name,
      lastmod: newest(
        sorted.map((route: RouteEntry): string => route.lastmod),
        fallbackDate,
      ),
    });
  }
  write("sitemap.xml", sitemapIndexXml(files));
  return indexable.length;
}

function writeDownloads(): void {
  for (const spec of DOWNLOADS) {
    write(spec.csvPath.replace(/^\//, ""), toCsv(spec));
    write(spec.jsonPath.replace(/^\//, ""), `${JSON.stringify(spec.rows(), null, 2)}\n`);
  }
}

function writeLlmsTxt(routes: readonly RouteEntry[], generatedAt: string): void {
  const counts: Map<TemplateName, number> = new Map<TemplateName, number>();
  for (const route of routes) {
    if (route.indexable) {
      counts.set(route.template, (counts.get(route.template) ?? 0) + 1);
    }
  }
  const countLines: string[] = [...counts.entries()]
    .sort((a: [TemplateName, number], b: [TemplateName, number]): number =>
      a[0].localeCompare(b[0]),
    )
    .map(
      ([template, count]: [TemplateName, number]): string =>
        `- ${template}: ${count} pages`,
    );
  const downloadLines: string[] = DOWNLOADS.map(
    (spec: DownloadSpec): string =>
      `- [${spec.label}](${SITE.url}${spec.csvPath}): ${spec.description}`,
  );
  const body: string = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `Published by ${SITE.owner}. Not affiliated with the Michigan Department of Natural Resources.`,
    `Snapshot generated ${generatedAt}.`,
    "",
    "## What this site is",
    "",
    "Michigan-only hunting and fishing reference pages built from public Michigan DNR data.",
    "Every figure carries its source and the date it was retrieved. Nothing is modelled or estimated.",
    "Pages without enough underlying data are not published.",
    "",
    "## Data sources",
    "",
    "- Michigan DNR Open Data (ArcGIS): public land boundaries, boating and fishing access sites. Refreshed monthly.",
    "- Michigan GIS Open Data: county boundaries and geometry. Refreshed quarterly.",
    "- Michigan DNR Fish Stocking Database: stocking history by water and species. Refreshed weekly.",
    "- Michigan DNR reported harvest: county and statewide harvest totals. Refreshed daily in season.",
    "- Michigan DNR inland lake maps index: lake list and official map links. Refreshed quarterly.",
    "- Curated season dates, each carrying a source link and a verification date.",
    "",
    "## Key pages",
    "",
    `- [Home](${SITE.url}/): county index and statewide entry points`,
    `- [Seasons](${SITE.url}/seasons/): season dates by species and zone`,
    `- [Data downloads](${SITE.url}/data/): every dataset as CSV and JSON`,
    `- [Methodology](${SITE.url}/methodology/): collection process, cadence and limitations`,
    `- [About](${SITE.url}/about/): who publishes this and how to send corrections`,
    "",
    "## Datasets",
    "",
    ...downloadLines,
    "",
    "## Page inventory",
    "",
    ...countLines,
    "",
    "## Citation",
    "",
    `Cite as: ${SITE.name}, ${SITE.url}, derived from Michigan DNR public data.`,
    "Regulation summaries on this site are not authoritative; the official Michigan DNR digest is.",
    "",
  ].join("\n");
  write("llms.txt", body);
}

function writeBuildReport(
  routes: readonly RouteEntry[],
  generatedAt: string,
): BuildReport {
  const templates: Set<TemplateName> = new Set<TemplateName>(
    routes.map((route: RouteEntry): TemplateName => route.template),
  );
  const rows: BuildReportRow[] = [...templates]
    .sort((a: TemplateName, b: TemplateName): number => a.localeCompare(b))
    .map((template: TemplateName): BuildReportRow => {
      const inTemplate: RouteEntry[] = routes.filter(
        (route: RouteEntry): boolean => route.template === template,
      );
      const gated: RouteEntry[] = inTemplate.filter(
        (route: RouteEntry): boolean => !route.indexable,
      );
      return {
        template,
        generated: inTemplate.length,
        indexed: inTemplate.length - gated.length,
        gated: gated.length,
        gatedExamples: gated
          .slice(0, 5)
          .map(
            (route: RouteEntry): string =>
              `${route.path} (${route.gateReasons.join("; ")})`,
          ),
      };
    });
  const report: BuildReport = summarizeBuildReport(generatedAt, rows);
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(
    join(REPORTS_DIR, "build-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  return report;
}

function main(): void {
  const generatedAt: string = getMeta().generatedAt;
  const fallbackDate: string = generatedAt.slice(0, 10);
  const routes: readonly RouteEntry[] = listRoutes();
  const indexableCount: number = writeSitemaps(routes, fallbackDate);
  writeDownloads();
  writeLlmsTxt(routes, generatedAt);
  const report: BuildReport = writeBuildReport(routes, fallbackDate);

  process.stdout.write("\nBuild report (pages by template)\n");
  process.stdout.write("  template                     generated  indexed  gated\n");
  for (const row of report.rows) {
    process.stdout.write(
      `  ${row.template.padEnd(28)} ${String(row.generated).padStart(9)} ${String(row.indexed).padStart(8)} ${String(row.gated).padStart(6)}\n`,
    );
  }
  process.stdout.write(
    `  total indexed: ${report.totalIndexed}, total gated: ${report.totalGated}, sitemap urls: ${indexableCount}\n\n`,
  );
}

main();
