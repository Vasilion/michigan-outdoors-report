import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listIndexableRoutes } from "../src/lib/routes/registry";
import { SITE, absoluteUrl } from "../src/lib/site";

const STATE_PATH: string = join(process.cwd(), "data", "route-lastmod.json");
const MAX_URLS: number = 5000;
const ENDPOINT: string = "https://api.indexnow.org/IndexNow";

type LastmodMap = Record<string, string>;

function currentMap(): LastmodMap {
  const map: LastmodMap = {};
  for (const route of listIndexableRoutes()) {
    map[route.path] = route.lastmod;
  }
  return map;
}

function previousMap(): LastmodMap | null {
  if (!existsSync(STATE_PATH)) {
    return null;
  }
  const parsed: unknown = JSON.parse(readFileSync(STATE_PATH, "utf8"));
  return parsed as LastmodMap;
}

export function changedPaths(
  previous: LastmodMap | null,
  current: LastmodMap,
): readonly string[] {
  if (previous === null) {
    return Object.keys(current).sort();
  }
  const changed: string[] = [];
  for (const [path, lastmod] of Object.entries(current)) {
    if (previous[path] !== lastmod) {
      changed.push(path);
    }
  }
  return changed.sort();
}

function submit(key: string, urls: readonly string[]): Promise<void> {
  const host: string = new URL(SITE.url).host;
  const body: string = JSON.stringify({
    host,
    key,
    keyLocation: absoluteUrl(`/${key}.txt`),
    urlList: urls,
  });
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body,
  }).then((response: Response): void => {
    if (response.status >= 400) {
      throw new Error(`IndexNow returned ${response.status}`);
    }
    console.log(`indexnow: submitted ${urls.length} url(s), status ${response.status}`);
  });
}

function main(): Promise<void> {
  const key: string = process.env.INDEXNOW_KEY ?? "";
  const current: LastmodMap = currentMap();
  const changed: readonly string[] = changedPaths(previousMap(), current);

  writeFileSync(STATE_PATH, `${JSON.stringify(current, null, 2)}\n`, "utf8");

  if (changed.length === 0) {
    console.log("indexnow: no routes changed");
    return Promise.resolve();
  }
  if (key === "") {
    console.log(
      `indexnow: ${changed.length} route(s) changed but INDEXNOW_KEY is not set, skipping`,
    );
    return Promise.resolve();
  }
  if (changed.length > MAX_URLS) {
    console.log(
      `indexnow: ${changed.length} route(s) changed, which is more than ${MAX_URLS}; letting the sitemaps carry it instead`,
    );
    return Promise.resolve();
  }
  return submit(
    key,
    changed.map((path: string): string => absoluteUrl(path)),
  );
}

main().catch((cause: unknown): void => {
  console.error(cause);
  process.exitCode = 1;
});
