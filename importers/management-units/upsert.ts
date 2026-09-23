import type pg from "pg";
import { sequential } from "../lib/db";
import type { GeoJsonGeometry } from "../lib/arcgis";
import type { NormalizedUnit } from "./normalize";

const UPSERT_SQL: string = `
WITH parts AS (
  SELECT ST_MakeValid(ST_GeomFromGeoJSON(value)) AS geom
  FROM json_array_elements_text($5::json) AS value
),
dissolved AS (
  SELECT ST_Multi(ST_CollectionExtract(ST_UnaryUnion(ST_Collect(geom)), 3)) AS geom
  FROM parts
)
INSERT INTO management_units (
  species_slug, unit_code, name, unit_year, geom, source_url, fetched_at, updated_at
)
SELECT $1, $2, $3, $4, dissolved.geom, $6, now(), now()
FROM dissolved
ON CONFLICT (species_slug, unit_code) DO UPDATE SET
  name = EXCLUDED.name,
  unit_year = EXCLUDED.unit_year,
  geom = COALESCE(EXCLUDED.geom, management_units.geom),
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN management_units.unit_year IS DISTINCT FROM EXCLUDED.unit_year
      OR management_units.name IS DISTINCT FROM EXCLUDED.name
    THEN now() ELSE management_units.updated_at END`;

const LINK_SQL: string = `
DELETE FROM management_unit_counties;
INSERT INTO management_unit_counties (management_unit_id, county_id, overlap_share)
SELECT
  u.id,
  c.id,
  ST_Area(ST_Intersection(u.geom, c.geom)) / NULLIF(ST_Area(c.geom), 0)
FROM management_units u
JOIN counties c ON ST_Intersects(u.geom, c.geom)
WHERE u.geom IS NOT NULL AND c.geom IS NOT NULL
  AND ST_Area(ST_Intersection(u.geom, c.geom)) / NULLIF(ST_Area(c.geom), 0) > 0.02`;

export function upsertUnits(
  client: pg.Client,
  units: readonly NormalizedUnit[],
  sourceUrl: string,
): Promise<number> {
  return sequential(units, (unit: NormalizedUnit): Promise<unknown> => {
    const geometries: string = JSON.stringify(
      unit.geometries.map((geometry: GeoJsonGeometry): string =>
        JSON.stringify(geometry),
      ),
    );
    return client.query(UPSERT_SQL, [
      unit.speciesSlug,
      unit.unitCode,
      unit.name,
      unit.unitYear,
      geometries,
      sourceUrl,
    ]);
  }).then((): number => units.length);
}

export function deleteStaleUnits(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM management_units WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}

export function linkUnitCounties(client: pg.Client): Promise<number> {
  return client
    .query(LINK_SQL)
    .then((): Promise<pg.QueryResult> =>
      client.query("SELECT count(*)::int AS n FROM management_unit_counties"),
    )
    .then((result: pg.QueryResult): number => (result.rows[0] as { n: number }).n);
}
