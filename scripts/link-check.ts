import { existsSync } from "node:fs";
import { join } from "node:path";
import { OUT_DIR, isNoindex, loadPages } from "./lib/html-index";
import type { PageInfo } from "./lib/html-index";

type Problem = {
  readonly where: string;
  readonly message: string;
};

const ORPHAN_EXEMPT: ReadonlySet<string> = new Set<string>(["/", "/404.html"]);

function targetExists(urlPath: string): boolean {
  if (urlPath.endsWith("/")) {
    return existsSync(join(OUT_DIR, urlPath.slice(1), "index.html"));
  }
  return existsSync(join(OUT_DIR, urlPath.slice(1)));
}

function main(): void {
  if (!existsSync(OUT_DIR)) {
    process.stderr.write("out/ does not exist. Run pnpm build first.\n");
    process.exit(1);
  }
  const pages: readonly PageInfo[] = loadPages();
  const problems: Problem[] = [];
  const linkedTo: Set<string> = new Set<string>();

  for (const page of pages) {
    for (const href of page.internalLinks) {
      if (href !== page.urlPath) {
        linkedTo.add(href);
      }
      if (!targetExists(href)) {
        problems.push({ where: page.urlPath, message: `broken internal link: ${href}` });
      }
    }
  }

  for (const page of pages) {
    if (ORPHAN_EXEMPT.has(page.urlPath) || isNoindex(page)) {
      continue;
    }
    if (!linkedTo.has(page.urlPath)) {
      problems.push({
        where: page.urlPath,
        message: "orphan page: no other page links to it",
      });
    }
  }

  if (problems.length > 0) {
    process.stderr.write(`Link check failed with ${problems.length} problem(s):\n`);
    for (const entry of problems) {
      process.stderr.write(`  [${entry.where}] ${entry.message}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(
    `Link check passed: ${pages.length} pages, ${linkedTo.size} distinct internal targets, no orphans\n`,
  );
}

main();
