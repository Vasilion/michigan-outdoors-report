import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import type { GeoJsonFeature } from "../lib/arcgis";
import { UNIT_SPECS, fetchUnits, unitSourceUrl } from "./fetch";
import type { UnitSpec } from "./fetch";
import { normalizeUnits } from "./normalize";
import type { NormalizedUnit } from "./normalize";
import { deleteStaleUnits, linkUnitCounties, upsertUnits } from "./upsert";

type Totals = {
  readonly rowsIn: number;
  readonly rowsUpserted: number;
};

function importSpec(client: pg.Client, spec: UnitSpec, totals: Totals): Promise<Totals> {
  return fetchUnits(spec).then((features: readonly GeoJsonFeature[]): Promise<Totals> => {
    const units: readonly NormalizedUnit[] = normalizeUnits(spec, features);
    process.stdout.write(
      `[management-units] ${spec.speciesSlug}: ${features.length} shapes into ${units.length} units\n`,
    );
    return upsertUnits(client, units, unitSourceUrl(spec)).then(
      (upserted: number): Totals => ({
        rowsIn: totals.rowsIn + features.length,
        rowsUpserted: totals.rowsUpserted + upserted,
      }),
    );
  });
}

runImporter(
  "management-units",
  "management_units",
  (client: pg.Client): Promise<RunResult> => {
    const runStartedAt: string = new Date().toISOString();
    return UNIT_SPECS.reduce(
      (chain: Promise<Totals>, spec: UnitSpec): Promise<Totals> =>
        chain.then((totals: Totals): Promise<Totals> => importSpec(client, spec, totals)),
      Promise.resolve({ rowsIn: 0, rowsUpserted: 0 }),
    )
      .then((totals: Totals): Promise<Totals> =>
        deleteStaleUnits(client, runStartedAt).then((removed: number): Totals => {
          if (removed > 0) {
            process.stdout.write(`[management-units] removed ${removed} stale unit(s)\n`);
          }
          return totals;
        }),
      )
      .then((totals: Totals): Promise<RunResult> =>
        linkUnitCounties(client).then((links: number): RunResult => {
          process.stdout.write(`[management-units] ${links} unit-county links\n`);
          return totals;
        }),
      );
  },
);
