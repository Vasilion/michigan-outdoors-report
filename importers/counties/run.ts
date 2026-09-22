import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { fetchCounties } from "./fetch";
import { parseCounties } from "./parse";
import { normalizeCounties } from "./normalize";
import { rebuildAdjacency, upsertCounties } from "./upsert";
import type { GeoJsonFeature } from "../lib/arcgis";
import type { NormalizedCounty } from "./normalize";
import type { RawCounty } from "./parse";

runImporter("counties", "counties", (client: pg.Client): Promise<RunResult> =>
  fetchCounties().then((features: readonly GeoJsonFeature[]): Promise<RunResult> => {
    const raws: readonly RawCounty[] = parseCounties(features);
    const counties: readonly NormalizedCounty[] = normalizeCounties(raws);
    return upsertCounties(client, counties)
      .then((upserted: number): Promise<number> =>
        rebuildAdjacency(client).then((pairs: number): number => {
          process.stdout.write(`[counties] ${pairs} adjacency pairs\n`);
          return upserted;
        }),
      )
      .then((upserted: number): RunResult => ({
        rowsIn: features.length,
        rowsUpserted: upserted,
      }));
  }),
);
