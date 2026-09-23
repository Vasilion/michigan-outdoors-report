import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { GeoJsonFeature } from "../lib/arcgis";
import { fetchBlueRibbon, fetchFlowlines, fetchTroutRegs } from "./fetch";
import {
  blueRibbonByName,
  knownRiverNames,
  normalizeRivers,
  troutDesignationsByName,
} from "./normalize";
import type {
  BlueRibbonReach,
  NormalizedRiver,
  RiverSeed,
  TroutDesignation,
} from "./normalize";
import {
  deleteStaleRivers,
  linkRiverRecords,
  readRiverSeeds,
  upsertRivers,
} from "./upsert";

runImporter("rivers", "rivers", (client: pg.Client): Promise<RunResult> =>
  readRiverSeeds(client).then((seeds: readonly RiverSeed[]): Promise<RunResult> => {
    process.stdout.write(
      `[rivers] ${seeds.length} named water and county pairs with records\n`,
    );
    return fetchFlowlines().then(
      (flowlines: readonly GeoJsonFeature[]): Promise<RunResult> =>
        fetchTroutRegs().then((regs: readonly GeoJsonFeature[]): Promise<RunResult> =>
          fetchBlueRibbon().then(
            (ribbon: readonly GeoJsonFeature[]): Promise<RunResult> => {
              const known: Set<string> = knownRiverNames(flowlines);
              const trout: Map<string, TroutDesignation> = troutDesignationsByName(regs);
              const blue: Map<string, BlueRibbonReach> = blueRibbonByName(ribbon);
              const rivers: readonly NormalizedRiver[] = normalizeRivers(
                seeds,
                known,
                trout,
                blue,
              );
              const designated: number = rivers.filter(
                (river: NormalizedRiver): boolean => river.designated,
              ).length;
              const blueRibbon: number = rivers.filter(
                (river: NormalizedRiver): boolean => river.blueRibbon,
              ).length;
              process.stdout.write(
                `[rivers] ${flowlines.length} flowline segments name ${known.size} waters, ${regs.length} trout reg segments\n`,
              );
              process.stdout.write(
                `[rivers] ${rivers.length} river pages seeded, ${designated} designated trout streams, ${blueRibbon} Blue Ribbon\n`,
              );
              const runStartedAt: string = new Date().toISOString();
              return upsertRivers(client, rivers)
                .then((upserted: number): Promise<number> =>
                  deleteStaleRivers(client, runStartedAt).then(
                    (removed: number): number => {
                      if (removed > 0) {
                        process.stdout.write(
                          `[rivers] removed ${removed} stale river(s)\n`,
                        );
                      }
                      return upserted;
                    },
                  ),
                )
                .then((upserted: number): Promise<RunResult> =>
                  linkRiverRecords(client).then(
                    (links: { stocking: number; access: number }): RunResult => {
                      process.stdout.write(
                        `[rivers] linked ${links.stocking} stocking events and ${links.access} access sites\n`,
                      );
                      return { rowsIn: seeds.length, rowsUpserted: upserted };
                    },
                  ),
                );
            },
          ),
        ),
    );
  }),
);
