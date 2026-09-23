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
    file: "county-shapes.json",
    sql: `
      WITH parts AS (
        SELECT c.id, c.slug, (ST_Dump(c.geom)).geom AS g
        FROM counties c
        WHERE c.geom IS NOT NULL
      ),
      kept AS (
        SELECT id, slug, ST_Collect(g) AS g
        FROM parts
        WHERE ST_Area(g) > 0.0004
        GROUP BY id, slug
      )
      SELECT json_build_object(
        'slug', slug,
        'rings', (
          SELECT json_agg(ring)
          FROM (
            SELECT json_array_elements(
              json_array_elements(
                ST_AsGeoJSON(ST_Multi(ST_SimplifyPreserveTopology(g, 0.004)), 4)::json -> 'coordinates'
              )
            ) AS ring
          ) rings
        )
      ) AS row
      FROM kept
      ORDER BY slug`,
  },
  {
    file: "state-outline.json",
    sql: `
      WITH parts AS (
        SELECT (ST_Dump(c.geom)).geom AS g FROM counties c WHERE c.geom IS NOT NULL
      ),
      kept AS (
        SELECT ST_Union(g) AS g FROM parts WHERE ST_Area(g) > 0.05
      )
      SELECT json_build_object(
        'rings', (
          SELECT json_agg(ring)
          FROM (
            SELECT json_array_elements(
              json_array_elements(
                ST_AsGeoJSON(ST_Multi(ST_SimplifyPreserveTopology(ST_Buffer(g, 0.0), 0.05)), 2)::json -> 'coordinates'
              )
            ) AS ring
          ) rings
        )
      ) AS row
      FROM kept`,
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
        'peninsula', l.peninsula,
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
        'countySlug', c.slug,
        'designatedTroutStream', r.designated_trout_stream,
        'blueRibbon', r.blue_ribbon,
        'blueRibbonMiles', r.blue_ribbon_miles,
        'blueRibbonReach', r.blue_ribbon_reach,
        'streamTypes', r.stream_types,
        'troutRegulation', r.trout_regulation,
        'gearRestriction', r.gear_restriction,
        'sourceUrl', r.source_url,
        'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM rivers r
      JOIN counties c ON c.id = r.county_id
      ORDER BY c.slug, r.slug`,
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
        'description', p.description,
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
        'lakeCountySlug', lkc.slug,
        'riverSlug', rv.slug,
        'riverCountySlug', rvc.slug,
        'countySlug', c.slug,
        'amenities', a.amenities,
        'sourceUrl', a.source_url,
        'updatedAt', to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM access_sites a
      JOIN counties c ON c.id = a.county_id
      LEFT JOIN lakes lk ON lk.id = a.lake_id AND lk.county_id IS NOT NULL
      LEFT JOIN counties lkc ON lkc.id = lk.county_id
      LEFT JOIN rivers rv ON rv.id = a.river_id
      LEFT JOIN counties rvc ON rvc.id = rv.county_id
      ORDER BY a.slug`,
  },
  {
    file: "stocking-events.json",
    sql: `
      SELECT json_build_object(
        'waterType', e.water_type,
        'waterName', e.water_name,
        'lakeSlug', lk.slug,
        'lakeCountySlug', lkc.slug,
        'riverSlug', rv.slug,
        'riverCountySlug', rvc.slug,
        'countySlug', c.slug,
        'speciesSlug', s.slug,
        'strain', e.strain,
        'count', e.count,
        'avgLengthIn', e.avg_length_in,
        'stockedOn', to_char(e.stocked_on, 'YYYY-MM-DD'),
        'sourceUrl', e.source_url
      ) AS row
      FROM stocking_events e
      LEFT JOIN counties c ON c.id = e.county_id
      JOIN species s ON s.id = e.species_id
      LEFT JOIN lakes lk ON lk.id = e.lake_id AND lk.county_id IS NOT NULL
      LEFT JOIN counties lkc ON lkc.id = lk.county_id
      LEFT JOIN rivers rv ON rv.id = e.river_id
      LEFT JOIN counties rvc ON rvc.id = rv.county_id
      ORDER BY e.stocked_on, e.water_name, s.slug, e.source_record_id`,
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
    file: "land-programs.json",
    sql: `
      SELECT json_build_object(
        'program', lp.program,
        'countySlug', c.slug,
        'parcelCount', lp.parcel_count,
        'acres', round(lp.acres::numeric, 1),
        'detail', lp.detail,
        'sourceUrl', lp.source_url,
        'updatedAt', to_char(lp.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM land_program_counties lp
      JOIN counties c ON c.id = lp.county_id
      ORDER BY lp.program, c.slug`,
  },
  {
    file: "management-units.json",
    sql: `
      SELECT json_build_object(
        'speciesSlug', u.species_slug,
        'unitCode', u.unit_code,
        'name', u.name,
        'unitYear', u.unit_year,
        'countySlugs', COALESCE((
          SELECT json_agg(c.slug ORDER BY c.slug)
          FROM management_unit_counties mc
          JOIN counties c ON c.id = mc.county_id
          WHERE mc.management_unit_id = u.id), '[]'::json),
        'sourceUrl', u.source_url,
        'updatedAt', to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM management_units u
      ORDER BY u.species_slug, u.unit_code`,
  },
  {
    file: "state-records.json",
    sql: `
      SELECT json_build_object(
        'speciesSlug', e.species_slug,
        'speciesName', e.species_name,
        'anglerName', e.angler_name,
        'caughtYear', e.caught_year,
        'waterName', e.water_name,
        'countySlug', c.slug,
        'lengthIn', e.length_in,
        'weightLb', e.weight_lb,
        'method', e.method,
        'minLengthIn', e.min_length_in,
        'sourceUrl', e.source_url,
        'updatedAt', to_char(e.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM master_angler_entries e
      LEFT JOIN counties c ON c.id = e.county_id
      WHERE e.state_record
      ORDER BY e.species_name`,
  },
  {
    file: "county-records.json",
    sql: `
      WITH ranked AS (
        SELECT
          e.*,
          row_number() OVER (
            PARTITION BY e.county_id, e.species_slug
            ORDER BY e.length_in DESC NULLS LAST, e.weight_lb DESC NULLS LAST, e.caught_year DESC
          ) AS rn,
          count(*) OVER (PARTITION BY e.county_id, e.species_slug) AS entries
        FROM master_angler_entries e
        WHERE e.county_id IS NOT NULL AND e.length_in IS NOT NULL
      )
      SELECT json_build_object(
        'countySlug', c.slug,
        'speciesSlug', r.species_slug,
        'speciesName', r.species_name,
        'anglerName', r.angler_name,
        'caughtYear', r.caught_year,
        'waterName', r.water_name,
        'lakeSlug', l.slug,
        'riverSlug', rv.slug,
        'lengthIn', r.length_in,
        'weightLb', r.weight_lb,
        'method', r.method,
        'entryCount', r.entries::int,
        'stateRecord', r.state_record,
        'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM ranked r
      JOIN counties c ON c.id = r.county_id
      LEFT JOIN lakes l ON l.id = r.lake_id
      LEFT JOIN rivers rv ON rv.id = r.river_id
      WHERE r.rn = 1
      ORDER BY c.slug, r.species_slug`,
  },
  {
    file: "water-records.json",
    sql: `
      WITH ranked AS (
        SELECT
          e.*,
          row_number() OVER (
            PARTITION BY coalesce(e.lake_id, 0), coalesce(e.river_id, 0), e.species_slug
            ORDER BY e.length_in DESC NULLS LAST, e.weight_lb DESC NULLS LAST, e.caught_year DESC
          ) AS rn,
          count(*) OVER (
            PARTITION BY coalesce(e.lake_id, 0), coalesce(e.river_id, 0), e.species_slug
          ) AS entries
        FROM master_angler_entries e
        WHERE (e.lake_id IS NOT NULL OR e.river_id IS NOT NULL) AND e.length_in IS NOT NULL
      )
      SELECT json_build_object(
        'countySlug', c.slug,
        'lakeSlug', l.slug,
        'riverSlug', rv.slug,
        'speciesSlug', r.species_slug,
        'speciesName', r.species_name,
        'anglerName', r.angler_name,
        'caughtYear', r.caught_year,
        'lengthIn', r.length_in,
        'weightLb', r.weight_lb,
        'method', r.method,
        'entryCount', r.entries::int,
        'stateRecord', r.state_record,
        'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM ranked r
      JOIN counties c ON c.id = r.county_id
      LEFT JOIN lakes l ON l.id = r.lake_id
      LEFT JOIN rivers rv ON rv.id = r.river_id
      WHERE r.rn = 1
      ORDER BY c.slug, l.slug NULLS LAST, rv.slug NULLS LAST, r.species_slug`,
  },
  {
    file: "great-lakes-records.json",
    sql: `
      WITH ranked AS (
        SELECT
          e.*,
          row_number() OVER (
            PARTITION BY e.water_name, e.species_slug
            ORDER BY e.length_in DESC NULLS LAST, e.weight_lb DESC NULLS LAST, e.caught_year DESC
          ) AS rn,
          count(*) OVER (PARTITION BY e.water_name, e.species_slug) AS entries
        FROM master_angler_entries e
        WHERE e.county_id IS NULL AND e.water_name IS NOT NULL AND e.length_in IS NOT NULL
      )
      SELECT json_build_object(
        'waterName', r.water_name,
        'speciesSlug', r.species_slug,
        'speciesName', r.species_name,
        'anglerName', r.angler_name,
        'caughtYear', r.caught_year,
        'lengthIn', r.length_in,
        'weightLb', r.weight_lb,
        'method', r.method,
        'entryCount', r.entries::int,
        'stateRecord', r.state_record,
        'updatedAt', to_char(r.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS row
      FROM ranked r
      WHERE r.rn = 1
      ORDER BY r.water_name, r.species_slug`,
  },
  {
    file: "record-summary.json",
    sql: `
      SELECT json_build_object(
        'speciesSlug', e.species_slug,
        'speciesName', e.species_name,
        'entryCount', count(*)::int,
        'countyCount', count(DISTINCT e.county_id)::int,
        'firstYear', min(e.caught_year),
        'lastYear', max(e.caught_year),
        'minLengthIn', max(e.min_length_in),
        'bestLengthIn', max(e.length_in)
      ) AS row
      FROM master_angler_entries e
      GROUP BY e.species_slug, e.species_name
      ORDER BY e.species_slug`,
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

const COMPACT_ROW_THRESHOLD: number = 400;

function serialize(value: unknown): string {
  if (Array.isArray(value) && value.length > COMPACT_ROW_THRESHOLD) {
    const lines: string[] = value.map((row: unknown): string => JSON.stringify(row));
    return `[\n${lines.join(",\n")}\n]`;
  }
  return JSON.stringify(value, null, 2);
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(join(DATA_DIR, file), `${serialize(value)}\n`, "utf8");
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
