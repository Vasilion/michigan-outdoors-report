import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, LastUpdated } from "@/components/layout";
import { DataTable } from "@/components/data";
import type { TableColumn, TableRow } from "@/components/data";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { getMeta } from "@/lib/data/snapshot";

export const metadata: Metadata = buildMetadata({
  title: "Methodology: How This Michigan Data Is Collected",
  description:
    "The sources, update cadence and limitations behind every harvest total, stocking record and public land figure on Michigan Outdoors Report.",
  path: "/methodology/",
  indexable: true,
});

const SOURCE_COLUMNS: readonly TableColumn[] = [
  { key: "source", label: "Source" },
  { key: "feeds", label: "What it feeds" },
  { key: "cadence", label: "Update cadence" },
];

const SOURCE_ROWS: readonly TableRow[] = [
  {
    source: "Michigan DNR Open Data (ArcGIS)",
    feeds: "Public land boundaries, boating and fishing access sites",
    cadence: "Monthly",
  },
  {
    source: "Michigan GIS Open Data",
    feeds: "County boundaries and geometry",
    cadence: "Quarterly",
  },
  {
    source: "DNR Fish Stocking Database",
    feeds: "Stocking history on lake, river and county pages",
    cadence: "Weekly",
  },
  {
    source: "DNR reported harvest",
    feeds: "County and statewide harvest totals by species and season",
    cadence: "Daily in season, weekly otherwise",
  },
  {
    source: "DNR inland lake maps index",
    feeds: "Lake list and links to official DNR lake map PDFs",
    cadence: "Quarterly",
  },
  {
    source: "Curated season dates",
    feeds: "Season pages and season blocks, each with a verification date",
    cadence: "Reviewed against the official digest each license year",
  },
];

export default function MethodologyPage(): ReactElement {
  const updatedAt: string = getMeta().generatedAt.slice(0, 10);
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Methodology", path: "/methodology/" },
        ]}
      />
      <h1 className="text-4xl">Methodology</h1>
      <div className="prose-block mt-6">
        <p>
          Every figure on this site comes from a published Michigan source. Nothing is
          modelled, estimated or filled in. Where a value is missing, the section is left
          out rather than guessed.
        </p>
        <h2>Sources and cadence</h2>
      </div>
      <div className="mt-4">
        <DataTable
          caption="Data sources behind Michigan Outdoors Report and how often each is refreshed."
          columns={SOURCE_COLUMNS}
          rows={SOURCE_ROWS}
        />
      </div>
      <div className="prose-block mt-8">
        <h2>How a page gets published</h2>
        <p>
          Importers write into a Postgres database, a deterministic snapshot of that
          database is committed to the site repository, and the site is rebuilt from that
          snapshot. Visitors never hit a database, so a source outage can never take the
          site down or change what a page says.
        </p>
        <h2>Why some pages do not exist</h2>
        <p>
          A page is only generated when it clears a data threshold: a lake needs stocking
          records, access sites or an official DNR map; a county and species page needs at
          least two seasons of harvest data. Pages that fail those checks are not
          published at all.
        </p>
        <h2>Known limitations</h2>
        <ul>
          <li>
            Reported harvest is what hunters reported, not a population estimate.
            In-season figures keep moving until the DNR closes the season out.
          </li>
          <li>
            Stocking records describe what was released, not what survived or what you
            will catch.
          </li>
          <li>
            Season dates and regulations are summaries. The official DNR digest is the
            only authority, and every regulation reference here links to it.
          </li>
        </ul>
        <p>
          The raw datasets are published on the{" "}
          <Link href="/data/" prefetch={false}>
            data page
          </Link>
          .
        </p>
      </div>
      <div className="mt-8">
        <LastUpdated isoDate={updatedAt} />
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Methodology", path: "/methodology/" },
          ]),
        ]}
      />
    </>
  );
}
