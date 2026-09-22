import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import pg from "pg";

config();

const DATA_DIR: string = join(process.cwd(), "data");

export type ExportSpec = {
  readonly file: string;
  readonly sql: string;
};

export const EXPORTS: readonly ExportSpec[] = [
  {
    file: "counties.json",
    sql: `
      SELECT json_build_object(
        'name', c.name,
        'slug', c.slug,
        'peninsula', c.peninsula,
        'areaSqMi', c.area_sq_mi,
        'centroid', CASE WHEN c.centroid IS NULL THEN NULL ELSE json_build_object(
          'lat', round(ST_Y(c.centroid)::numeric, 5),
          'lng', round(ST_X(c.centroid)::numeric, 5)) END,
        'neighborSlugs', COALESCE((
          SELECT json_agg(n.slug ORDER BY n.slug)
          FROM county_adjacency a
          JOIN counties n ON n.id = a.neighbor_county_id
          WHERE a.county_id = c.id), '[]'::json),
        'sourceUrl', c.source_url,
        'updatedAt', to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM counties c
      ORDER BY c.slug`,
  },
  {
    file: "species.json",
    sql: `
      SELECT json_build_object(
        'name', s.name,
        'slug', s.slug,
        'kind', s.kind,
        'pluralName', s.plural_name,
        'officialUrl', s.official_url,
        'sameAsUrl', s.same_as_url,
        'updatedAt', to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM species s
      ORDER BY s.slug`,
  },
  {
    file: "lakes.json",
    sql: `
      SELECT json_build_object(
        'name', l.name,
        'slug', l.slug,
        'countySlug', c.slug,
        'acres', l.acres,
        'maxDepthFt', l.max_depth_ft,
        'centroid', CASE WHEN l.geom_point IS NULL THEN NULL ELSE json_build_object(
          'lat', round(ST_Y(l.geom_point)::numeric, 5),
          'lng', round(ST_X(l.geom_point)::numeric, 5)) END,
        'dnrMapUrl', l.dnr_map_url,
        'hasSpecialRegs', l.has_special_regs,
        'sourceUrl', l.source_url,
        'updatedAt', to_char(l.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM lakes l
      JOIN counties c ON c.id = l.county_id
      ORDER BY c.slug, l.slug`,
  },
  {
    file: "rivers.json",
    sql: `
      SELECT json_build_object(
        'name', r.name,
        'slug', r.slug,
        'countySlugs', COALESCE((
          SELECT json_agg(c.slug ORDER BY c.slug)
          FROM river_counties rc
          JOIN counties c ON c.id = rc.county_id
          WHERE rc.river_id = r.id), '[]'::json),
        'designatedTroutStream', r.designated_trout_stream,
        'sourceUrl', r.source_url,
        'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM rivers r
      ORDER BY r.slug`,
  },
  {
    file: "public-lands.json",
    sql: `
      SELECT json_build_object(
        'name', p.name,
        'slug', p.slug,
        'type', p.type,
        'typeLabel', p.type_label,
        'acres', p.acres,
        'countySlugs', COALESCE((
          SELECT json_agg(c.slug ORDER BY c.slug)
          FROM public_land_counties pc
          JOIN counties c ON c.id = pc.county_id
          WHERE pc.public_land_id = p.id), '[]'::json),
        'managingAgency', p.managing_agency,
        'region', p.region,
        'huntingStatus', p.hunting_status,
        'officialUrl', p.official_url,
        'centroid', CASE WHEN p.centroid IS NULL THEN NULL ELSE json_build_object(
          'lat', round(ST_Y(p.centroid)::numeric, 5),
          'lng', round(ST_X(p.centroid)::numeric, 5)) END,
        'sourceUrl', p.source_url,
        'updatedAt', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM public_lands p
      ORDER BY p.slug`,
  },
  {
    file: "access-sites.json",
    sql: `
      SELECT json_build_object(
        'name', a.name,
        'slug', a.slug,
        'type', a.type,
        'coordinate', json_build_object(
          'lat', round(ST_Y(a.geom)::numeric, 5),
          'lng', round(ST_X(a.geom)::numeric, 5)),
        'lakeSlug', lk.slug,
        'riverSlug', rv.slug,
        'countySlug', c.slug,
        'amenities', a.amenities,
        'sourceUrl', a.source_url,
        'updatedAt', to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM access_sites a
      JOIN counties c ON c.id = a.county_id
      LEFT JOIN lakes lk ON lk.id = a.lake_id
      LEFT JOIN rivers rv ON rv.id = a.river_id
      ORDER BY a.slug`,
  },
  {
    file: "stocking-events.json",
    sql: `
      SELECT json_build_object(
        'waterType', e.water_type,
        'waterName', e.water_name,
        'lakeSlug', lk.slug,
        'riverSlug', rv.slug,
        'countySlug', c.slug,
        'speciesSlug', s.slug,
        'strain', e.strain,
        'count', e.count,
        'avgLengthIn', e.avg_length_in,
        'stockedOn', to_char(e.stocked_on, 'YYYY-MM-DD'),
        'sourceUrl', e.source_url
      ) AS row
      FROM stocking_events e
      JOIN counties c ON c.id = e.county_id
      JOIN species s ON s.id = e.species_id
      LEFT JOIN lakes lk ON lk.id = e.lake_id
      LEFT JOIN rivers rv ON rv.id = e.river_id
      ORDER BY e.stocked_on, c.slug, s.slug, e.water_name`,
  },
  {
    file: "harvest-snapshots.json",
    sql: `
      WITH latest AS (
        SELECT DISTINCT ON (h.county_id, h.species_id, h.season_year) h.*
        FROM harvest_snapshots h
        ORDER BY h.county_id, h.species_id, h.season_year, h.snapshot_date DESC
      )
      SELECT json_build_object(
        'countySlug', c.slug,
        'speciesSlug', s.slug,
        'seasonYear', h.season_year,
        'antlered', h.antlered,
        'antlerless', h.antlerless,
        'total', h.total,
        'snapshotDate', to_char(h.snapshot_date, 'YYYY-MM-DD'),
        'isFinal', h.is_final,
        'sourceUrl', h.source_url
      ) AS row
      FROM latest h
      JOIN counties c ON c.id = h.county_id
      JOIN species s ON s.id = h.species_id
      ORDER BY c.slug, s.slug, h.season_year`,
  },
  {
    file: "seasons.json",
    sql: `
      SELECT json_build_object(
        'speciesSlug', s.slug,
        'name', se.name,
        'zone', se.zone,
        'startDate', to_char(se.start_date, 'YYYY-MM-DD'),
        'endDate', to_char(se.end_date, 'YYYY-MM-DD'),
        'notes', se.notes,
        'sourceUrl', se.source_url,
        'lastVerified', to_char(se.last_verified, 'YYYY-MM-DD')
      ) AS row
      FROM seasons se
      JOIN species s ON s.id = se.species_id
      ORDER BY s.slug, se.start_date, se.zone`,
  },
  {
    file: "directory-listings.json",
    sql: `
      SELECT json_build_object(
        'name', d.name,
        'slug', d.slug,
        'category', d.category,
        'countySlug', c.slug,
        'address', d.address,
        'phone', d.phone,
        'website', d.website,
        'coordinate', CASE WHEN d.geom IS NULL THEN NULL ELSE json_build_object(
          'lat', round(ST_Y(d.geom)::numeric, 5),
          'lng', round(ST_X(d.geom)::numeric, 5)) END,
        'featured', d.featured AND (d.featured_until IS NULL OR d.featured_until >= CURRENT_DATE),
        'featuredUntil', to_char(d.featured_until, 'YYYY-MM-DD'),
        'verified', d.verified,
        'sourceUrl', d.source_url,
        'updatedAt', to_char(d.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM directory_listings d
      JOIN counties c ON c.id = d.county_id
      ORDER BY d.slug`,
  },
  {
    file: "redirects.json",
    sql: `
      SELECT json_build_object(
        'fromPath', r.from_path,
        'toPath', r.to_path,
        'createdAt', to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM redirects r
      ORDER BY r.from_path`,
  },
];

const RUNS_SQL: string = `
  SELECT DISTINCT ON (importer) json_build_object(
    'importer', importer,
    'finishedAt', to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    'rowsUpserted', rows_upserted,
    'status', status
  ) AS row
  FROM source_runs
  WHERE finished_at IS NOT NULL
  ORDER BY importer, finished_at DESC`;

export type SnapshotRow = Readonly<Record<string, unknown>>;

export function collectDataDates(rows: readonly SnapshotRow[]): readonly string[] {
  const keys: readonly string[] = [
    "updatedAt",
    "stockedOn",
    "snapshotDate",
    "lastVerified",
  ];
  const dates: string[] = [];
  for (const row of rows) {
    for (const key of keys) {
      const value: unknown = row[key];
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        dates.push(value);
      }
    }
  }
  return dates;
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(join(DATA_DIR, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    process.stderr.write("DATABASE_URL is not set\n");
    process.exit(1);
  }
  const client: pg.Client = new pg.Client({ connectionString });
  const allDates: string[] = [];

  client
    .connect()
    .then((): Promise<void> =>
      EXPORTS.reduce(
        (chain: Promise<void>, spec: ExportSpec): Promise<void> =>
          chain.then((): Promise<void> =>
            client.query(spec.sql).then((result: pg.QueryResult): void => {
              const rows: SnapshotRow[] = result.rows.map(
                (record: { row: SnapshotRow }): SnapshotRow => record.row,
              );
              allDates.push(...collectDataDates(rows));
              writeJson(spec.file, rows);
              process.stdout.write(`  ${spec.file}: ${rows.length} rows\n`);
            }),
          ),
        Promise.resolve(),
      ),
    )
    .then((): Promise<pg.QueryResult> => client.query(RUNS_SQL))
    .then((result: pg.QueryResult): void => {
      const runs: SnapshotRow[] = result.rows.map(
        (record: { row: SnapshotRow }): SnapshotRow => record.row,
      );
      const sortedDates: string[] = [...allDates].sort();
      const newest: string = sortedDates[sortedDates.length - 1] ?? "1970-01-01";
      writeJson("meta.json", {
        generatedAt: `${newest}T00:00:00.000Z`,
        snapshotVersion: 1,
        runs,
      });
      process.stdout.write(
        `  meta.json: data date ${newest}, ${runs.length} importer runs\n`,
      );
    })
    .then((): Promise<void> => client.end())
    .catch((error: unknown): void => {
      process.stderr.write(`snapshot export failed: ${String(error)}\n`);
      client.end().finally((): void => {
        process.exit(1);
      });
    });
}

main();
