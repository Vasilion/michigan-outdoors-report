ALTER TABLE rivers ADD COLUMN IF NOT EXISTS blue_ribbon boolean NOT NULL DEFAULT false;
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS blue_ribbon_miles double precision;
ALTER TABLE rivers ADD COLUMN IF NOT EXISTS blue_ribbon_reach text;
