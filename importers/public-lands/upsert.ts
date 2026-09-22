import type pg from "pg";
import { sequential } from "../lib/db";
import type { NormalizedPublicLand } from "./normalize";
import type { GeoJsonGeometry } from "../lib/arcgis";

const UPSERT_SQL: string = `
WITH parts AS (
  SELECT ST_MakeValid(ST_GeomFromGeoJSON(value)) AS geom
  FROM json_array_elements_text($8::json) AS value
),
dissolved AS (
  SELECT ST_Multi(ST_CollectionExtract(ST_UnaryUnion(ST_Collect(geom)), 3)) AS geom
  FROM parts
)
INSERT INTO public_lands (
  name, slug, type, type_label, acres, geom, centroid,
  managing_agency, official_url, region, hunting_status,
  source_url, source_record_id, fetched_at, updated_at
)
SELECT
  $1, $2, $3::public_land_type, $4, $5,
  dissolved.geom,
  ST_PointOnSurface(dissolved.geom),
  $6, NULL, $7, $9, $10, $2, now(), now()
FROM dissolved
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  type_label = EXCLUDED.type_label,
  acres = EXCLUDED.acres,
  geom = COALESCE(EXCLUDED.geom, public_lands.geom),
  centroid = COALESCE(EXCLUDED.centroid, public_lands.centroid),
  managing_agency = EXCLUDED.managing_agency,
  region = EXCLUDED.region,
  hunting_status = EXCLUDED.hunting_status,
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN public_lands.acres IS DISTINCT FROM EXCLUDED.acres
      OR public_lands.name IS DISTINCT FROM EXCLUDED.name
      OR public_lands.hunting_status IS DISTINCT FROM EXCLUDED.hunting_status
    THEN now() ELSE public_lands.updated_at END`;

const LINK_COUNTIES_SQL: string = `
DELETE FROM public_land_counties;
INSERT INTO public_land_counties (public_land_id, county_id)
SELECT p.id, c.id
FROM public_lands p
JOIN counties c ON ST_Intersects(p.geom, c.geom)
WHERE p.geom IS NOT NULL AND c.geom IS NOT NULL
  AND ST_Area(ST_Intersection(p.geom, c.geom)) > 0`;

export function upsertPublicLands(
  client: pg.Client,
  lands: readonly NormalizedPublicLand[],
  sourceUrl: string,
): Promise<number> {
  let upserted: number = 0;
  return sequential(lands, (land: NormalizedPublicLand): Promise<unknown> => {
    upserted += 1;
    const geometries: string = JSON.stringify(
      land.geometries.map((geometry: GeoJsonGeometry): string =>
        JSON.stringify(geometry),
      ),
    );
    return client.query(UPSERT_SQL, [
      land.name,
      land.slug,
      land.type,
      land.typeLabel,
      land.acres === null ? null : Math.round(land.acres),
      land.managingAgency,
      land.region,
      geometries,
      land.huntingStatus,
      sourceUrl,
    ]);
  }).then((): number => upserted);
}

export function deleteStalePublicLands(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM public_lands WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}

export function linkPublicLandCounties(client: pg.Client): Promise<number> {
  return client
    .query(LINK_COUNTIES_SQL)
    .then((): Promise<pg.QueryResult> =>
      client.query("SELECT count(*)::int AS n FROM public_land_counties"),
    )
    .then((result: pg.QueryResult): number => (result.rows[0] as { n: number }).n);
}
