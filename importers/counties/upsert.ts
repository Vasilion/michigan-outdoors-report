import type pg from "pg";
import { sequential } from "../lib/db";
import { layerUrl } from "../lib/arcgis";
import { COUNTY_LAYER } from "./fetch";
import type { NormalizedCounty } from "./normalize";

const UPSERT_SQL: string = `
INSERT INTO counties (name, slug, peninsula, area_sq_mi, geom, centroid, source_url, source_record_id, fetched_at, updated_at)
VALUES (
  $1, $2, $3::peninsula_type, $4,
  CASE WHEN $5::text IS NULL THEN NULL
       ELSE ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON($5::text)), 3)) END,
  CASE WHEN $5::text IS NULL THEN NULL
       ELSE ST_PointOnSurface(ST_MakeValid(ST_GeomFromGeoJSON($5::text))) END,
  $6, $7, now(), now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  peninsula = EXCLUDED.peninsula,
  area_sq_mi = EXCLUDED.area_sq_mi,
  geom = COALESCE(EXCLUDED.geom, counties.geom),
  centroid = COALESCE(EXCLUDED.centroid, counties.centroid),
  source_url = EXCLUDED.source_url,
  source_record_id = EXCLUDED.source_record_id,
  fetched_at = now(),
  updated_at = CASE
    WHEN counties.name IS DISTINCT FROM EXCLUDED.name
      OR counties.peninsula IS DISTINCT FROM EXCLUDED.peninsula
      OR counties.area_sq_mi IS DISTINCT FROM EXCLUDED.area_sq_mi
    THEN now() ELSE counties.updated_at END`;

const ADJACENCY_SQL: string = `
DELETE FROM county_adjacency;
INSERT INTO county_adjacency (county_id, neighbor_county_id)
SELECT a.id, b.id
FROM counties a
JOIN counties b ON a.id <> b.id AND ST_Intersects(a.geom, b.geom)
WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL
  AND ST_Length(ST_CollectionExtract(ST_Intersection(a.geom, b.geom), 2)) > 0`;

export function upsertCounties(
  client: pg.Client,
  counties: readonly NormalizedCounty[],
): Promise<number> {
  const sourceUrl: string = layerUrl(COUNTY_LAYER);
  let upserted: number = 0;
  return sequential(counties, (county: NormalizedCounty): Promise<unknown> => {
    upserted += 1;
    return client.query(UPSERT_SQL, [
      county.name,
      county.slug,
      county.peninsula,
      county.areaSqMi,
      county.geometry === null ? null : JSON.stringify(county.geometry),
      sourceUrl,
      county.sourceRecordId,
    ]);
  }).then((): number => upserted);
}

export function rebuildAdjacency(client: pg.Client): Promise<number> {
  return client
    .query(ADJACENCY_SQL)
    .then((): Promise<pg.QueryResult> =>
      client.query("SELECT count(*)::int AS n FROM county_adjacency"),
    )
    .then((result: pg.QueryResult): number => (result.rows[0] as { n: number }).n);
}
