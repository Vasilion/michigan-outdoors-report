import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { GeoJsonFeature } from "../lib/arcgis";
import { fetchMasterAngler, masterAnglerSourceUrl } from "./fetch";
import { normalizeEntries, speciesFromEntries } from "./normalize";
import type { NormalizedEntry } from "./normalize";
import {
  deleteStaleEntries,
  fillMissingCounties,
  linkWaters,
  upsertEntries,
  upsertMasterAnglerSpecies,
} from "./upsert";

runImporter(
  "master-angler",
  "master_angler_entries",
  (client: pg.Client): Promise<RunResult> => {
    const runStartedAt: string = new Date().toISOString();
    return fetchMasterAngler().then(
      (features: readonly GeoJsonFeature[]): Promise<RunResult> => {
        const entries: readonly NormalizedEntry[] = normalizeEntries(features);
        const species: readonly { readonly slug: string; readonly name: string }[] =
          speciesFromEntries(entries);
        const records: number = entries.filter(
          (entry: NormalizedEntry): boolean => entry.stateRecord,
        ).length;
        const years: number[] = entries.map(
          (entry: NormalizedEntry): number => entry.caughtYear,
        );
        process.stdout.write(
          `[master-angler] ${entries.length} entries across ${species.length} species, ${records} current state records, ${Math.min(...years)} to ${Math.max(...years)}\n`,
        );
        return upsertMasterAnglerSpecies(client, species)
          .then((): Promise<number> =>
            upsertEntries(client, entries, masterAnglerSourceUrl()),
          )
          .then((): Promise<number> => deleteStaleEntries(client, runStartedAt))
          .then((removed: number): Promise<number> => {
            if (removed > 0) {
              process.stdout.write(`[master-angler] removed ${removed} stale entry(s)\n`);
            }
            return fillMissingCounties(client);
          })
          .then((filled: number): Promise<{ lakes: number; rivers: number }> => {
            process.stdout.write(
              `[master-angler] resolved ${filled} blank county value(s) from coordinates\n`,
            );
            return linkWaters(client);
          })
          .then((links: { lakes: number; rivers: number }): RunResult => {
            process.stdout.write(
              `[master-angler] linked ${links.lakes} entries to lakes and ${links.rivers} to rivers\n`,
            );
            return { rowsIn: features.length, rowsUpserted: entries.length };
          });
      },
    );
  },
);
