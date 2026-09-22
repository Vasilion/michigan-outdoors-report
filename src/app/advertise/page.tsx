import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Advertise on Michigan Outdoors Report",
  description:
    "Featured directory listings and sponsorship for Michigan deer processors, taxidermists, guides, charters and bait shops.",
  path: "/advertise/",
  indexable: true,
});

export default function AdvertisePage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Advertise", path: "/advertise/" },
        ]}
      />
      <h1 className="text-4xl">Advertise</h1>
      <div className="prose-block mt-6">
        <p>
          Michigan Outdoors Report reaches hunters and anglers at the moment they are
          researching a specific county, lake or season. Two things are for sale, and
          neither one changes the data.
        </p>
        <h2>Featured directory listing</h2>
        <p>
          A featured listing sits at the top of its category and county pages with a clear
          {"“"}Featured{"”"} label. Every listing, featured or not, carries the same
          contact details and map.
        </p>
        <h2>County sponsorship</h2>
        <p>
          A single sponsor slot per county hub, clearly labelled, with fixed dimensions so
          it never shifts the page.
        </p>
        <h2>What is not for sale</h2>
        <ul>
          <li>
            Harvest, stocking and public land figures. Those come from the DNR and are
            never edited.
          </li>
          <li>Ranking within a data table.</li>
          <li>Editorial recommendations in gear roundups.</li>
        </ul>
        <p>
          Rates and availability: email{" "}
          <a href="mailto:contact@michiganoutdoorsreport.com">
            contact@michiganoutdoorsreport.com
          </a>
          .
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Advertise", path: "/advertise/" },
          ]),
        ]}
      />
    </>
  );
}
