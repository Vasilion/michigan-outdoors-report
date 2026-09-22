import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact Michigan Outdoors Report",
  description:
    "Report a data correction, claim a directory listing, or ask about advertising on Michigan Outdoors Report.",
  path: "/contact/",
  indexable: true,
});

export default function ContactPage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact/" },
        ]}
      />
      <h1 className="text-4xl">Contact</h1>
      <div className="prose-block mt-6">
        <p>
          Email{" "}
          <a href="mailto:contact@michiganoutdoorsreport.com">
            contact@michiganoutdoorsreport.com
          </a>
          .
        </p>
        <h2>Data corrections</h2>
        <p>
          Include the page URL, the figure you believe is wrong, and the value you think
          is correct. Corrections that trace back to a DNR source are applied on the next
          build and noted in the update date on the page.
        </p>
        <h2>Directory listings</h2>
        <p>
          Businesses can request a new listing, correct an existing one, or ask to be
          removed. Removal requests are honoured without question.
        </p>
        <h2>Press and data use</h2>
        <p>
          The datasets on this site may be reused with attribution. If you are writing
          about Michigan harvest or stocking trends and need a cut of the data that is not
          published yet, ask.
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact/" },
          ]),
        ]}
      />
    </>
  );
}
