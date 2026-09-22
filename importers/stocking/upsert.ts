import type pg from "pg";
import { sequential } from "../lib/db";
import { STOCKING_DASHBOARD_URL } from "./fetch";
import type { NormalizedStocking } from "./normalize";

const SPECIES_SQL: string = `
INSERT INTO species (name, plural_name, slug, kind, same_as_url, official_url, updated_at)
VALUES ($1, $2, $3, 'fish'::species_kind, NULL, NULL, now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plural_name = EXCLUDED.plural_name`;

const EVENT_SQL: string = `
INSERT INTO stocking_events (
  water_type, water_name, lake_id, river_id, county_id, county_name, species_id,
  strain, count, avg_length_in, stocked_on, source_url, source_record_id, fetched_at
)
SELECT
  $1::water_type, $2,
  CASE WHEN $1 = 'lake' THEN (
    SELECT l.id FROM lakes l
    JOIN counties c2 ON c2.id = l.county_id
    WHERE lower(l.name) = lower($3) AND c2.slug = $4
    ORDER BY l.acres DESC NULLS LAST
    LIMIT 1
  ) ELSE NULL END,
  NULL,
  (SELECT c.id FROM counties c WHERE c.slug = $4),
  $5,
  (SELECT s.id FROM species s WHERE s.slug = $6),
  $7, $8, $9, $10::date, $11, $12, now()
WHERE EXISTS (SELECT 1 FROM species s WHERE s.slug = $6)
ON CONFLICT (source_record_id) DO UPDATE SET
  water_type = EXCLUDED.water_type,
  water_name = EXCLUDED.water_name,
  lake_id = EXCLUDED.lake_id,
  county_id = EXCLUDED.county_id,
  county_name = EXCLUDED.county_name,
  strain = EXCLUDED.strain,
  count = EXCLUDED.count,
  avg_length_in = EXCLUDED.avg_length_in,
  stocked_on = EXCLUDED.stocked_on,
  fetched_at = now()`;

export function upsertSpecies(
  client: pg.Client,
  species: readonly { readonly slug: string; readonly name: string }[],
): Promise<number> {
  let upserted: number = 0;
  return sequential(
    species,
    (entry: { readonly slug: string; readonly name: string }): Promise<unknown> => {
      upserted += 1;
      return client.query(SPECIES_SQL, [
        entry.name,
        entry.name.toLowerCase(),
        entry.slug,
      ]);
    },
  ).then((): number => upserted);
}

export function upsertStocking(
  client: pg.Client,
  rows: readonly NormalizedStocking[],
): Promise<number> {
  let upserted: number = 0;
  return sequential(rows, (row: NormalizedStocking): Promise<unknown> => {
    upserted += 1;
    return client.query(EVENT_SQL, [
      row.waterType,
      row.waterName,
      row.waterName
        .replace(/\([^)]*\)/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      row.countySlug,
      row.countyName,
      row.speciesSlug,
      row.strain,
      row.count,
      row.avgLengthIn,
      row.stockedOn,
      STOCKING_DASHBOARD_URL,
      row.sourceRecordId,
    ]);
  }).then((): number => upserted);
}

export function deleteStaleStocking(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM stocking_events WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}
