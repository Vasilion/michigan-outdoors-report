import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Use",
  description:
    "Terms covering use of Michigan Outdoors Report data, regulation summaries and directory listings.",
  path: "/terms/",
  indexable: true,
});

export default function TermsPage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms/" },
        ]}
      />
      <h1 className="text-4xl">Terms of use</h1>
      <div className="prose-block mt-6">
        <h2>No affiliation with the Michigan DNR</h2>
        <p>
          This site is published independently. It is not affiliated with, endorsed by, or
          connected to the Michigan Department of Natural Resources.
        </p>
        <h2>Regulations are summaries</h2>
        <p>
          Season dates, zones and rule notes on this site are summaries of public
          information and may be out of date or incomplete. The official DNR digest is the
          only authority. Verify before you hunt or fish.
        </p>
        <h2>Data accuracy</h2>
        <p>
          Figures are reproduced from public sources with a retrieval date and are
          provided as-is, without warranty. Reported harvest is not a population estimate
          and in-season totals change.
        </p>
        <h2>Reuse</h2>
        <p>
          Datasets published on the data page may be reused with attribution to Michigan
          Outdoors Report and to the original source. Bulk scraping of site pages is not
          permitted; use the downloads instead.
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Terms", path: "/terms/" },
          ]),
        ]}
      />
    </>
  );
}
