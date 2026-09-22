import type pg from "pg";
import { sequential } from "../lib/db";
import type { NormalizedHarvestRow } from "./normalize";

const UPSERT_SQL: string = `
INSERT INTO harvest_snapshots (
  county_id, species_id, season_year, antlered, antlerless, total,
  snapshot_date, is_final, source_url, source_record_id, fetched_at
)
SELECT c.id, s.id, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, now()
FROM counties c, species s
WHERE c.slug = $1 AND s.slug = $2
ON CONFLICT (county_id, species_id, season_year, snapshot_date) DO UPDATE SET
  antlered = EXCLUDED.antlered,
  antlerless = EXCLUDED.antlerless,
  total = EXCLUDED.total,
  is_final = EXCLUDED.is_final,
  source_url = EXCLUDED.source_url,
  fetched_at = now()`;

export function upsertHarvestRows(
  client: pg.Client,
  rows: readonly NormalizedHarvestRow[],
  sourceUrl: string,
): Promise<number> {
  let upserted: number = 0;
  return sequential(rows, (row: NormalizedHarvestRow): Promise<unknown> => {
    upserted += 1;
    return client.query(UPSERT_SQL, [
      row.countySlug,
      row.speciesSlug,
      row.seasonYear,
      row.antlered,
      row.antlerless,
      row.total,
      row.isFinal,
      sourceUrl,
      `${row.countySlug}-${row.speciesSlug}-${row.seasonYear}`,
    ]);
  }).then((): number => upserted);
}
