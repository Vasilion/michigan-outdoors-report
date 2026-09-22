import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  Section,
  SourceNote,
} from "@/components/layout";
import { DataTable, FaqBlock } from "@/components/data";
import type { FaqItem, TableColumn, TableRowData } from "@/components/data";
import { breadcrumbSchema, faqSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatLongDate } from "@/lib/format";
import {
  getHarvestSnapshots,
  getMeta,
  getSeasons,
  getSpecies,
} from "@/lib/data/snapshot";
import type { HarvestSnapshot, Season, Species } from "@/lib/data/schemas";
import { nextOpeningSeason, seasonStatus } from "@/lib/season";
import type { SeasonStatus } from "@/lib/season";
import { SITE } from "@/lib/site";

export type SeasonParams = {
  readonly species: string;
};

export type SeasonPageProps = {
  readonly params: Promise<SeasonParams>;
};

type SeasonView = {
  readonly species: Species;
  readonly hasHarvestPage: boolean;
  readonly seasons: readonly Season[];
  readonly today: string;
  readonly lastVerified: string;
  readonly sourceUrl: string;
};

export function generateStaticParams(): SeasonParams[] {
  const slugs: Set<string> = new Set<string>(
    getSeasons().map((season: Season): string => season.speciesSlug),
  );
  return [...slugs].sort().map((species: string): SeasonParams => ({ species }));
}

function buildSeasonView(slug: string): SeasonView | null {
  const species: Species | undefined = getSpecies().find(
    (entry: Species): boolean => entry.slug === slug,
  );
  const seasons: readonly Season[] = getSeasons()
    .filter((season: Season): boolean => season.speciesSlug === slug)
    .slice()
    .sort((a: Season, b: Season): number => a.startDate.localeCompare(b.startDate));
  if (species === undefined || seasons.length === 0) {
    return null;
  }
  const verified: string[] = seasons
    .map((season: Season): string => season.lastVerified)
    .sort();
  return {
    species,
    hasHarvestPage: getHarvestSnapshots().some(
      (row: HarvestSnapshot): boolean => row.speciesSlug === slug,
    ),
    seasons,
    today: getMeta().generatedAt.slice(0, 10),
    lastVerified: verified[verified.length - 1] as string,
    sourceUrl: (seasons[0] as Season).sourceUrl,
  };
}

function statusLabel(status: SeasonStatus): string {
  if (status.state === "open") {
    return status.daysRemaining === null
      ? "Open"
      : `Open, ${status.daysRemaining} days left`;
  }
  if (status.state === "upcoming") {
    return `Opens in ${status.daysUntilOpen ?? 0} days`;
  }
  return "Closed";
}

function summaryText(view: SeasonView): string {
  const next: Season | null = nextOpeningSeason(view.seasons, view.today);
  const open: Season[] = view.seasons.filter(
    (season: Season): boolean => seasonStatus(season, view.today).state === "open",
  );
  const openText: string =
    open.length === 0
      ? `No ${view.species.name.toLowerCase()} season is open in Michigan as of ${formatLongDate(view.today)}.`
      : `${open.length === 1 ? "One" : String(open.length)} Michigan ${view.species.name.toLowerCase()} ${open.length === 1 ? "season is" : "seasons are"} open as of ${formatLongDate(view.today)}: ${open.map((season: Season): string => season.name).join(", ")}.`;
  const nextText: string =
    next === null
      ? ""
      : ` The next to open is ${next.name} on ${formatLongDate(next.startDate)}.`;
  return `${openText}${nextText} Dates are summarised from the Michigan DNR digest and were last verified ${formatLongDate(view.lastVerified)}.`;
}

export function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  return params.then((resolved: SeasonParams): Metadata => {
    const view: SeasonView | null = buildSeasonView(resolved.species);
    if (view === null) {
      return buildMetadata({
        title: "Season not found",
        description: "This season page does not exist.",
        path: `/seasons/${resolved.species}/`,
        indexable: false,
      });
    }
    return buildMetadata({
      title: `Michigan ${view.species.name} Season Dates`,
      description: `All ${view.seasons.length} Michigan ${view.species.name.toLowerCase()} seasons with opening and closing dates, zones and notes, verified against the DNR digest.`,
      path: `/seasons/${view.species.slug}/`,
      indexable: true,
      dateModified: view.lastVerified,
    });
  });
}

const COLUMNS: readonly TableColumn[] = [
  { key: "season", label: "Season" },
  { key: "zone", label: "Applies to" },
  { key: "opens", label: "Opens" },
  { key: "closes", label: "Closes" },
  { key: "status", label: "Status" },
];

export default function SeasonSpeciesPage({ params }: SeasonPageProps): ReactElement {
  const resolved: SeasonParams = use(params);
  const view: SeasonView | null = buildSeasonView(resolved.species);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Seasons", path: "/seasons/" },
    { name: view.species.name, path: `/seasons/${view.species.slug}/` },
  ];

  const rows: readonly TableRowData[] = view.seasons.map(
    (season: Season): TableRowData => ({
      season: season.name,
      zone: season.zone,
      opens: formatLongDate(season.startDate),
      closes: formatLongDate(season.endDate),
      status: statusLabel(seasonStatus(season, view.today)),
    }),
  );

  const firearm: Season | undefined = view.seasons.find(
    (season: Season): boolean => season.name === "Regular firearm",
  );
  const archery: Season | undefined = view.seasons.find((season: Season): boolean =>
    season.name.startsWith("Archery"),
  );

  const faqs: FaqItem[] = [];
  if (firearm !== undefined) {
    faqs.push({
      question: "When does Michigan firearm deer season start?",
      answer: `Michigan's regular firearm deer season runs ${formatLongDate(firearm.startDate)} through ${formatLongDate(firearm.endDate)}, statewide.`,
    });
  }
  if (archery !== undefined) {
    faqs.push({
      question: "When does Michigan archery deer season open?",
      answer: `The early archery segment opens ${formatLongDate(archery.startDate)} and runs through ${formatLongDate(archery.endDate)}, statewide.`,
    });
  }
  faqs.push({
    question: "Do season dates differ between the Upper and Lower Peninsula?",
    answer: `Some do. Of the ${view.seasons.length} ${view.species.name.toLowerCase()} seasons listed here, ${view.seasons.filter((season: Season): boolean => season.zone.toLowerCase() !== "statewide").length} apply to only one peninsula. Each county page shows the seasons that apply there.`,
  });

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <h1 className="text-4xl">
        Michigan {view.species.name.toLowerCase()} season dates
      </h1>
      <div className="mt-6">
        <AnswerSummary text={summaryText(view)} />
      </div>

      <div className="mt-8">
        <DataTable
          caption={`Michigan ${view.species.name.toLowerCase()} season dates by zone. Status calculated ${formatLongDate(view.today)}.`}
          columns={COLUMNS}
          rows={rows}
        />
      </div>

      <Section
        title="Notes by season"
        description="Restrictions the DNR attaches to specific seasons."
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {view.seasons
            .filter((season: Season): boolean => season.notes !== null)
            .map((season: Season): ReactElement => (
              <li
                key={`${season.name}-${season.zone}`}
                className="bg-card text-card-foreground border-border shadow-card rounded-xl border px-5 py-4"
              >
                <p className="font-display text-lg text-pine-800">{season.name}</p>
                <p className="mt-2 text-bark-600">{season.notes}</p>
              </li>
            ))}
        </ul>
      </Section>

      <Section
        title="Verify before you hunt"
        description="This page is a summary, not the regulation."
      >
        <div className="prose-block">
          <p>
            These dates were transcribed from the Michigan DNR digest and last verified{" "}
            {formatLongDate(view.lastVerified)}. Zones, hours, equipment rules and
            antlerless permits change more often than opening dates do, and a summary
            cannot capture them all.
          </p>
          <p>
            <a href={view.sourceUrl} rel="noopener">
              Read the official Michigan DNR {view.species.name.toLowerCase()} regulations
            </a>{" "}
            before you hunt, or start from the{" "}
            <a href={SITE.dnrDigestUrl} rel="noopener">
              DNR regulations index
            </a>
            .
          </p>
          <p>
            Looking for harvest numbers instead? See the{" "}
            <Link
              href={view.hasHarvestPage ? `/hunting/${view.species.slug}/` : "/hunting/"}
              prefetch={false}
            >
              {view.hasHarvestPage
                ? `statewide ${view.species.name.toLowerCase()} harvest by county`
                : "Michigan hunting, harvest and public land"}
            </Link>
            .
          </p>
        </div>
      </Section>

      <Section
        title="Common questions"
        description="Answers drawn from the dates on this page."
      >
        <FaqBlock items={faqs} />
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.lastVerified} />
        <SourceNote
          label={`Michigan DNR ${view.species.name.toLowerCase()} regulations`}
          href={view.sourceUrl}
          retrieved={view.lastVerified}
        />
      </div>

      <JsonLd schemas={[breadcrumbSchema(crumbs), faqSchema(faqs)]} />
    </div>
  );
}
