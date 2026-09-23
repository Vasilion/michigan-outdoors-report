ALTER TABLE rivers ADD COLUMN IF NOT EXISTS county_id bigint REFERENCES counties(id);
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS peninsula peninsula_type;
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS stream_types text;
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS trout_regulation text;
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS gear_restriction text;

ALTER TABLE rivers DROP CONSTRAINT IF EXISTS rivers_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS rivers_county_slug_idx ON rivers (county_id, slug);
CREATE INDEX IF NOT EXISTS rivers_name_idx ON rivers (lower(name));
