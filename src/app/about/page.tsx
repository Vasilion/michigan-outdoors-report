import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  title: "About Michigan Outdoors Report",
  description:
    "Who publishes Michigan Outdoors Report, where the hunting and fishing data comes from, and how the site stays independent of the Michigan DNR.",
  path: "/about/",
  indexable: true,
});

export default function AboutPage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about/" },
        ]}
      />
      <h1 className="text-4xl">About Michigan Outdoors Report</h1>
      <div className="prose-block mt-6">
        <p>
          Michigan Outdoors Report turns public Michigan DNR data into pages a hunter or
          angler can actually use: what was harvested in a county, what was stocked in a
          lake, where the public land and boat launches are, and when the season opens.
        </p>
        <p>
          The site is published by {SITE.owner}. It is independent, it is not affiliated
          with the Michigan Department of Natural Resources, and it never presents a
          regulation summary as a substitute for the official digest.
        </p>
        <h2>What makes it different</h2>
        <ul>
          <li>
            Every number on the site traces back to a named source with a retrieval date.
          </li>
          <li>
            Pages are only published when there is real data behind them. Thin pages are
            held back rather than filled with generated prose.
          </li>
          <li>
            The underlying datasets are downloadable on the{" "}
            <Link href="/data/" prefetch={false}>
              data page
            </Link>
            , and the collection process is written up in the{" "}
            <Link href="/methodology/" prefetch={false}>
              methodology
            </Link>
            .
          </li>
        </ul>
        <h2>Corrections</h2>
        <p>
          If a figure looks wrong, it probably is worth a second look. Send the page URL
          and what you believe the correct value to be through the{" "}
          <Link href="/contact/" prefetch={false}>
            contact page
          </Link>
          .
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about/" },
          ]),
        ]}
      />
    </>
  );
}
