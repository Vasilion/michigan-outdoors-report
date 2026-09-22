import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { getCounties } from "@/lib/data/snapshot";
import type { County } from "@/lib/data/schemas";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound(): ReactElement {
  const counties: readonly County[] = getCounties().slice(0, 12);
  return (
    <>
      <h1 className="mt-10 text-4xl">That page is not here</h1>
      <div className="prose-block mt-4">
        <p>
          The page may have moved, or it may never have been published: pages without
          enough underlying data are held back on purpose.
        </p>
        <ul>
          <li>
            <Link href="/" prefetch={false}>
              Start from the county list
            </Link>
          </li>
          <li>
            <Link href="/seasons/" prefetch={false}>
              Season dates
            </Link>
          </li>
          <li>
            <Link href="/data/" prefetch={false}>
              Data downloads
            </Link>
          </li>
          <li>
            <Link href="/contact/" prefetch={false}>
              Report a broken link
            </Link>
          </li>
        </ul>
      </div>
      {counties.length === 0 ? null : (
        <ul className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {counties.map((county: County): ReactElement => (
            <li key={county.slug}>
              <Link href={`/county/${county.slug}/`} prefetch={false}>
                {county.name} County
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
