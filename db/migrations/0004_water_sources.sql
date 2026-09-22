ALTER TABLE lakes ADD COLUMN IF NOT EXISTS peninsula peninsula_type;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS alternate_names text;
ALTER TABLE lakes ALTER COLUMN county_id DROP NOT NULL;

ALTER TABLE access_sites ADD COLUMN IF NOT EXISTS waterbody_name text;
ALTER TABLE access_sites ADD COLUMN IF NOT EXISTS waterbody_type text;
ALTER TABLE access_sites ADD COLUMN IF NOT EXISTS lanes integer;
ALTER TABLE access_sites ADD COLUMN IF NOT EXISTS owned_by text;

ALTER TABLE stocking_events ALTER COLUMN county_id DROP NOT NULL;
ALTER TABLE stocking_events ADD COLUMN IF NOT EXISTS county_name text;

CREATE INDEX IF NOT EXISTS lakes_name_idx ON lakes (lower(name));
CREATE INDEX IF NOT EXISTS access_sites_waterbody_idx ON access_sites (lower(waterbody_name));
CREATE INDEX IF NOT EXISTS stocking_species_date_idx ON stocking_events (species_id, stocked_on);
