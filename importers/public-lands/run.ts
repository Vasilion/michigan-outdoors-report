import type pg from "pg";
import { runImporter } from "../lib/run";
import type { RunResult } from "../lib/run";
import { layerUrl } from "../lib/arcgis";
import type { GeoJsonFeature } from "../lib/arcgis";
import {
  GEMS_LAYER,
  PARKS_HUNTABLE_LAYER,
  WILDLIFE_PROPERTY_LAYER,
  fetchGemSites,
  fetchParkHuntableLands,
  fetchWildlifeProperties,
} from "./fetch";
import {
  parseAll,
  parseGemSite,
  parseParkHuntableLand,
  parseWildlifeProperty,
} from "./parse";
import type { RawLandParcel } from "./parse";
import { normalizePublicLands } from "./normalize";
import type { NormalizedPublicLand } from "./normalize";
import {
  deleteStalePublicLands,
  linkPublicLandCounties,
  upsertPublicLands,
} from "./upsert";

runImporter("public-lands", "public_lands", (client: pg.Client): Promise<RunResult> =>
  fetchWildlifeProperties().then(
    (wildlife: readonly GeoJsonFeature[]): Promise<RunResult> =>
      fetchParkHuntableLands().then(
        (parks: readonly GeoJsonFeature[]): Promise<RunResult> =>
          fetchGemSites().then((gems: readonly GeoJsonFeature[]): Promise<RunResult> => {
            const parcels: readonly RawLandParcel[] = [
              ...parseAll(wildlife, parseWildlifeProperty),
              ...parseAll(parks, parseParkHuntableLand),
              ...parseAll(gems, parseGemSite),
            ];
            const lands: readonly NormalizedPublicLand[] = normalizePublicLands(parcels);
            process.stdout.write(
              `[public-lands] ${parcels.length} parcels dissolved into ${lands.length} named units\n`,
            );
            const sourceUrl: string = `${layerUrl(WILDLIFE_PROPERTY_LAYER)}, ${layerUrl(PARKS_HUNTABLE_LAYER)} and ${layerUrl(GEMS_LAYER)}`;
            const runStartedAt: string = new Date().toISOString();
            return upsertPublicLands(client, lands, sourceUrl)
              .then((upserted: number): Promise<number> =>
                deleteStalePublicLands(client, runStartedAt).then(
                  (removed: number): number => {
                    if (removed > 0) {
                      process.stdout.write(
                        `[public-lands] removed ${removed} unit(s) no longer in the source\n`,
                      );
                    }
                    return upserted;
                  },
                ),
              )
              .then((upserted: number): Promise<number> =>
                linkPublicLandCounties(client).then((links: number): number => {
                  process.stdout.write(`[public-lands] ${links} land-county links\n`);
                  return upserted;
                }),
              )
              .then((upserted: number): RunResult => ({
                rowsIn: wildlife.length + parks.length + gems.length,
                rowsUpserted: upserted,
              }));
          }),
      ),
  ),
);
