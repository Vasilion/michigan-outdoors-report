import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { fetchStocking } from "./fetch";
import type { StockingApiRow } from "./fetch";
import { distinctSpecies, normalizeStocking } from "./normalize";
import type { NormalizedStocking } from "./normalize";
import { deleteStaleStocking, upsertSpecies, upsertStocking } from "./upsert";

runImporter("stocking", "stocking_events", (client: pg.Client): Promise<RunResult> =>
  fetchStocking().then((rows: readonly StockingApiRow[]): Promise<RunResult> => {
    const normalized: readonly NormalizedStocking[] = normalizeStocking(rows);
    const species: readonly { slug: string; name: string }[] =
      distinctSpecies(normalized);
    process.stdout.write(
      `[stocking] ${rows.length} source rows, ${normalized.length} usable, ${species.length} species\n`,
    );
    const runStartedAt: string = new Date().toISOString();
    return upsertSpecies(client, species)
      .then((): Promise<number> => upsertStocking(client, normalized))
      .then((upserted: number): Promise<number> =>
        deleteStaleStocking(client, runStartedAt).then((removed: number): number => {
          if (removed > 0) {
            process.stdout.write(
              `[stocking] removed ${removed} event(s) no longer in the source window\n`,
            );
          }
          return upserted;
        }),
      )
      .then((upserted: number): RunResult => ({
        rowsIn: rows.length,
        rowsUpserted: upserted,
      }));
  }),
);
