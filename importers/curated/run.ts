import { join } from "node:path";
import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { sequential } from "../lib/db";
import { readSeasonFiles, readSpecies } from "./parse";
import type { SeasonEntry, SeasonFile, SpeciesEntry } from "./parse";

const CONTENT_DIR: string = join(process.cwd(), "content");

const SPECIES_SQL: string = `
INSERT INTO species (name, plural_name, slug, kind, same_as_url, official_url, updated_at)
VALUES ($1, $2, $3, $4::species_kind, $5, $6, now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plural_name = EXCLUDED.plural_name,
  kind = EXCLUDED.kind,
  same_as_url = EXCLUDED.same_as_url,
  official_url = EXCLUDED.official_url,
  updated_at = CASE
    WHEN species.name IS DISTINCT FROM EXCLUDED.name
      OR species.official_url IS DISTINCT FROM EXCLUDED.official_url
    THEN now() ELSE species.updated_at END`;

const SEASON_SQL: string = `
INSERT INTO seasons (species_id, name, zone, start_date, end_date, notes, source_url, last_verified)
SELECT s.id, $2, $3, $4::date, $5::date, $6, $7, $8::date
FROM species s WHERE s.slug = $1
ON CONFLICT (species_id, name, zone, start_date) DO UPDATE SET
  end_date = EXCLUDED.end_date,
  notes = EXCLUDED.notes,
  source_url = EXCLUDED.source_url,
  last_verified = EXCLUDED.last_verified`;

runImporter("curated", "species", (client: pg.Client): Promise<RunResult> => {
  const species: readonly SpeciesEntry[] = readSpecies(CONTENT_DIR);
  const seasonFiles: readonly SeasonFile[] = readSeasonFiles(CONTENT_DIR);
  let upserted: number = 0;

  return sequential(species, (entry: SpeciesEntry): Promise<unknown> => {
    upserted += 1;
    return client.query(SPECIES_SQL, [
      entry.name,
      entry.pluralName,
      entry.slug,
      entry.kind,
      entry.sameAsUrl,
      entry.officialUrl,
    ]);
  })
    .then((): Promise<void> =>
      sequential(seasonFiles, (file: SeasonFile): Promise<void> =>
        sequential(file.seasons, (season: SeasonEntry): Promise<unknown> => {
          upserted += 1;
          return client.query(SEASON_SQL, [
            file.species,
            season.name,
            season.zone,
            season.start_date,
            season.end_date,
            season.notes,
            file.source_url,
            file.last_verified,
          ]);
        }),
      ),
    )
    .then((): RunResult => {
      const seasonCount: number = seasonFiles.reduce(
        (total: number, file: SeasonFile): number => total + file.seasons.length,
        0,
      );
      process.stdout.write(
        `[curated] ${species.length} species, ${seasonCount} seasons from ${seasonFiles.length} file(s)\n`,
      );
      return { rowsIn: species.length + seasonCount, rowsUpserted: upserted };
    });
});
