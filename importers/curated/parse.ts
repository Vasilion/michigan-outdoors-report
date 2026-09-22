import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "tinyglobby";
import { parse } from "yaml";
import { z } from "zod";

const ISO_DATE: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const SLUG: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const speciesEntrySchema = z.object({
  slug: z.string().regex(SLUG),
  name: z.string().min(1),
  pluralName: z.string().min(1),
  kind: z.enum(["game", "fish"]),
  officialUrl: z.url(),
  sameAsUrl: z.url().nullable(),
});

export const seasonEntrySchema = z.object({
  name: z.string().min(1),
  zone: z.string().min(1),
  start_date: z.string().regex(ISO_DATE),
  end_date: z.string().regex(ISO_DATE),
  notes: z.string().nullable(),
});

export const seasonFileSchema = z
  .object({
    species: z.string().regex(SLUG),
    source_url: z.url(),
    source_document: z.string().min(1),
    last_verified: z.string().regex(ISO_DATE),
    license_year: z.number().int().min(2000).max(2100),
    seasons: z.array(seasonEntrySchema).min(1),
  })
  .refine(
    (file: { seasons: { start_date: string; end_date: string }[] }): boolean =>
      file.seasons.every(
        (season: { start_date: string; end_date: string }): boolean =>
          season.end_date >= season.start_date,
      ),
    { message: "a season ends before it starts" },
  );

export type SpeciesEntry = z.infer<typeof speciesEntrySchema>;
export type SeasonEntry = z.infer<typeof seasonEntrySchema>;
export type SeasonFile = z.infer<typeof seasonFileSchema>;

export function readSpecies(contentDir: string): readonly SpeciesEntry[] {
  const raw: string = readFileSync(join(contentDir, "species.yaml"), "utf8");
  return z.array(speciesEntrySchema).parse(parse(raw));
}

export function readSeasonFiles(contentDir: string): readonly SeasonFile[] {
  const seasonsDir: string = join(contentDir, "seasons");
  const files: string[] = globSync(["*.yaml"], { cwd: seasonsDir }).sort();
  return files.map((file: string): SeasonFile =>
    seasonFileSchema.parse(parse(readFileSync(join(seasonsDir, file), "utf8"))),
  );
}
