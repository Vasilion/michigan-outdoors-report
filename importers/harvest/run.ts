import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { sequential } from "../lib/db";
import { HARVEST_PAGE_URL, HARVEST_SOURCES, fetchHarvestYear } from "./fetch";
import type { HarvestApiResponse, HarvestSource } from "./fetch";
import { collapseDuplicates, parseHarvestResponse } from "./parse";
import type { RawHarvestRow } from "./parse";
import { normalizeHarvestRows, unknownCounties } from "./normalize";
import type { NormalizedHarvestRow } from "./normalize";
import { upsertHarvestRows } from "./upsert";

export function licenseYearsThrough(
  firstYear: number,
  currentYear: number,
): readonly number[] {
  const years: number[] = [];
  for (let year: number = firstYear; year <= currentYear; year += 1) {
    years.push(year);
  }
  return years;
}

runImporter("harvest", "harvest_snapshots", (client: pg.Client): Promise<RunResult> => {
  const currentYear: number = new Date().getUTCFullYear();
  let rowsIn: number = 0;
  let rowsUpserted: number = 0;

  return client
    .query("SELECT slug FROM counties")
    .then((result: pg.QueryResult): ReadonlySet<string> => {
      const slugs: Set<string> = new Set<string>();
      for (const row of result.rows as { slug: string }[]) {
        slugs.add(row.slug);
      }
      if (slugs.size === 0) {
        throw new Error("counties must be imported before harvest data");
      }
      return slugs;
    })
    .then((countySlugs: ReadonlySet<string>): Promise<void> =>
      sequential(HARVEST_SOURCES, (source: HarvestSource): Promise<void> => {
        const collected: RawHarvestRow[] = [];
        const years: readonly number[] = licenseYearsThrough(
          source.firstYear,
          currentYear,
        );
        return sequential(years, (year: number): Promise<void> =>
          fetchHarvestYear(year, source.url).then(
            (response: HarvestApiResponse): void => {
              if (!response.Success) {
                process.stdout.write(
                  `[harvest] ${source.speciesSlug} ${year}: no data published\n`,
                );
                return;
              }
              const rows: readonly RawHarvestRow[] = parseHarvestResponse(response, year);
              process.stdout.write(
                `[harvest] ${source.speciesSlug} ${year}: ${rows.length} county rows\n`,
              );
              collected.push(...rows);
            },
          ),
        ).then((): Promise<void> => {
          if (collected.length === 0) {
            return Promise.resolve();
          }
          const merged: readonly RawHarvestRow[] = collapseDuplicates(collected);
          const missing: readonly string[] = unknownCounties(merged, countySlugs);
          if (missing.length > 0) {
            throw new Error(
              `harvest rows reference counties that are not in the database: ${missing.join(", ")}`,
            );
          }
          const normalized: readonly NormalizedHarvestRow[] = normalizeHarvestRows(
            merged,
            source.speciesSlug,
            currentYear,
            countySlugs,
          );
          rowsIn += collected.length;
          return upsertHarvestRows(client, normalized, HARVEST_PAGE_URL).then(
            (upserted: number): void => {
              rowsUpserted += upserted;
            },
          );
        });
      }),
    )
    .then((): RunResult => ({ rowsIn, rowsUpserted }));
});
