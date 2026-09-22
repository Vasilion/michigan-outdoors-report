import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { GeoJsonFeature } from "../lib/arcgis";
import { fetchAccessSites } from "./fetch";
import { parseAccessSites } from "./parse";
import type { RawAccessSite } from "./parse";
import { normalizeAccessSites } from "./normalize";
import type { NormalizedAccessSite } from "./normalize";
import { deleteStaleAccessSites, upsertAccessSites } from "./upsert";

runImporter("access-sites", "access_sites", (client: pg.Client): Promise<RunResult> =>
  fetchAccessSites().then((features: readonly GeoJsonFeature[]): Promise<RunResult> => {
    const raws: readonly RawAccessSite[] = parseAccessSites(features);
    const sites: readonly NormalizedAccessSite[] = normalizeAccessSites(raws);
    process.stdout.write(
      `[access-sites] ${features.length} source features, ${sites.length} usable sites\n`,
    );
    const runStartedAt: string = new Date().toISOString();
    return upsertAccessSites(client, sites)
      .then((upserted: number): Promise<number> =>
        deleteStaleAccessSites(client, runStartedAt).then((removed: number): number => {
          if (removed > 0) {
            process.stdout.write(
              `[access-sites] removed ${removed} site(s) no longer in the source\n`,
            );
          }
          return upserted;
        }),
      )
      .then((upserted: number): RunResult => ({
        rowsIn: features.length,
        rowsUpserted: upserted,
      }));
  }),
);
