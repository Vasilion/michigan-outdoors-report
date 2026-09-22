import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { sequential } from "../lib/db";
import { HARVEST_PAGE_URL, fetchHarvestYear } from "./fetch";
import type { HarvestApiResponse } from "./fetch";
import { collapseDuplicates, parseHarvestResponse } from "./parse";
import type { RawHarvestRow } from "./parse";
import { normalizeHarvestRows, unknownCounties } from "./normalize";
import type { NormalizedHarvestRow } from "./normalize";
import { upsertHarvestRows } from "./upsert";

const FIRST_REPORTING_YEAR: number = 2022;
const SPECIES_SLUG: string = "deer";

export function licenseYearsThrough(currentYear: number): readonly number[] {
  const years: number[] = [];
  for (let year: number = FIRST_REPORTING_YEAR; year <= currentYear; year += 1) {
    years.push(year);
  }
  return years;
}

runImporter(
  "harvest-deer",
  "harvest_snapshots",
  (client: pg.Client): Promise<RunResult> => {
    const currentYear: number = new Date().getUTCFullYear();
    const years: readonly number[] = licenseYearsThrough(currentYear);
    const collected: RawHarvestRow[] = [];

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
      .then((countySlugs: ReadonlySet<string>): Promise<RunResult> =>
        sequential(years, (year: number): Promise<void> =>
          fetchHarvestYear(year).then((response: HarvestApiResponse): void => {
            const rows: readonly RawHarvestRow[] = parseHarvestResponse(response, year);
            process.stdout.write(`[harvest-deer] ${year}: ${rows.length} county rows\n`);
            collected.push(...rows);
          }),
        ).then((): Promise<RunResult> => {
          const merged: readonly RawHarvestRow[] = collapseDuplicates(collected);
          const missing: readonly string[] = unknownCounties(merged, countySlugs);
          if (missing.length > 0) {
            throw new Error(
              `harvest rows reference counties that are not in the database: ${missing.join(", ")}`,
            );
          }
          const normalized: readonly NormalizedHarvestRow[] = normalizeHarvestRows(
            merged,
            SPECIES_SLUG,
            currentYear,
            countySlugs,
          );
          return upsertHarvestRows(client, normalized, HARVEST_PAGE_URL).then(
            (upserted: number): RunResult => ({
              rowsIn: collected.length,
              rowsUpserted: upserted,
            }),
          );
        }),
      );
  },
);
