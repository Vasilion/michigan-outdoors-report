CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE peninsula_type AS ENUM ('UP', 'NLP', 'SLP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE species_kind AS ENUM ('game', 'fish');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public_land_type AS ENUM (
    'state_game_area', 'state_forest', 'national_forest',
    'state_park', 'hunter_access', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_site_type AS ENUM ('boat_launch', 'fishing_access');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE water_type AS ENUM ('lake', 'river');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM (
    'processor', 'taxidermist', 'guide', 'charter', 'bait_shop', 'outfitter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE run_status AS ENUM ('ok', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS counties (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  peninsula        peninsula_type NOT NULL,
  area_sq_mi       double precision,
  geom             geometry(MultiPolygon, 4326),
  centroid         geometry(Point, 4326),
  source_url       text NOT NULL,
  source_record_id text,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS county_adjacency (
  county_id          bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  neighbor_county_id bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  PRIMARY KEY (county_id, neighbor_county_id)
);

CREATE TABLE IF NOT EXISTS species (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  plural_name text NOT NULL,
  slug        text NOT NULL UNIQUE,
  kind        species_kind NOT NULL,
  same_as_url text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lakes (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  slug             text NOT NULL,
  county_id        bigint NOT NULL REFERENCES counties(id),
  township         text,
  acres            double precision,
  max_depth_ft     double precision,
  geom_point       geometry(Point, 4326),
  geom_polygon     geometry(MultiPolygon, 4326),
  dnr_map_url      text,
  dnr_ids          jsonb NOT NULL DEFAULT '{}'::jsonb,
  has_special_regs boolean NOT NULL DEFAULT false,
  source_url       text NOT NULL,
  source_record_id text,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, slug)
);

CREATE TABLE IF NOT EXISTS rivers (
  id                       bigserial PRIMARY KEY,
  name                     text NOT NULL,
  slug                     text NOT NULL UNIQUE,
  geom                     geometry(MultiLineString, 4326),
  designated_trout_stream  boolean NOT NULL DEFAULT false,
  source_url               text NOT NULL,
  source_record_id         text,
  fetched_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS river_counties (
  river_id  bigint NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
  county_id bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  PRIMARY KEY (river_id, county_id)
);

CREATE TABLE IF NOT EXISTS public_lands (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  type             public_land_type NOT NULL,
  acres            double precision,
  geom             geometry(MultiPolygon, 4326),
  centroid         geometry(Point, 4326),
  managing_agency  text NOT NULL,
  official_url     text,
  source_url       text NOT NULL,
  source_record_id text,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_land_counties (
  public_land_id bigint NOT NULL REFERENCES public_lands(id) ON DELETE CASCADE,
  county_id      bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  PRIMARY KEY (public_land_id, county_id)
);

CREATE TABLE IF NOT EXISTS access_sites (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  type             access_site_type NOT NULL,
  geom             geometry(Point, 4326) NOT NULL,
  lake_id          bigint REFERENCES lakes(id),
  river_id         bigint REFERENCES rivers(id),
  county_id        bigint NOT NULL REFERENCES counties(id),
  amenities        jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url       text NOT NULL,
  source_record_id text,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stocking_events (
  id               bigserial PRIMARY KEY,
  water_type       water_type NOT NULL,
  water_name       text NOT NULL,
  lake_id          bigint REFERENCES lakes(id),
  river_id         bigint REFERENCES rivers(id),
  county_id        bigint NOT NULL REFERENCES counties(id),
  species_id       bigint NOT NULL REFERENCES species(id),
  strain           text,
  count            integer NOT NULL CHECK (count >= 0),
  avg_length_in    double precision,
  stocked_on       date NOT NULL,
  source_url       text NOT NULL,
  source_record_id text NOT NULL,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id)
);

CREATE TABLE IF NOT EXISTS harvest_snapshots (
  id               bigserial PRIMARY KEY,
  county_id        bigint NOT NULL REFERENCES counties(id),
  species_id       bigint NOT NULL REFERENCES species(id),
  season_year      integer NOT NULL,
  antlered         integer CHECK (antlered >= 0),
  antlerless       integer CHECK (antlerless >= 0),
  total            integer NOT NULL CHECK (total >= 0),
  snapshot_date    date NOT NULL,
  is_final         boolean NOT NULL DEFAULT false,
  source_url       text NOT NULL,
  source_record_id text,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, species_id, season_year, snapshot_date)
);

CREATE TABLE IF NOT EXISTS seasons (
  id            bigserial PRIMARY KEY,
  species_id    bigint NOT NULL REFERENCES species(id),
  name          text NOT NULL,
  zone          text NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  notes         text,
  source_url    text NOT NULL,
  last_verified date NOT NULL,
  UNIQUE (species_id, name, zone, start_date),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS directory_listings (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL,
  slug           text NOT NULL UNIQUE,
  category       listing_category NOT NULL,
  county_id      bigint NOT NULL REFERENCES counties(id),
  address        text,
  phone          text,
  website        text,
  geom           geometry(Point, 4326),
  featured       boolean NOT NULL DEFAULT false,
  featured_until date,
  verified       boolean NOT NULL DEFAULT false,
  source_url     text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redirects (
  from_path  text PRIMARY KEY,
  to_path    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_runs (
  id           bigserial PRIMARY KEY,
  importer     text NOT NULL,
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz,
  rows_in      integer NOT NULL DEFAULT 0,
  rows_upserted integer NOT NULL DEFAULT 0,
  status       run_status NOT NULL DEFAULT 'ok',
  error        text
);

CREATE INDEX IF NOT EXISTS lakes_county_idx ON lakes (county_id);
CREATE INDEX IF NOT EXISTS lakes_geom_idx ON lakes USING gist (geom_point);
CREATE INDEX IF NOT EXISTS access_sites_geom_idx ON access_sites USING gist (geom);
CREATE INDEX IF NOT EXISTS access_sites_lake_idx ON access_sites (lake_id);
CREATE INDEX IF NOT EXISTS public_lands_geom_idx ON public_lands USING gist (geom);
CREATE INDEX IF NOT EXISTS stocking_lake_idx ON stocking_events (lake_id, stocked_on);
CREATE INDEX IF NOT EXISTS stocking_county_idx ON stocking_events (county_id, species_id);
CREATE INDEX IF NOT EXISTS harvest_county_species_idx
  ON harvest_snapshots (county_id, species_id, season_year);
CREATE INDEX IF NOT EXISTS counties_geom_idx ON counties USING gist (geom);
CREATE INDEX IF NOT EXISTS directory_county_category_idx
  ON directory_listings (county_id, category);
