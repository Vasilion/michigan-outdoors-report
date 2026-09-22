import type pg from "pg";
import { sequential } from "../lib/db";
import { layerUrl } from "../lib/arcgis";
import { ACCESS_LAYER } from "./fetch";
import type { NormalizedAccessSite } from "./normalize";

const UPSERT_SQL: string = `
WITH point AS (
  SELECT ST_SetSRID(ST_MakePoint($5, $4), 4326) AS geom
),
placed AS (
  SELECT
    point.geom AS geom,
    (SELECT c.id FROM counties c
      WHERE c.geom IS NOT NULL AND ST_Contains(c.geom, point.geom) LIMIT 1) AS county_id,
    (SELECT l.id FROM lakes l
      WHERE l.geom_point IS NOT NULL
        AND lower(l.name) = lower($6)
      ORDER BY ST_Distance(l.geom_point, point.geom) ASC
      LIMIT 1) AS lake_id,
    (SELECT ST_Distance(l.geom_point, point.geom) FROM lakes l
      WHERE l.geom_point IS NOT NULL
        AND lower(l.name) = lower($6)
      ORDER BY ST_Distance(l.geom_point, point.geom) ASC
      LIMIT 1) AS lake_distance
  FROM point
)
INSERT INTO access_sites (
  name, slug, type, geom, lake_id, county_id, amenities,
  waterbody_name, waterbody_type, lanes, owned_by,
  source_url, source_record_id, fetched_at, updated_at
)
SELECT
  $1, $2, $3::access_site_type, placed.geom,
  CASE WHEN placed.lake_distance IS NOT NULL AND placed.lake_distance < 0.08
       THEN placed.lake_id ELSE NULL END,
  placed.county_id, $7::jsonb, $6, $8, $9, $10, $11, $12, now(), now()
FROM placed
WHERE placed.county_id IS NOT NULL
ON CONFLICT (source_record_id) WHERE source_record_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  geom = EXCLUDED.geom,
  lake_id = EXCLUDED.lake_id,
  county_id = EXCLUDED.county_id,
  amenities = EXCLUDED.amenities,
  waterbody_name = EXCLUDED.waterbody_name,
  waterbody_type = EXCLUDED.waterbody_type,
  lanes = EXCLUDED.lanes,
  owned_by = EXCLUDED.owned_by,
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN access_sites.name IS DISTINCT FROM EXCLUDED.name
      OR access_sites.amenities IS DISTINCT FROM EXCLUDED.amenities
    THEN now() ELSE access_sites.updated_at END`;

export function upsertAccessSites(
  client: pg.Client,
  sites: readonly NormalizedAccessSite[],
): Promise<number> {
  const sourceUrl: string = layerUrl(ACCESS_LAYER);
  let upserted: number = 0;
  return sequential(sites, (site: NormalizedAccessSite): Promise<unknown> => {
    upserted += 1;
    return client.query(UPSERT_SQL, [
      site.name,
      site.slug,
      site.type,
      site.latitude,
      site.longitude,
      site.waterbodyName,
      JSON.stringify(site.amenities),
      site.waterbodyType,
      site.lanes,
      site.ownedBy,
      sourceUrl,
      site.sourceRecordId,
    ]);
  }).then((): number => upserted);
}

export function deleteStaleAccessSites(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM access_sites WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}
