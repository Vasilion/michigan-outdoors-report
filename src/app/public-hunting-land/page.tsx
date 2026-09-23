import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Landmark, Map as MapIcon, TreePine, Trees } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  PageIntro,
  Section,
  SourceNote,
  VerifyNotice,
} from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRowData } from "@/components/data";
import { CountyChoropleth } from "@/components/map/county-map";
import { Card, CardContent } from "@/components/ui/card";
import { Stat, StatGrid } from "@/components/ui/stat";
import type { StatProps } from "@/components/ui/stat";
import { breadcrumbSchema, faqSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb, FaqEntry } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount, formatLongDate } from "@/lib/format";
import { getCounties, getMeta, getPublicLands } from "@/lib/data/snapshot";
import type { County, LandProgram, PublicLand } from "@/lib/data/schemas";
import {
  PROGRAM_META,
  huntableAcresForCounty,
  programTotals,
  programsForCounty,
  publicLandAcres,
  publicLandsByType,
} from "@/lib/views/land-access";
import type { ProgramMeta } from "@/lib/views/land-access";

export const metadata: Metadata = buildMetadata({
  title: "Public Hunting Land in Michigan: Every Access Type",
  description:
    "State game areas, state forest, Commercial Forest, the Hunting Access Program and GEMS, with acreage by county and the rules that apply to each.",
  path: "/public-hunting-land/",
  indexable: true,
  ogImagePath: "/og/default.png",
});

const COUNTY_COLUMNS: readonly TableColumn[] = [
  { key: "county", label: "County" },
  { key: "total", label: "Huntable acres", numeric: true },
  { key: "cf", label: "Commercial Forest", numeric: true },
  { key: "hap", label: "Hunting Access", numeric: true },
  { key: "units", label: "Named units", numeric: true },
];

type CountyRow = {
  readonly county: County;
  readonly total: number;
  readonly commercialForest: number;
  readonly hunterAccess: number;
  readonly units: number;
};

export default function PublicHuntingLandPage(): ReactElement {
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  const lands: readonly PublicLand[] = getPublicLands();
  const byType: Map<string, PublicLand[]> = publicLandsByType();

  const rows: CountyRow[] = getCounties().map((county: County): CountyRow => {
    const programs: readonly LandProgram[] = programsForCounty(county.slug);
    const cf: number = programs
      .filter((program: LandProgram): boolean => program.program === "commercial_forest")
      .reduce((total: number, program: LandProgram): number => total + program.acres, 0);
    const hap: number = programs
      .filter((program: LandProgram): boolean => program.program === "hunter_access")
      .reduce((total: number, program: LandProgram): number => total + program.acres, 0);
    return {
      county,
      total: huntableAcresForCounty(county.slug),
      commercialForest: Math.round(cf),
      hunterAccess: Math.round(hap),
      units: lands.filter((land: PublicLand): boolean =>
        land.countySlugs.includes(county.slug),
      ).length,
    };
  });
  rows.sort((a: CountyRow, b: CountyRow): number => b.total - a.total);

  const countyNames: Map<string, string> = new Map<string, string>();
  const mapValues: Map<string, number> = new Map<string, number>();
  for (const row of rows) {
    countyNames.set(row.county.slug, row.county.name);
    if (row.total > 0) {
      mapValues.set(row.county.slug, row.total);
    }
  }

  const cfTotals: { counties: number; parcels: number; acres: number } =
    programTotals("commercial_forest");
  const hapTotals: { counties: number; parcels: number; acres: number } =
    programTotals("hunter_access");
  const namedAcres: number = lands.reduce(
    (total: number, land: PublicLand): number => total + (land.acres ?? 0),
    0,
  );
  const gems: readonly PublicLand[] = byType.get("gems") ?? [];

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Public hunting land", path: "/public-hunting-land/" },
  ];

  const summary: string = `Michigan opens land to public hunting through several separate programs that are documented in separate places. This page puts them in one table: ${formatCount(lands.length)} named DNR units covering ${formatCount(Math.round(namedAcres))} acres, ${formatCount(cfTotals.acres)} acres of privately owned Commercial Forest across ${formatCount(cfTotals.counties)} counties, and ${formatCount(hapTotals.acres)} acres of leased private land in the Hunting Access Program across ${formatCount(hapTotals.counties)} counties. Rules differ by program and are listed with each one. Data read ${formatLongDate(dataDate)}.`;

  const facts: StatProps[] = [
    {
      label: "Commercial Forest acres",
      value: formatCount(cfTotals.acres),
      icon: Trees,
      tone: "accent",
    },
    { label: "Named DNR units", value: formatCount(lands.length), icon: Landmark },
    {
      label: "Hunting Access acres",
      value: formatCount(hapTotals.acres),
      icon: MapIcon,
    },
    { label: "GEMS grouse sites", value: formatCount(gems.length), icon: TreePine },
  ];

  const countyRows: readonly TableRowData[] = rows
    .filter((row: CountyRow): boolean => row.total > 0)
    .map((row: CountyRow): TableRowData => ({
      county: (
        <Link href={`/county/${row.county.slug}/`} prefetch={false}>
          {row.county.name}
        </Link>
      ),
      total: formatCount(row.total),
      cf: row.commercialForest === 0 ? "—" : formatCount(row.commercialForest),
      hap: row.hunterAccess === 0 ? "—" : formatCount(row.hunterAccess),
      units: formatCount(row.units),
    }));

  const faqs: readonly FaqEntry[] = [
    {
      question: "Can you hunt on Commercial Forest land in Michigan?",
      answer: `Yes. Commercial Forest land is privately owned timber land whose owner receives a reduced tax rate in exchange for allowing public foot access for hunting and fishing. Michigan has about ${formatCount(cfTotals.acres)} acres enrolled across ${formatCount(cfTotals.counties)} counties. Access is on foot only, for hunting and fishing only. No camping, no vehicles, no fires. The land is still private property and active logging is common.`,
    },
    {
      question: "What is the Michigan Hunting Access Program?",
      answer: `The Hunting Access Program leases private land from willing landowners and opens it to public hunting. It currently covers about ${formatCount(hapTotals.acres)} acres across ${formatCount(hapTotals.counties)} counties, concentrated in the southern Lower Peninsula where public land is scarce. Each parcel has its own hunt type and check-in rule, and many use a self-service check-in station at the parking area.`,
    },
    {
      question: "What is a GEMS site in Michigan?",
      answer: `A Grouse Enhanced Management Site is a block of state forest actively managed for young aspen, the cover ruffed grouse and woodcock need. Michigan has ${formatCount(gems.length)} of them, each with marked hunter walking trails and a kiosk at the main parking area.`,
    },
    {
      question: "Which Michigan county has the most public hunting land?",
      answer:
        rows[0] === undefined
          ? "County-level acreage is listed in the table on this page."
          : `By combined acreage across all the programs on this page, ${rows[0].county.name} County has the most, at roughly ${formatCount(rows[0].total)} acres. Acreage is not the same as quality, and counties with large state forest holdings dominate the top of the list.`,
    },
  ];

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">Every way to hunt public land</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Public hunting land in Michigan</h1>
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
        eyebrow="Know before you go"
        title="The programs, and what each one allows"
        icon={Trees}
        description="These are separate programs with separate rules. The difference matters most for vehicles, camping and overnight equipment."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PROGRAM_META.map((meta: ProgramMeta): ReactElement => {
            const totals: { counties: number; parcels: number; acres: number } =
              programTotals(meta.key);
            return (
              <Card key={meta.key}>
                <CardContent className="grid gap-2">
                  <h3 className="text-lg font-semibold">{meta.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {formatCount(totals.acres)} acres · {formatCount(totals.parcels)}{" "}
                    parcels · {formatCount(totals.counties)} counties
                  </p>
                  <p className="text-sm">{meta.summary}</p>
                  <p className="border-l-2 border-sand-200 pl-3 text-sm">{meta.rules}</p>
                  <p className="text-sm">
                    <a href={meta.officialUrl} rel="noopener">
                      Official DNR page for {meta.shortName}
                    </a>
                  </p>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="grid gap-2">
              <h3 className="text-lg font-semibold">State game and wildlife areas</h3>
              <p className="text-muted-foreground text-sm">
                {formatCount(publicLandAcres("state_game_area"))} acres ·{" "}
                {formatCount((byType.get("state_game_area") ?? []).length)} named units
              </p>
              <p className="text-sm">
                Land the DNR owns and manages primarily for wildlife. Open to hunting
                under statewide regulations unless a specific area posts its own rules.
              </p>
              <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                {[...(byType.get("state_game_area") ?? [])]
                  .sort(
                    (a: PublicLand, b: PublicLand): number =>
                      (b.acres ?? 0) - (a.acres ?? 0),
                  )
                  .slice(0, 10)
                  .map((unit: PublicLand): ReactElement => (
                    <li key={unit.slug}>
                      <Link href={`/public-land/${unit.slug}/`} prefetch={false}>
                        {unit.name}
                      </Link>
                    </li>
                  ))}
              </ul>
              <p className="text-muted-foreground text-sm">
                The ten largest. Every unit is listed on its county page.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-2">
              <h3 className="text-lg font-semibold">Grouse Enhanced Management Sites</h3>
              <p className="text-muted-foreground text-sm">
                {formatCount(publicLandAcres("gems"))} acres · {formatCount(gems.length)}{" "}
                sites
              </p>
              <p className="text-sm">
                State forest blocks managed for young aspen, with marked hunter walking
                trails and a kiosk at the main parking area.
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {[...gems]
                  .sort((a: PublicLand, b: PublicLand): number =>
                    a.name.localeCompare(b.name),
                  )
                  .map((site: PublicLand): ReactElement => (
                    <li key={site.slug}>
                      <Link href={`/public-land/${site.slug}/`} prefetch={false}>
                        {site.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Huntable acres by county"
        icon={MapIcon}
        description="Combined acreage across every program on this page. Darker counties have more."
      >
        <CountyChoropleth
          title="Combined public hunting acreage by Michigan county"
          unitLabel="acres"
          values={mapValues}
          names={countyNames}
          hrefFor={(slug: string): string => `/county/${slug}/`}
        />
      </Section>

      <Section
        title="County table"
        description="Named units counts every DNR unit that touches the county, so a unit spanning two counties is counted in both."
      >
        <DataTable
          caption="Michigan public hunting land acreage by county and program."
          columns={COUNTY_COLUMNS}
          rows={countyRows}
        />
      </Section>

      <div className="mt-10">
        <PageIntro>
          <VerifyNotice href="https://www.michigan.gov/dnr/things-to-do/hunting">
            Acreage here is measured from the DNR&rsquo;s own published boundaries and is
            useful for comparison, not for establishing a property line. Commercial Forest
            enrollment changes as owners join and leave. Confirm any specific parcel on
            the DNR Mi-HUNT viewer before you hunt it.
          </VerifyNotice>
        </PageIntro>
      </div>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={dataDate} />
        <SourceNote
          label="Michigan DNR wildlife lands, Commercial Forest, Hunting Access Program and GEMS layers"
          href="https://gis-midnr.opendata.arcgis.com/"
          retrieved={dataDate}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          faqSchema(faqs),
          itemListSchema(
            "Michigan counties by public hunting acreage",
            rows.slice(0, 25).map((row: CountyRow) => ({
              name: row.county.name,
              path: `/county/${row.county.slug}/`,
            })),
          ),
        ]}
      />
    </div>
  );
}
