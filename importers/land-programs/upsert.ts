import type pg from "pg";
import { chunk, sequential } from "../lib/db";
import type { LandProgram, NormalizedParcel } from "./normalize";

const UPSERT_SQL: string = `
INSERT INTO land_program_parcels (program, source_key, acres, centroid, attributes, fetched_at)
SELECT
  x.program::land_program,
  x.source_key,
  x.acres,
  CASE WHEN x.longitude IS NULL OR x.latitude IS NULL THEN NULL
       ELSE ST_SetSRID(ST_MakePoint(x.longitude, x.latitude), 4326) END,
  x.attributes,
  now()
FROM json_to_recordset($1::json) AS x(
  program text,
  source_key text,
  acres double precision,
  longitude double precision,
  latitude double precision,
  attributes jsonb
)
ON CONFLICT (program, source_key) DO UPDATE SET
  acres = EXCLUDED.acres,
  centroid = EXCLUDED.centroid,
  attributes = EXCLUDED.attributes,
  fetched_at = now()`;

const AGGREGATE_SQL: string = `
INSERT INTO land_program_counties (
  program, county_id, parcel_count, acres, detail, source_url, fetched_at, updated_at
)
SELECT
  p.program,
  c.id,
  count(*)::int,
  coalesce(sum(p.acres), 0),
  CASE WHEN p.program = 'hunter_access' THEN jsonb_build_object(
    'agriculturalAcres', round(coalesce(sum((p.attributes->>'agriculturalAcres')::double precision), 0)::numeric, 1),
    'forestAcres', round(coalesce(sum((p.attributes->>'forestAcres')::double precision), 0)::numeric, 1),
    'grasslandAcres', round(coalesce(sum((p.attributes->>'grasslandAcres')::double precision), 0)::numeric, 1),
    'wetlandAcres', round(coalesce(sum((p.attributes->>'wetlandAcres')::double precision), 0)::numeric, 1)
  ) ELSE '{}'::jsonb END,
  $2,
  now(),
  now()
FROM land_program_parcels p
JOIN counties c ON ST_Contains(c.geom, p.centroid)
WHERE p.program = $1::land_program
  AND p.centroid IS NOT NULL
  AND ($1 <> 'hunter_access' OR (p.attributes->>'active')::boolean IS TRUE)
GROUP BY p.program, c.id
ON CONFLICT (program, county_id) DO UPDATE SET
  parcel_count = EXCLUDED.parcel_count,
  acres = EXCLUDED.acres,
  detail = EXCLUDED.detail,
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN land_program_counties.acres IS DISTINCT FROM EXCLUDED.acres
      OR land_program_counties.parcel_count IS DISTINCT FROM EXCLUDED.parcel_count
    THEN now() ELSE land_program_counties.updated_at END`;

export function upsertParcels(
  client: pg.Client,
  parcels: readonly NormalizedParcel[],
): Promise<number> {
  const pages: readonly NormalizedParcel[][] = chunk(parcels, 500);
  return sequential(pages, (page: readonly NormalizedParcel[]): Promise<unknown> => {
    const payload: string = JSON.stringify(
      page.map((parcel: NormalizedParcel) => ({
        program: parcel.program,
        source_key: parcel.sourceKey,
        acres: parcel.acres,
        longitude: parcel.longitude,
        latitude: parcel.latitude,
        attributes: parcel.attributes,
      })),
    );
    return client.query(UPSERT_SQL, [payload]);
  }).then((): number => parcels.length);
}

export function deleteStaleParcels(
  client: pg.Client,
  program: LandProgram,
  runStartedAt: string,
): Promise<number> {
  return client
    .query(
      "DELETE FROM land_program_parcels WHERE program = $1::land_program AND fetched_at < $2",
      [program, runStartedAt],
    )
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}

export function aggregateProgram(
  client: pg.Client,
  program: LandProgram,
  sourceUrl: string,
): Promise<number> {
  return client
    .query("DELETE FROM land_program_counties WHERE program = $1::land_program", [
      program,
    ])
    .then((): Promise<pg.QueryResult> =>
      client.query(AGGREGATE_SQL, [program, sourceUrl]),
    )
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}

export function unplacedParcels(
  client: pg.Client,
  program: LandProgram,
): Promise<number> {
  return client
    .query(
      `SELECT count(*)::int AS n
       FROM land_program_parcels p
       WHERE p.program = $1::land_program
         AND (p.centroid IS NULL
              OR NOT EXISTS (SELECT 1 FROM counties c WHERE ST_Contains(c.geom, p.centroid)))`,
      [program],
    )
    .then((result: pg.QueryResult): number => (result.rows[0] as { n: number }).n);
}
