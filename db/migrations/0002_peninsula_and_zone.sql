ALTER TABLE counties ALTER COLUMN peninsula TYPE text;

DROP TYPE IF EXISTS peninsula_type;

CREATE TYPE peninsula_type AS ENUM ('UP', 'LP');

ALTER TABLE counties
  ALTER COLUMN peninsula TYPE peninsula_type USING peninsula::peninsula_type;

ALTER TABLE species ADD COLUMN IF NOT EXISTS official_url text;

ALTER TABLE public_lands ADD COLUMN IF NOT EXISTS hunting_status text;
