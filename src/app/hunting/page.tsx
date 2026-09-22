import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { CalendarDays, Map as MapIcon, Target, TreePine } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
} from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRowData } from "@/components/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import {
  getCounties,
  getMeta,
  getPublicLands,
  getSeasons,
  getSpecies,
} from "@/lib/data/snapshot";
import type {
  County,
  HarvestSnapshot,
  PublicLand,
  Season,
  Species,
} from "@/lib/data/schemas";
import { harvestSeries } from "@/lib/views/county";
import type { HarvestSeries } from "@/lib/views/county";
import { SITE } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting: Harvest, Seasons & Public Land",
  description:
    "Reported deer and turkey harvest for all 83 Michigan counties, season dates verified against the DNR digest, and 305 public land units.",
  path: "/hunting/",
  indexable: true,
  ogImagePath: "/og/default.png",
});

type GameRow = {
  readonly species: Species;
  readonly latest: HarvestSnapshot | null;
  readonly seasons: number;
  readonly countiesWithPages: number;
};

const SMALL_GAME_URL: string =
  "https://www.michigan.gov/dnr/things-to-do/hunting/small-game";

const GAME_COLUMNS: readonly TableColumn[] = [
  { key: "species", label: "Species" },
  { key: "latest", label: "Latest season", numeric: true },
  { key: "year", label: "Season" },
  { key: "counties", label: "County pages", numeric: true },
];

export default function HuntingIndexPage(): ReactElement {
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  const counties: readonly County[] = getCounties();
  const lands: readonly PublicLand[] = getPublicLands();
  const seasons: readonly Season[] = getSeasons();

  const rows: GameRow[] = [];
  for (const species of getSpecies()) {
    if (species.kind !== "game") {
      continue;
    }
    let latestYear: number = 0;
    let latestFinal: boolean = false;
    let seasonCount: number = 0;
    let withPages: number = 0;
    for (const county of counties) {
      const series: HarvestSeries = harvestSeries(county.slug, species.slug);
      const latest: HarvestSnapshot | null = series.latestFinal ?? series.inProgress;
      if (latest === null) {
        continue;
      }
      if (latest.seasonYear > latestYear) {
        latestYear = latest.seasonYear;
        latestFinal = latest.isFinal;
      }
      seasonCount = Math.max(seasonCount, series.rows.length);
      if (series.finalRows.length >= 2) {
        withPages += 1;
      }
    }
    if (latestYear === 0) {
      continue;
    }
    let statewide: number = 0;
    for (const county of counties) {
      const series: HarvestSeries = harvestSeries(county.slug, species.slug);
      const match: HarvestSnapshot | undefined = series.rows.find(
        (row: HarvestSnapshot): boolean => row.seasonYear === latestYear,
      );
      statewide += match?.total ?? 0;
    }
    rows.push({
      species,
      latest:
        statewide === 0
          ? null
          : {
              countySlug: "",
              speciesSlug: species.slug,
              seasonYear: latestYear,
              antlered: null,
              antlerless: null,
              total: statewide,
              snapshotDate: dataDate,
              isFinal: latestFinal,
              sourceUrl: SITE.url,
            },
      seasons: seasonCount,
      countiesWithPages: withPages,
    });
  }
  rows.sort(
    (a: GameRow, b: GameRow): number => (b.latest?.total ?? 0) - (a.latest?.total ?? 0),
  );

  const gameRows: readonly TableRowData[] = rows.map((row: GameRow): TableRowData => ({
    species: (
      <Link href={`/hunting/${row.species.slug}/`} prefetch={false}>
        {row.species.name}
      </Link>
    ),
    latest: row.latest === null ? "—" : formatCount(row.latest.total),
    year:
      row.latest === null ? (
        "—"
      ) : (
        <span className="flex items-center gap-2">
          {row.latest.seasonYear}
          {row.latest.isFinal ? null : <Badge variant="live">in progress</Badge>}
        </span>
      ),
    counties:
      row.countiesWithPages === 0 ? "Next season" : formatCount(row.countiesWithPages),
  }));

  const publicAcres: number = lands.reduce(
    (total: number, land: PublicLand): number => total + (land.acres ?? 0),
    0,
  );

  const withHarvest: Set<string> = new Set<string>(
    rows.map((row: GameRow): string => row.species.slug),
  );
  const seasonSpecies: Set<string> = new Set<string>(
    seasons.map((season: Season): string => season.speciesSlug),
  );
  const smallGame: readonly Species[] = getSpecies().filter(
    (species: Species): boolean =>
      species.kind === "game" &&
      !withHarvest.has(species.slug) &&
      seasonSpecies.has(species.slug),
  );

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Hunting", path: "/hunting/" },
  ];

  const facts: StatProps[] = [
    {
      label: "Species with reported harvest",
      value: formatCount(rows.length),
      icon: Target,
      tone: "accent",
    },
    { label: "Counties covered", value: formatCount(counties.length), icon: MapIcon },
    {
      label: "Public land",
      value: `${formatCount(Math.round(publicAcres / 1000))}k acres`,
      icon: TreePine,
    },
    {
      label: "Season dates on record",
      value: formatCount(seasons.length),
      icon: CalendarDays,
    },
  ];

  const deer: GameRow | undefined = rows.find(
    (row: GameRow): boolean => row.species.slug === "deer",
  );
  const summary: string =
    deer === undefined || deer.latest === null
      ? `Reported harvest, season dates and public land for all ${formatCount(counties.length)} Michigan counties, from Michigan DNR data read ${formatLongDate(dataDate)}.`
      : `Michigan hunters reported ${formatCount(deer.latest.total)} deer in the ${deer.latest.seasonYear} season, and this site breaks that down for all ${formatCount(counties.length)} counties alongside ${formatCount(lands.length)} public land units and season dates verified against the DNR digest. Figures read ${formatLongDate(dataDate)}.`;

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">Harvest, seasons and public land</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Michigan hunting</h1>
      <div className="mt-6">
        <AnswerSummary text={summary} />
      </div>

      <div className="mt-8">
        <StatGrid>
          {facts.map((fact: StatProps): ReactElement => (
            <Stat key={fact.label} {...fact} />
          ))}
        </StatGrid>
      </div>

      <Section
        eyebrow="Mandatory harvest reporting"
        title="Species with county-level harvest"
        icon={Target}
        description="Michigan requires hunters to report a harvested deer or turkey, which is what makes a county breakdown possible. Small game harvest is estimated from mail surveys instead, and is not published at county level."
      >
        <DataTable
          caption="Michigan species with reported harvest data, from Michigan DNR harvest reporting."
          columns={GAME_COLUMNS}
          rows={gameRows}
        />
        <p className="text-muted-foreground mt-4 text-sm">
          A county page is published once a species has two completed seasons on record,
          so a species in its first year shows statewide only.
        </p>
      </Section>

      <Section
        eyebrow="No county breakdown exists"
        title="Small game"
        icon={Target}
        description="Michigan estimates small game harvest from a mail survey of licence holders, not from mandatory reports, and does not publish it by county. What the DNR does publish is season dates, so that is what this site carries."
      >
        <ul className="grid gap-2 md:grid-cols-3">
          {smallGame.map((species: Species): ReactElement => (
            <li key={species.slug}>
              <Link href={`/seasons/${species.slug}/`} prefetch={false}>
                {species.name} season dates
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-4 text-sm">
          Red squirrel, ground squirrel, woodchuck, feral pigeon, house sparrow and
          starling are open year round statewide, so they carry no season dates. Check the{" "}
          <a href={SMALL_GAME_URL} rel="noopener">
            official small game digest
          </a>{" "}
          for bag limits and the rules that apply on state parks and recreation areas.
        </p>
      </Section>

      <Section
        title="Season dates"
        icon={CalendarDays}
        description="Transcribed from the Michigan DNR digest, each entry carrying its source and the date it was verified."
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {[...new Set(seasons.map((season: Season): string => season.speciesSlug))]
            .filter((slug: string): boolean => withHarvest.has(slug))
            .map((slug: string): ReactElement => {
              const species: Species | undefined = getSpecies().find(
                (entry: Species): boolean => entry.slug === slug,
              );
              return (
                <li key={slug}>
                  <Link href={`/seasons/${slug}/`} prefetch={false}>
                    {species?.name ?? slug} season dates
                  </Link>
                </li>
              );
            })}
          <li>
            <Link href="/seasons/" prefetch={false}>
              All season dates
            </Link>
          </li>
        </ul>
      </Section>

      <Section
        title="Start from a county"
        icon={MapIcon}
        description="Every county page carries its harvest history, public land and the seasons that apply there."
      >
        <Card>
          <CardContent>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
              {counties.map((county: County): ReactElement => (
                <li key={county.slug}>
                  <Link href={`/county/${county.slug}/`} prefetch={false}>
                    {county.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={dataDate} />
        <SourceNote
          label="Michigan DNR harvest report summary"
          href="https://www.mdnr-elicense.com/HarvestReportSummary"
          retrieved={dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          itemListSchema(
            "Michigan game species harvest pages",
            rows.map((row: GameRow) => ({
              name: row.species.name,
              path: `/hunting/${row.species.slug}/`,
            })),
          ),
        ]}
      />
    </div>
  );
}
