import type pg from "pg";
import { sequential } from "../lib/db";
import { layerUrl } from "../lib/arcgis";
import { FLOWLINE_LAYER } from "./fetch";
import type { NormalizedRiver, RiverSeed } from "./normalize";

const SEED_SQL: string = `
SELECT e.water_name AS name, c.slug AS county_slug
FROM stocking_events e
JOIN counties c ON c.id = e.county_id
WHERE e.water_type = 'river'
GROUP BY 1, 2
UNION
SELECT a.waterbody_name AS name, c.slug AS county_slug
FROM access_sites a
JOIN counties c ON c.id = a.county_id
WHERE a.waterbody_name IS NOT NULL
  AND a.waterbody_type = 'River/Stream'
GROUP BY 1, 2`;

export function readRiverSeeds(client: pg.Client): Promise<readonly RiverSeed[]> {
  return client.query(SEED_SQL).then((result: pg.QueryResult): readonly RiverSeed[] =>
    (result.rows as { name: string; county_slug: string }[]).map(
      (row: { name: string; county_slug: string }): RiverSeed => ({
        name: row.name,
        countySlug: row.county_slug,
      }),
    ),
  );
}

const UPSERT_SQL: string = `
INSERT INTO rivers (
  name, slug, county_id, designated_trout_stream, stream_types, trout_regulation,
  gear_restriction, blue_ribbon, blue_ribbon_miles, blue_ribbon_reach,
  source_url, source_record_id, fetched_at, updated_at
)
SELECT $1, $2, c.id, $4, $5, $6, $7, $10, $11, $12, $8, $9, now(), now()
FROM counties c
WHERE c.slug = $3
ON CONFLICT (county_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  designated_trout_stream = EXCLUDED.designated_trout_stream,
  stream_types = EXCLUDED.stream_types,
  trout_regulation = EXCLUDED.trout_regulation,
  gear_restriction = EXCLUDED.gear_restriction,
  blue_ribbon = EXCLUDED.blue_ribbon,
  blue_ribbon_miles = EXCLUDED.blue_ribbon_miles,
  blue_ribbon_reach = EXCLUDED.blue_ribbon_reach,
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN rivers.designated_trout_stream IS DISTINCT FROM EXCLUDED.designated_trout_stream
      OR rivers.stream_types IS DISTINCT FROM EXCLUDED.stream_types
    THEN now() ELSE rivers.updated_at END`;

export function upsertRivers(
  client: pg.Client,
  rivers: readonly NormalizedRiver[],
): Promise<number> {
  const sourceUrl: string = layerUrl(FLOWLINE_LAYER);
  let upserted: number = 0;
  return sequential(rivers, (river: NormalizedRiver): Promise<unknown> => {
    upserted += 1;
    return client.query(UPSERT_SQL, [
      river.name,
      river.slug,
      river.countySlug,
      river.designated,
      river.streamTypes.length === 0 ? null : river.streamTypes.join(", "),
      river.regulation,
      river.gearRestriction,
      sourceUrl,
      `${river.countySlug}:${river.slug}`,
      river.blueRibbon,
      river.blueRibbonMiles,
      river.blueRibbonReach,
    ]);
  }).then((): number => upserted);
}

const LINK_STOCKING_SQL: string = `
UPDATE stocking_events e
SET river_id = r.id
FROM rivers r
WHERE e.water_type = 'river'
  AND e.river_id IS DISTINCT FROM r.id
  AND r.county_id = e.county_id
  AND lower(r.name) = lower(btrim(regexp_replace(
        regexp_replace(e.water_name, '[(][^)]*[)]', ' ', 'g'), '[[:space:]]+', ' ', 'g')))`;

const LINK_ACCESS_SQL: string = `
UPDATE access_sites a
SET river_id = r.id
FROM rivers r
WHERE a.waterbody_type = 'River/Stream'
  AND a.river_id IS DISTINCT FROM r.id
  AND r.county_id = a.county_id
  AND lower(r.name) = lower(btrim(regexp_replace(
        regexp_replace(a.waterbody_name, '[(][^)]*[)]', ' ', 'g'), '[[:space:]]+', ' ', 'g')))`;

export function linkRiverRecords(client: pg.Client): Promise<{
  readonly stocking: number;
  readonly access: number;
}> {
  return client
    .query(LINK_STOCKING_SQL)
    .then((stocking: pg.QueryResult): Promise<{ stocking: number; access: number }> =>
      client.query(LINK_ACCESS_SQL).then((access: pg.QueryResult) => ({
        stocking: stocking.rowCount ?? 0,
        access: access.rowCount ?? 0,
      })),
    );
}

export function deleteStaleRivers(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM rivers WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}
