import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_DIR: string = join(process.cwd(), "raw-cache");
const MIN_INTERVAL_MS: number = 1000;
const MAX_ATTEMPTS: number = 4;

export type FetchOptions = {
  readonly cacheKey?: string;
  readonly useCache?: boolean;
};

export function userAgent(): string {
  const contact: string =
    process.env.IMPORTER_CONTACT_EMAIL ?? "contact@michiganoutdoorsreport.com";
  return `MichiganOutdoorsReportBot/1.0 (+https://michiganoutdoorsreport.com/about/; ${contact})`;
}

export function cachePathFor(url: string, cacheKey: string | undefined): string {
  const hash: string = createHash("sha256").update(url).digest("hex").slice(0, 16);
  const name: string = cacheKey === undefined ? hash : `${cacheKey}-${hash}`;
  return join(CACHE_DIR, `${name}.txt`);
}

let lastRequestAt: number = 0;

function waitForSlot(): Promise<void> {
  const now: number = Date.now();
  const elapsed: number = now - lastRequestAt;
  const delay: number = elapsed >= MIN_INTERVAL_MS ? 0 : MIN_INTERVAL_MS - elapsed;
  lastRequestAt = now + delay;
  return delay === 0
    ? Promise.resolve()
    : new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, delay);
      });
}

export function backoffDelayMs(attempt: number): number {
  return Math.min(30_000, 500 * Math.pow(2, attempt));
}

function attemptFetch(url: string, attempt: number): Promise<string> {
  return waitForSlot()
    .then((): Promise<Response> =>
      fetch(url, {
        headers: { "user-agent": userAgent(), accept: "*/*" },
        redirect: "follow",
      }),
    )
    .then((response: Response): Promise<string> => {
      if (response.ok) {
        return response.text();
      }
      const retryable: boolean = response.status >= 500 || response.status === 429;
      if (retryable && attempt + 1 < MAX_ATTEMPTS) {
        return new Promise<string>((resolve: (value: Promise<string>) => void): void => {
          setTimeout((): void => {
            resolve(attemptFetch(url, attempt + 1));
          }, backoffDelayMs(attempt));
        });
      }
      return Promise.reject(
        new Error(`GET ${url} failed with ${response.status} ${response.statusText}`),
      );
    });
}

export function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const useCache: boolean = options.useCache ?? process.env.IMPORTER_USE_CACHE === "1";
  const cachePath: string = cachePathFor(url, options.cacheKey);
  if (useCache && existsSync(cachePath)) {
    return Promise.resolve(readFileSync(cachePath, "utf8"));
  }
  return attemptFetch(url, 0).then((body: string): string => {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, body, "utf8");
    return body;
  });
}

export function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  return fetchText(url, options).then((body: string): T => JSON.parse(body) as T);
}
