import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import {
  CalendarDays,
  Database,
  Download,
  FileSearch,
  Map as MapIcon,
  Target,
  TreePine,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { LastUpdated, Section } from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRowData } from "@/components/data";
import { CountyChoropleth } from "@/components/map/county-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import { formatCount, formatLongDate } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { itemListSchema } from "@/lib/schema/builders";
import { SITE } from "@/lib/site";
import {
  getCounties,
  getMeta,
  getPublicLands,
  getSeasons,
  getSpecies,
} from "@/lib/data/snapshot";
import type { County, PublicLand, Season, Species } from "@/lib/data/schemas";
import { harvestSeries } from "@/lib/views/county";
import type { HarvestSeries } from "@/lib/views/county";
import { daysBetween, nextOpeningSeason, seasonStatus } from "@/lib/season";
import type { SeasonStatus } from "@/lib/season";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting & Fishing Data by County",
  description:
    "Deer harvest totals, public land acreage and season dates for all 83 Michigan counties, straight from Michigan DNR data. Free to read, free to download.",
  path: "/",
  indexable: true,
});

type CountyRank = {
  readonly county: County;
  readonly total: number;
};

export default function HomePage(): ReactElement {
  const counties: readonly County[] = getCounties();
  const species: readonly Species[] = getSpecies();
  const lands: readonly PublicLand[] = getPublicLands();
  const seasons: readonly Season[] = getSeasons();
  const today: string = getMeta().generatedAt.slice(0, 10);

  const ranked: CountyRank[] = counties
    .map((county: County): CountyRank => {
      const series: HarvestSeries = harvestSeries(county.slug, "deer");
      return { county, total: series.latestFinal?.total ?? 0 };
    })
    .filter((entry: CountyRank): boolean => entry.total > 0)
    .sort((a: CountyRank, b: CountyRank): number => b.total - a.total);

  const latestYear: number =
    harvestSeries((counties[0] as County)?.slug ?? "", "deer").latestFinal?.seasonYear ??
    0;
  const statewideTotal: number = ranked.reduce(
    (total: number, entry: CountyRank): number => total + entry.total,
    0,
  );
  const publicLandAcres: number = lands.reduce(
    (total: number, land: PublicLand): number => total + (land.acres ?? 0),
    0,
  );

  const values: Map<string, number> = new Map<string, number>();
  const names: Map<string, string> = new Map<string, string>();
  for (const entry of ranked) {
    values.set(entry.county.slug, entry.total);
  }
  for (const county of counties) {
    names.set(county.slug, county.name);
  }

  const nextSeason: Season | null = nextOpeningSeason(seasons, today);
  const openSeasons: readonly Season[] = seasons.filter(
    (season: Season): boolean => seasonStatus(season, today).state === "open",
  );

  const topColumns: readonly TableColumn[] = [
    { key: "rank", label: "#" },
    { key: "county", label: "County" },
    { key: "peninsula", label: "Peninsula" },
    { key: "total", label: `${latestYear} deer reported`, numeric: true },
  ];

  const topRows: readonly TableRowData[] = ranked
    .slice(0, 10)
    .map((entry: CountyRank, index: number): TableRowData => ({
      rank: String(index + 1),
      county: (
        <Link href={`/county/${entry.county.slug}/deer-hunting/`} prefetch={false}>
          {entry.county.name} County
        </Link>
      ),
      peninsula: entry.county.peninsula === "UP" ? "Upper" : "Lower",
      total: formatCount(entry.total),
    }));

  const upperCounties: readonly County[] = counties.filter(
    (county: County): boolean => county.peninsula === "UP",
  );
  const lowerCounties: readonly County[] = counties.filter(
    (county: County): boolean => county.peninsula === "LP",
  );

  return (
    <>
      <div className="topo text-pine-100">
        <div className="wrap py-16 md:py-20">
          <p className="eyebrow text-pine-200">Michigan only. DNR data only.</p>
          <h1 className="mt-3 max-w-[18ch] text-4xl text-white md:text-6xl">
            Every Michigan county, by the numbers that matter.
          </h1>
          <p className="text-pine-100 mt-5 max-w-[60ch] text-lg">
            Reported deer harvest, public hunting land and season dates for all{" "}
            {formatCount(counties.length)} counties. Built from the Michigan DNR&apos;s
            own published data, with a source and a date on every figure.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/hunting/deer/"
              prefetch={false}
              className="bg-blaze-600 hover:bg-blaze-700 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white no-underline"
            >
              <Target aria-hidden="true" className="h-4 w-4" />
              Deer harvest by county
            </Link>
            <Link
              href="#counties"
              prefetch={false}
              className="border-pine-400 text-pine-100 hover:bg-pine-800 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold no-underline"
            >
              <MapIcon aria-hidden="true" className="h-4 w-4" />
              Browse all counties
            </Link>
            {nextSeason === null ? null : (
              <span className="text-pine-100 inline-flex items-center gap-2 text-sm">
                <CalendarDays aria-hidden="true" className="text-pine-300 h-4 w-4" />
                {nextSeason.name} opens in{" "}
                <strong className="text-white">
                  {daysBetween(today, nextSeason.startDate)} days
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="wrap pb-16">
        <div className="-mt-8 md:-mt-10">
          <StatGrid>
            <Stat
              label={`${latestYear} deer reported`}
              value={formatCount(statewideTotal)}
              hint="statewide, all seasons"
              icon={Target}
            />
            <Stat
              label="Counties covered"
              value={formatCount(counties.length)}
              hint="every one in Michigan"
              icon={MapIcon}
            />
            <Stat
              label="Public land mapped"
              value={`${formatCount(Math.round(publicLandAcres / 1000))}k acres`}
              hint={`${formatCount(lands.length)} named units`}
              icon={TreePine}
            />
            <Stat
              label="Seasons on record"
              value={formatCount(seasons.length)}
              hint="verified against the digest"
              icon={CalendarDays}
            />
          </StatGrid>
        </div>

        <Section
          id="map"
          eyebrow="Where the deer are"
          title={`${latestYear} reported deer harvest`}
          description="Darker counties reported more deer. Every county is clickable and every figure is the DNR's own count of reported animals, not an estimate."
          icon={MapIcon}
        >
          <Card>
            <CardContent>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <CountyChoropleth
                  title={`Reported deer harvest by Michigan county, ${latestYear} season`}
                  unitLabel="deer reported"
                  values={values}
                  names={names}
                  hrefFor={(slug: string): string => `/county/${slug}/deer-hunting/`}
                />
                <div>
                  <p className="eyebrow">Top counties</p>
                  <ol className="mt-3 grid gap-1.5">
                    {ranked
                      .slice(0, 8)
                      .map((entry: CountyRank, index: number): ReactElement => (
                        <li
                          key={entry.county.slug}
                          className="border-border flex items-baseline justify-between gap-3 border-b pb-1.5 text-sm last:border-0"
                        >
                          <span className="flex items-baseline gap-2">
                            <span className="text-bark-400 numeric w-4 text-xs">
                              {index + 1}
                            </span>
                            <Link
                              href={`/county/${entry.county.slug}/deer-hunting/`}
                              prefetch={false}
                            >
                              {entry.county.name}
                            </Link>
                          </span>
                          <span className="numeric text-bark-600 font-semibold">
                            {formatCount(entry.total)}
                          </span>
                        </li>
                      ))}
                  </ol>
                  <p className="mt-4 text-sm">
                    <Link href="/hunting/deer/" prefetch={false}>
                      See all {formatCount(ranked.length)} counties ranked
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {seasons.length === 0 ? null : (
          <Section
            eyebrow="Right now"
            title="Season status"
            description={`Calculated ${formatLongDate(today)} from dates verified against the Michigan DNR digest.`}
            icon={CalendarDays}
          >
            <div className="flex flex-wrap gap-2">
              {seasons.map((season: Season): ReactElement => {
                const status: SeasonStatus = seasonStatus(season, today);
                return (
                  <Badge
                    key={`${season.name}-${season.zone}`}
                    variant={
                      status.state === "open"
                        ? "open"
                        : status.state === "upcoming"
                          ? "upcoming"
                          : "closed"
                    }
                  >
                    {season.name}
                    <span className="font-medium">
                      {status.state === "open"
                        ? "open now"
                        : status.state === "upcoming"
                          ? `in ${status.daysUntilOpen ?? 0}d`
                          : "closed"}
                    </span>
                  </Badge>
                );
              })}
            </div>
            <p className="mt-4 text-sm">
              <Link href="/seasons/deer/" prefetch={false}>
                All Michigan deer season dates, zones and notes
              </Link>
            </p>
            {openSeasons.length === 0 ? null : (
              <p className="text-muted-foreground mt-1 text-sm">
                Open today:{" "}
                {openSeasons.map((season: Season): string => season.name).join(", ")}.
              </p>
            )}
          </Section>
        )}

        <Section
          eyebrow="Leaderboard"
          title={`Top 10 counties, ${latestYear} season`}
          description="Reported harvest, highest first. Every county has its own page with the full multi-season history."
          icon={Target}
        >
          <DataTable
            caption={`Michigan counties with the highest reported deer harvest in the ${latestYear} season, from Michigan DNR harvest reporting.`}
            columns={topColumns}
            rows={topRows}
          />
        </Section>

        <Section
          id="counties"
          eyebrow="All 83"
          title="Browse by county"
          description="Harvest history, public land, season dates and sources for every Michigan county."
          icon={MapIcon}
        >
          <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
            <div>
              <h3 className="text-lg">Upper Peninsula</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {upperCounties.map((county: County): ReactElement => (
                  <li key={county.slug}>
                    <Link href={`/county/${county.slug}/`} prefetch={false}>
                      {county.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg">Lower Peninsula</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
                {lowerCounties.map((county: County): ReactElement => (
                  <li key={county.slug}>
                    <Link href={`/county/${county.slug}/`} prefetch={false}>
                      {county.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Why trust it"
          title="Data you can check"
          description="This site exists because DNR data is public but hard to use. Nothing here is modelled, estimated or padded out."
          icon={Database}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent>
                <FileSearch aria-hidden="true" className="text-pine-600 h-5 w-5" />
                <h3 className="mt-3 text-base font-semibold">
                  Every figure has a source
                </h3>
                <p className="text-bark-600 mt-2 text-sm">
                  Each page names the dataset it came from and the date it was read.
                  Regulation summaries always link to the official digest.
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/methodology/" prefetch={false}>
                    Read the methodology
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Database aria-hidden="true" className="text-pine-600 h-5 w-5" />
                <h3 className="mt-3 text-base font-semibold">Missing means missing</h3>
                <p className="text-bark-600 mt-2 text-sm">
                  If the DNR has not published a number, the section is left out rather
                  than filled with a guess. Pages without enough data are never generated.
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/about/" prefetch={false}>
                    How the site is built
                  </Link>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Download aria-hidden="true" className="text-pine-600 h-5 w-5" />
                <h3 className="mt-3 text-base font-semibold">Take the data with you</h3>
                <p className="text-bark-600 mt-2 text-sm">
                  Every dataset behind these pages is downloadable as CSV or JSON, rebuilt
                  on each deploy, free with attribution.
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/data/" prefetch={false}>
                    Download the datasets
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          eyebrow="Next"
          title="Coming before first ice"
          description="Fishing is the other half of this site and it is being built now."
          icon={TreePine}
        >
          <p className="text-bark-600 max-w-[70ch]">
            Lake pages with stocking history and DNR map links, boating and fishing access
            sites with coordinates, and county fish pages are in progress. Species hubs
            for {species.length === 1 ? "turkey and small game" : "more species"} follow
            the same pattern as deer: real counts, sourced and dated.
          </p>
        </Section>

        <div className="mt-12">
          <LastUpdated isoDate={today} />
          <p className="text-muted-foreground mt-1 text-sm">{SITE.disclaimer}</p>
        </div>
      </div>

      <JsonLd
        schemas={[
          itemListSchema(
            "Michigan county hunting and fishing guides",
            counties.map((county: County) => ({
              name: `${county.name} County`,
              path: `/county/${county.slug}/`,
            })),
          ),
        ]}
      />
    </>
  );
}
