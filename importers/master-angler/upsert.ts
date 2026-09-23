import type pg from "pg";
import { chunk, sequential } from "../lib/db";
import type { NormalizedEntry } from "./normalize";

const SPECIES_SQL: string = `
INSERT INTO species (name, plural_name, slug, kind, same_as_url, official_url, updated_at)
VALUES ($1, $2, $3, 'fish'::species_kind, NULL, NULL, now())
ON CONFLICT (slug) DO NOTHING`;

const ENTRY_SQL: string = `
INSERT INTO master_angler_entries (
  report_id, species_id, species_slug, species_name, angler_name, caught_year, caught_on,
  water_name, county_id, length_in, weight_lb, method, bait, state_record, min_length_in,
  geom, source_url, fetched_at, updated_at
)
SELECT
  x.report_id,
  (SELECT s.id FROM species s WHERE s.slug = x.species_slug),
  x.species_slug,
  x.species_name,
  x.angler_name,
  x.caught_year,
  x.caught_on,
  x.water_name,
  (SELECT c.id FROM counties c WHERE lower(c.name) = lower(x.county_name)),
  x.length_in,
  x.weight_lb,
  x.method,
  x.bait,
  x.state_record,
  x.min_length_in,
  CASE WHEN x.longitude IS NULL OR x.latitude IS NULL THEN NULL
       ELSE ST_SetSRID(ST_MakePoint(x.longitude, x.latitude), 4326) END,
  $2,
  now(),
  now()
FROM json_to_recordset($1::json) AS x(
  report_id text,
  species_slug text,
  species_name text,
  angler_name text,
  caught_year integer,
  caught_on date,
  water_name text,
  county_name text,
  length_in double precision,
  weight_lb double precision,
  method text,
  bait text,
  state_record boolean,
  min_length_in double precision,
  longitude double precision,
  latitude double precision
)
ON CONFLICT (report_id) DO UPDATE SET
  species_id = EXCLUDED.species_id,
  species_slug = EXCLUDED.species_slug,
  species_name = EXCLUDED.species_name,
  angler_name = EXCLUDED.angler_name,
  caught_year = EXCLUDED.caught_year,
  caught_on = EXCLUDED.caught_on,
  water_name = EXCLUDED.water_name,
  county_id = COALESCE(EXCLUDED.county_id, master_angler_entries.county_id),
  length_in = EXCLUDED.length_in,
  weight_lb = EXCLUDED.weight_lb,
  method = EXCLUDED.method,
  bait = EXCLUDED.bait,
  state_record = EXCLUDED.state_record,
  min_length_in = EXCLUDED.min_length_in,
  geom = EXCLUDED.geom,
  fetched_at = now(),
  updated_at = CASE
    WHEN master_angler_entries.state_record IS DISTINCT FROM EXCLUDED.state_record
      OR master_angler_entries.weight_lb IS DISTINCT FROM EXCLUDED.weight_lb
    THEN now() ELSE master_angler_entries.updated_at END`;

const FILL_COUNTY_SQL: string = `
UPDATE master_angler_entries e
SET county_id = c.id
FROM counties c
WHERE e.county_id IS NULL
  AND e.geom IS NOT NULL
  AND c.geom IS NOT NULL
  AND ST_Contains(c.geom, e.geom)`;

const LINK_LAKES_SQL: string = `
UPDATE master_angler_entries e
SET lake_id = l.id
FROM lakes l
WHERE e.lake_id IS NULL
  AND e.county_id IS NOT NULL
  AND l.county_id = e.county_id
  AND e.water_name IS NOT NULL
  AND lower(l.name) = lower(btrim(regexp_replace(
        regexp_replace(e.water_name, '[(][^)]*[)]', ' ', 'g'), '[[:space:]]+', ' ', 'g')))`;

const LINK_RIVERS_SQL: string = `
UPDATE master_angler_entries e
SET river_id = r.id
FROM rivers r
WHERE e.river_id IS NULL
  AND e.lake_id IS NULL
  AND e.county_id IS NOT NULL
  AND r.county_id = e.county_id
  AND e.water_name IS NOT NULL
  AND lower(r.name) = lower(btrim(regexp_replace(
        regexp_replace(e.water_name, '[(][^)]*[)]', ' ', 'g'), '[[:space:]]+', ' ', 'g')))`;

export function upsertMasterAnglerSpecies(
  client: pg.Client,
  species: readonly { readonly slug: string; readonly name: string }[],
): Promise<number> {
  return sequential(
    species,
    (entry: { readonly slug: string; readonly name: string }): Promise<unknown> =>
      client.query(SPECIES_SQL, [entry.name, entry.name, entry.slug]),
  ).then((): number => species.length);
}

export function upsertEntries(
  client: pg.Client,
  entries: readonly NormalizedEntry[],
  sourceUrl: string,
): Promise<number> {
  const pages: readonly NormalizedEntry[][] = chunk(entries, 500);
  return sequential(pages, (page: readonly NormalizedEntry[]): Promise<unknown> => {
    const payload: string = JSON.stringify(
      page.map((entry: NormalizedEntry) => ({
        report_id: entry.reportId,
        species_slug: entry.speciesSlug,
        species_name: entry.speciesName,
        angler_name: entry.anglerName,
        caught_year: entry.caughtYear,
        caught_on: entry.caughtOn,
        water_name: entry.waterName,
        county_name: entry.countyName,
        length_in: entry.lengthIn,
        weight_lb: entry.weightLb,
        method: entry.method,
        bait: entry.bait,
        state_record: entry.stateRecord,
        min_length_in: entry.minLengthIn,
        longitude: entry.longitude,
        latitude: entry.latitude,
      })),
    );
    return client.query(ENTRY_SQL, [payload, sourceUrl]);
  }).then((): number => entries.length);
}

export function fillMissingCounties(client: pg.Client): Promise<number> {
  return client
    .query(FILL_COUNTY_SQL)
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}

export function linkWaters(
  client: pg.Client,
): Promise<{ lakes: number; rivers: number }> {
  return client
    .query(LINK_LAKES_SQL)
    .then((lakeResult: pg.QueryResult): Promise<{ lakes: number; rivers: number }> =>
      client
        .query(LINK_RIVERS_SQL)
        .then((riverResult: pg.QueryResult): { lakes: number; rivers: number } => ({
          lakes: lakeResult.rowCount ?? 0,
          rivers: riverResult.rowCount ?? 0,
        })),
    );
}

export function deleteStaleEntries(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM master_angler_entries WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}
