import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { GeoJsonFeature } from "../lib/arcgis";
import { fetchLakes } from "./fetch";
import { parseLakes } from "./parse";
import type { RawLake } from "./parse";
import { normalizeLakes } from "./normalize";
import type { NormalizedLake } from "./normalize";
import { assignSlugs, deleteStaleLakes, resolveCounties, upsertLakes } from "./upsert";
import type { PlacedLake } from "./upsert";

runImporter("lakes", "lakes", (client: pg.Client): Promise<RunResult> =>
  fetchLakes().then((features: readonly GeoJsonFeature[]): Promise<RunResult> => {
    const raws: readonly RawLake[] = parseLakes(features);
    const lakes: readonly NormalizedLake[] = normalizeLakes(raws);
    process.stdout.write(
      `[lakes] ${features.length} source features, ${lakes.length} publishable lakes\n`,
    );
    const runStartedAt: string = new Date().toISOString();
    return resolveCounties(client, lakes)
      .then((counties: Map<string, string | null>): Promise<number> => {
        const placed: readonly PlacedLake[] = assignSlugs(lakes, counties);
        const unplaced: number = placed.filter(
          (entry: PlacedLake): boolean => entry.countySlug === null,
        ).length;
        process.stdout.write(
          `[lakes] ${placed.length - unplaced} placed in a county, ${unplaced} outside county polygons\n`,
        );
        return upsertLakes(client, placed);
      })
      .then((upserted: number): Promise<number> =>
        deleteStaleLakes(client, runStartedAt).then((removed: number): number => {
          if (removed > 0) {
            process.stdout.write(
              `[lakes] removed ${removed} lake(s) no longer in the source\n`,
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
