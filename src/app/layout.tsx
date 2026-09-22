import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { Analytics } from "@/components/analytics";
import { organizationSchema, websiteSchema } from "@/lib/schema/builders";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.name}: Michigan Hunting and Fishing Data`,
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.owner }],
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export type RootLayoutProps = {
  readonly children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): ReactElement {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <JsonLd schemas={[organizationSchema(), websiteSchema()]} />
        <Analytics />
      </body>
    </html>
  );
}
