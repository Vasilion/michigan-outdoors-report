import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { AnswerSummary, Breadcrumbs, LastUpdated } from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRow } from "@/components/data";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatLongDate } from "@/lib/format";
import { getMeta, getSeasons } from "@/lib/data/snapshot";
import type { Season } from "@/lib/data/schemas";
import { seasonStatus } from "@/lib/season";
import type { SeasonStatus } from "@/lib/season";
import { SITE } from "@/lib/site";

const SEASONS: readonly Season[] = getSeasons();

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting & Fishing Season Dates",
  description:
    "Michigan season dates by species and zone, with the date each entry was last verified against the official DNR digest.",
  path: "/seasons/",
  indexable: SEASONS.length > 0,
});

const COLUMNS: readonly TableColumn[] = [
  { key: "season", label: "Season" },
  { key: "zone", label: "Zone" },
  { key: "opens", label: "Opens" },
  { key: "closes", label: "Closes" },
  { key: "status", label: "Status" },
];

function statusLabel(status: SeasonStatus): string {
  if (status.state === "open") {
    return status.daysRemaining === null
      ? "Open"
      : `Open, ${status.daysRemaining} days left`;
  }
  if (status.state === "upcoming") {
    return status.daysUntilOpen === null
      ? "Upcoming"
      : `Opens in ${status.daysUntilOpen} days`;
  }
  return "Closed";
}

export default function SeasonsPage(): ReactElement {
  const today: string = getMeta().generatedAt.slice(0, 10);
  const rows: readonly TableRow[] = SEASONS.map((season: Season): TableRow => ({
    season: season.name,
    zone: season.zone,
    opens: formatLongDate(season.startDate),
    closes: formatLongDate(season.endDate),
    status: statusLabel(seasonStatus(season, today)),
  }));

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Seasons", path: "/seasons/" },
        ]}
      />
      <h1 className="text-4xl">Michigan season dates</h1>
      <div className="mt-6">
        <AnswerSummary
          text={
            SEASONS.length === 0
              ? "Season dates publish with the first curated season release. Until then, use the official Michigan DNR digest for every date and regulation."
              : `Michigan season dates for ${SEASONS.length} seasons, each verified against the official Michigan DNR digest on the date shown. Status is calculated as of ${formatLongDate(today)}.`
          }
        />
      </div>
      <div className="prose-block mt-6">
        <p>
          These dates are a summary. The{" "}
          <a href={SITE.dnrDigestUrl} rel="noopener">
            official Michigan DNR digest
          </a>{" "}
          is the only authority, and it is worth checking before every trip: zones, hours
          and equipment rules change more often than opening dates do.
        </p>
      </div>
      {SEASONS.length === 0 ? null : (
        <div className="mt-6">
          <DataTable
            caption="Michigan hunting and fishing season dates by zone, from curated DNR sources."
            columns={COLUMNS}
            rows={rows}
          />
        </div>
      )}
      <div className="prose-block mt-8">
        <p>
          Looking for county-level harvest numbers instead?{" "}
          <Link href="/" prefetch={false}>
            Start from the county list
          </Link>
          .
        </p>
      </div>
      <div className="mt-8">
        <LastUpdated isoDate={today} />
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Seasons", path: "/seasons/" },
          ]),
        ]}
      />
    </>
  );
}
