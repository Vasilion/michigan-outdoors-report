import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Search Michigan Outdoors Report",
  description:
    "Search counties, lakes, public land and species pages across Michigan Outdoors Report.",
  path: "/search/",
  indexable: false,
});

export default function SearchPage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Search", path: "/search/" },
        ]}
      />
      <h1 className="text-4xl">Search</h1>
      <div className="prose-block mt-6">
        <p>
          Site search is powered by a static index built at deploy time. It covers county
          hubs, lakes, public land units, species hubs and season pages.
        </p>
        <p>
          The search index ships with the first data release. Until then, start from the
          county list on the home page.
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Search", path: "/search/" },
          ]),
        ]}
      />
    </>
  );
}
