import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { CentroidFeature } from "../lib/arcgis";
import {
  commercialForestSourceUrl,
  fetchCommercialForest,
  fetchHunterAccess,
  hapSourceUrl,
} from "./fetch";
import {
  activeHunterAccess,
  normalizeCommercialForest,
  normalizeHunterAccess,
} from "./normalize";
import type { NormalizedParcel } from "./normalize";
import {
  aggregateProgram,
  deleteStaleParcels,
  unplacedParcels,
  upsertParcels,
} from "./upsert";

function acresOf(parcels: readonly NormalizedParcel[]): number {
  return Math.round(
    parcels.reduce(
      (total: number, parcel: NormalizedParcel): number => total + (parcel.acres ?? 0),
      0,
    ),
  );
}

runImporter(
  "land-programs",
  "land_program_parcels",
  (client: pg.Client): Promise<RunResult> => {
    const runStartedAt: string = new Date().toISOString();
    return fetchHunterAccess().then(
      (hapFeatures: readonly CentroidFeature[]): Promise<RunResult> => {
        const hap: readonly NormalizedParcel[] = normalizeHunterAccess(hapFeatures);
        const active: readonly NormalizedParcel[] = activeHunterAccess(hap);
        process.stdout.write(
          `[land-programs] hunter access: ${hap.length} parcels, ${active.length} active, ${acresOf(active)} active acres\n`,
        );
        return fetchCommercialForest().then(
          (cfFeatures: readonly CentroidFeature[]): Promise<RunResult> => {
            const forest: readonly NormalizedParcel[] =
              normalizeCommercialForest(cfFeatures);
            process.stdout.write(
              `[land-programs] commercial forest: ${forest.length} parcels, ${acresOf(forest)} acres\n`,
            );
            return upsertParcels(client, hap)
              .then((): Promise<number> => upsertParcels(client, forest))
              .then((): Promise<number> =>
                deleteStaleParcels(client, "hunter_access", runStartedAt),
              )
              .then((): Promise<number> =>
                deleteStaleParcels(client, "commercial_forest", runStartedAt),
              )
              .then((): Promise<number> =>
                aggregateProgram(client, "hunter_access", hapSourceUrl()),
              )
              .then((hapCounties: number): Promise<number> => {
                process.stdout.write(
                  `[land-programs] hunter access placed in ${hapCounties} counties\n`,
                );
                return aggregateProgram(
                  client,
                  "commercial_forest",
                  commercialForestSourceUrl(),
                );
              })
              .then((forestCounties: number): Promise<number> => {
                process.stdout.write(
                  `[land-programs] commercial forest placed in ${forestCounties} counties\n`,
                );
                return unplacedParcels(client, "hunter_access");
              })
              .then((hapUnplaced: number): Promise<number> => {
                if (hapUnplaced > 0) {
                  process.stdout.write(
                    `[land-programs] ${hapUnplaced} hunter access parcel(s) fell outside every county boundary\n`,
                  );
                }
                return unplacedParcels(client, "commercial_forest");
              })
              .then((forestUnplaced: number): RunResult => {
                if (forestUnplaced > 0) {
                  process.stdout.write(
                    `[land-programs] ${forestUnplaced} commercial forest parcel(s) fell outside every county boundary\n`,
                  );
                }
                return {
                  rowsIn: hap.length + forest.length,
                  rowsUpserted: hap.length + forest.length,
                };
              });
          },
        );
      },
    );
  },
);
