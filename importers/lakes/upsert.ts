import type pg from "pg";
import { chunk, sequential } from "../lib/db";
import { layerUrl } from "../lib/arcgis";
import { LAKE_LAYER } from "./fetch";
import type { NormalizedLake } from "./normalize";

export type PlacedLake = {
  readonly lake: NormalizedLake;
  readonly countySlug: string | null;
  readonly slug: string;
};

const RESOLVE_SQL: string = `
SELECT points.key AS key, c.slug AS county_slug
FROM json_to_recordset($1::json) AS points(key text, lat double precision, lng double precision)
LEFT JOIN counties c
  ON c.geom IS NOT NULL
 AND ST_Contains(c.geom, ST_SetSRID(ST_MakePoint(points.lng, points.lat), 4326))`;

export function resolveCounties(
  client: pg.Client,
  lakes: readonly NormalizedLake[],
): Promise<Map<string, string | null>> {
  const resolved: Map<string, string | null> = new Map<string, string | null>();
  const pages: readonly NormalizedLake[][] = chunk(lakes, 500);
  return sequential(pages, (page: readonly NormalizedLake[]): Promise<unknown> => {
    const payload: string = JSON.stringify(
      page.map((lake: NormalizedLake) => ({
        key: lake.mdnrId,
        lat: lake.latitude,
        lng: lake.longitude,
      })),
    );
    return client.query(RESOLVE_SQL, [payload]).then((result: pg.QueryResult): void => {
      for (const row of result.rows as { key: string; county_slug: string | null }[]) {
        if (!resolved.has(row.key) || row.county_slug !== null) {
          resolved.set(row.key, row.county_slug);
        }
      }
    });
  }).then((): Map<string, string | null> => resolved);
}

export function assignSlugs(
  lakes: readonly NormalizedLake[],
  counties: ReadonlyMap<string, string | null>,
): readonly PlacedLake[] {
  const used: Map<string, Set<string>> = new Map<string, Set<string>>();
  const placed: PlacedLake[] = [];
  const ordered: NormalizedLake[] = [...lakes].sort(
    (a: NormalizedLake, b: NormalizedLake): number =>
      a.baseSlug === b.baseSlug
        ? b.acres - a.acres
        : a.baseSlug.localeCompare(b.baseSlug),
  );
  for (const lake of ordered) {
    const countySlug: string | null =
      lake.mdnrId === null ? null : (counties.get(lake.mdnrId) ?? null);
    const scope: string = countySlug ?? "__unplaced__";
    const taken: Set<string> = used.get(scope) ?? new Set<string>();
    let slug: string = lake.baseSlug;
    let suffix: number = 2;
    while (taken.has(slug)) {
      slug = `${lake.baseSlug}-${suffix}`;
      suffix += 1;
    }
    taken.add(slug);
    used.set(scope, taken);
    placed.push({ lake, countySlug, slug });
  }
  return placed;
}

const UPSERT_SQL: string = `
INSERT INTO lakes (
  name, slug, county_id, acres, geom_point, peninsula, alternate_names,
  dnr_ids, has_special_regs, source_url, source_record_id, fetched_at, updated_at
)
SELECT
  $1, $2, c.id, $4,
  ST_SetSRID(ST_MakePoint($6, $5), 4326),
  $7::peninsula_type, $8, $9::jsonb, false, $10, $11, now(), now()
FROM (SELECT 1) AS anchor
LEFT JOIN counties c ON c.slug = $3
ON CONFLICT (source_record_id) WHERE source_record_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  county_id = EXCLUDED.county_id,
  acres = EXCLUDED.acres,
  geom_point = EXCLUDED.geom_point,
  peninsula = EXCLUDED.peninsula,
  alternate_names = EXCLUDED.alternate_names,
  dnr_ids = EXCLUDED.dnr_ids,
  source_url = EXCLUDED.source_url,
  fetched_at = now(),
  updated_at = CASE
    WHEN lakes.acres IS DISTINCT FROM EXCLUDED.acres
      OR lakes.name IS DISTINCT FROM EXCLUDED.name
    THEN now() ELSE lakes.updated_at END`;

export function upsertLakes(
  client: pg.Client,
  placed: readonly PlacedLake[],
): Promise<number> {
  const sourceUrl: string = layerUrl(LAKE_LAYER);
  let upserted: number = 0;
  return sequential(placed, (entry: PlacedLake): Promise<unknown> => {
    upserted += 1;
    return client.query(UPSERT_SQL, [
      entry.lake.name,
      entry.slug,
      entry.countySlug,
      entry.lake.acres,
      entry.lake.latitude,
      entry.lake.longitude,
      entry.lake.peninsula,
      entry.lake.alternateNames,
      JSON.stringify({ mdnrId: entry.lake.mdnrId, waterId: entry.lake.waterId }),
      sourceUrl,
      entry.lake.mdnrId,
    ]);
  }).then((): number => upserted);
}

export function deleteStaleLakes(
  client: pg.Client,
  runStartedAt: string,
): Promise<number> {
  return client
    .query("DELETE FROM lakes WHERE fetched_at < $1", [runStartedAt])
    .then((result: pg.QueryResult): number => result.rowCount ?? 0);
}
