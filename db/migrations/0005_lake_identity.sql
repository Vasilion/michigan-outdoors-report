DELETE FROM lakes a USING lakes b
WHERE a.id > b.id AND a.source_record_id IS NOT NULL
  AND a.source_record_id = b.source_record_id;

CREATE UNIQUE INDEX IF NOT EXISTS lakes_source_record_idx
  ON lakes (source_record_id) WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS access_sites_source_record_idx
  ON access_sites (source_record_id) WHERE source_record_id IS NOT NULL;
