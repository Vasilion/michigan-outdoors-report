import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs, LastUpdated } from "@/components/layout";
import { breadcrumbSchema, datasetSchema } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount } from "@/lib/format";
import { DOWNLOADS } from "@/lib/downloads";
import type { DownloadSpec } from "@/lib/downloads";
import { getMeta } from "@/lib/data/snapshot";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting & Fishing Data Downloads",
  description:
    "Download the Michigan harvest, fish stocking, public land and access site datasets behind this site as CSV or JSON, free and attributed.",
  path: "/data/",
  indexable: true,
});

export default function DataPage(): ReactElement {
  const updatedAt: string = getMeta().generatedAt.slice(0, 10);
  return (
    <div className="wrap pb-16">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Data", path: "/data/" },
        ]}
      />
      <h1 className="text-4xl">Data downloads</h1>
      <div className="prose-block mt-6">
        <p>
          Every dataset behind this site is published here as CSV and JSON, rebuilt on each
          deploy. Use it freely with attribution to Michigan Outdoors Report and to the
          original Michigan DNR source listed for each file.
        </p>
        <p>
          How each file is collected, and what it does and does not mean, is written up in
          the{" "}
          <Link href="/methodology/" prefetch={false}>
            methodology
          </Link>
          .
        </p>
      </div>
      <div className="mt-8 grid gap-4">
        {DOWNLOADS.map((spec: DownloadSpec): ReactElement => {
          const rowCount: number = spec.rows().length;
          return (
            <div key={spec.key} className="bg-card text-card-foreground border-border shadow-card rounded-xl border px-5 py-4">
              <h2 className="text-xl">{spec.label}</h2>
              <p className="mt-2 text-bark-600">{spec.description}</p>
              <p className="mt-2 text-sm text-bark-500">
                {formatCount(rowCount)} rows. Source:{" "}
                <a href={spec.sourceUrl} rel="noopener">
                  {spec.sourceUrl}
                </a>
              </p>
              <p className="mt-3 flex gap-4">
                <a href={spec.csvPath}>CSV</a>
                <a href={spec.jsonPath}>JSON</a>
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-8">
        <LastUpdated isoDate={updatedAt} />
      </div>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Data", path: "/data/" },
          ]),
          ...DOWNLOADS.map((spec: DownloadSpec) =>
            datasetSchema({
              name: spec.label,
              description: spec.description,
              path: "/data/",
              dateModified: updatedAt,
              sourceUrl: spec.sourceUrl,
              distributions: [
                { url: spec.csvPath, format: "text/csv" },
                { url: spec.jsonPath, format: "application/json" },
              ],
            }),
          ),
        ]}
      />
    </div>
  );
}
