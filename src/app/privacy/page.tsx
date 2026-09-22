import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/layout";
import { breadcrumbSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "What Michigan Outdoors Report collects, what it does not collect, and how analytics and affiliate links work.",
  path: "/privacy/",
  indexable: true,
});

export default function PrivacyPage(): ReactElement {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy/" },
        ]}
      />
      <h1 className="text-4xl">Privacy policy</h1>
      <div className="prose-block mt-6">
        <p>
          Michigan Outdoors Report is a static site. It does not require an account, and
          it does not ask visitors for personal information to read any page.
        </p>
        <h2>Analytics</h2>
        <p>
          Aggregate, privacy-friendly analytics are used to see which pages are useful.
          They do not set advertising cookies and do not build a profile of you across
          other sites.
        </p>
        <h2>Affiliate links</h2>
        <p>
          Some outbound product links are affiliate links, labelled with a visible
          disclosure on the page that contains them. The retailer sets its own cookies
          once you follow such a link.
        </p>
        <h2>Email</h2>
        <p>
          Anything you send by email is used only to answer you. Newsletter signups are
          handled by an external provider and you can unsubscribe from any issue.
        </p>
        <h2>Changes</h2>
        <p>
          Material changes to this policy are noted with an updated date on this page.
        </p>
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy", path: "/privacy/" },
          ]),
        ]}
      />
    </>
  );
}
