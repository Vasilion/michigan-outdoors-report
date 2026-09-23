DO $$ BEGIN
  ALTER TYPE public_land_type ADD VALUE IF NOT EXISTS 'gems';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE land_program AS ENUM ('hunter_access', 'commercial_forest');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS land_program_counties (
  program      land_program NOT NULL,
  county_id    bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  parcel_count integer NOT NULL,
  acres        double precision NOT NULL,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url   text NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program, county_id)
);

CREATE TABLE IF NOT EXISTS land_program_parcels (
  id          bigserial PRIMARY KEY,
  program     land_program NOT NULL,
  source_key  text NOT NULL,
  acres       double precision,
  centroid    geometry(Point, 4326),
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program, source_key)
);

CREATE INDEX IF NOT EXISTS land_program_parcels_centroid_idx
  ON land_program_parcels USING gist (centroid);

CREATE TABLE IF NOT EXISTS management_units (
  id           bigserial PRIMARY KEY,
  species_slug text NOT NULL,
  unit_code    text NOT NULL,
  name         text NOT NULL,
  unit_year    integer,
  geom         geometry(MultiPolygon, 4326),
  source_url   text NOT NULL,
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_slug, unit_code)
);

CREATE TABLE IF NOT EXISTS management_unit_counties (
  management_unit_id bigint NOT NULL REFERENCES management_units(id) ON DELETE CASCADE,
  county_id          bigint NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  overlap_share      double precision NOT NULL DEFAULT 0,
  PRIMARY KEY (management_unit_id, county_id)
);

CREATE TABLE IF NOT EXISTS master_angler_entries (
  id             bigserial PRIMARY KEY,
  report_id      text NOT NULL UNIQUE,
  species_id     bigint REFERENCES species(id),
  species_slug   text NOT NULL,
  species_name   text NOT NULL,
  angler_name    text,
  caught_year    integer NOT NULL,
  caught_on      date,
  water_name     text,
  county_id      bigint REFERENCES counties(id),
  lake_id        bigint REFERENCES lakes(id),
  river_id       bigint REFERENCES rivers(id),
  length_in      double precision,
  weight_lb      double precision,
  method         text,
  bait           text,
  state_record   boolean NOT NULL DEFAULT false,
  min_length_in  double precision,
  geom           geometry(Point, 4326),
  source_url     text NOT NULL,
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS master_angler_species_idx
  ON master_angler_entries (species_slug);

CREATE INDEX IF NOT EXISTS master_angler_county_idx
  ON master_angler_entries (county_id);

CREATE INDEX IF NOT EXISTS master_angler_lake_idx
  ON master_angler_entries (lake_id);

CREATE INDEX IF NOT EXISTS master_angler_geom_idx
  ON master_angler_entries USING gist (geom);
