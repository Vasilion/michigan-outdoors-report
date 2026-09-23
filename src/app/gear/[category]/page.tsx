import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { ShoppingBag } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  PageIntro,
  Section,
  VerifyNotice,
} from "@/components/layout";
import { GearDisclosure, GearGrid } from "@/components/gear";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { findGearCategory, gearCategoryIndexed, getGearCategories } from "@/lib/gear";
import { productsInCategory } from "@/lib/gear";
import type { GearCategory, ResolvedProduct } from "@/lib/gear";
import { getSpecies } from "@/lib/data/snapshot";
import { speciesHubIndexed, speciesHubPath } from "@/lib/views/species-hub";
import type { Species } from "@/lib/data/schemas";

export type GearCategoryParams = {
  readonly category: string;
};

export type GearCategoryProps = {
  readonly params: Promise<GearCategoryParams>;
};

export function generateStaticParams(): GearCategoryParams[] {
  return getGearCategories().map((category: GearCategory): GearCategoryParams => ({
    category: category.slug,
  }));
}

export function generateMetadata({ params }: GearCategoryProps): Promise<Metadata> {
  return params.then((resolved: GearCategoryParams): Metadata => {
    const category: GearCategory | null = findGearCategory(resolved.category);
    if (category === null) {
      return buildMetadata({
        title: "Gear",
        description: "Michigan gear guides.",
        path: "/gear/",
        indexable: false,
      });
    }
    return buildMetadata({
      title: category.title,
      description: category.intro.slice(0, 150),
      path: `/gear/${category.slug}/`,
      indexable: gearCategoryIndexed(category.slug),
      ogImagePath: "/og/default.png",
    });
  });
}

export default function GearCategoryPage({
  params,
}: GearCategoryProps): Promise<ReactElement> {
  return params.then((resolved: GearCategoryParams): ReactElement => {
    const category: GearCategory | null = findGearCategory(resolved.category);
    if (category === null) {
      notFound();
    }
    const entries: readonly ResolvedProduct[] = productsInCategory(category.slug);
    const linked: readonly ResolvedProduct[] = entries.filter(
      (entry: ResolvedProduct): boolean => entry.link !== null,
    );
    const species: readonly Species[] = getSpecies().filter(
      (entry: Species): boolean =>
        category.speciesSlugs.includes(entry.slug) && speciesHubIndexed(entry),
    );
    const crumbs: readonly Crumb[] = [
      { name: "Home", path: "/" },
      { name: "Gear", path: "/gear/" },
      { name: category.name, path: `/gear/${category.slug}/` },
    ];

    return (
      <div className="wrap pb-16">
        <Breadcrumbs items={[...crumbs]} />
        <p className="eyebrow">Gear guide</p>
        <h1 className="mt-2 text-4xl md:text-5xl">{category.name}</h1>
        <div className="mt-6">
          <AnswerSummary text={category.intro} />
        </div>

        {linked.length === 0 ? null : (
          <div className="mt-6">
            <GearDisclosure />
          </div>
        )}

        <Section
          title="The list"
          icon={ShoppingBag}
          description="Each entry explains what about Michigan makes it the right pick, and notes the regulation that touches it where one does."
        >
          <GearGrid entries={linked.length === 0 ? entries : linked} />
        </Section>

        {species.length === 0 ? null : (
          <Section
            title="Season dates and county data"
            description="The regulations, season dates and county-level records behind these picks."
          >
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {species.map((entry: Species): ReactElement => (
                <li key={entry.slug}>
                  <Link href={speciesHubPath(entry)} prefetch={false}>
                    {entry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-10">
          <PageIntro>
            <VerifyNotice href="https://www.michigan.gov/dnr">
              Regulations change every year. Confirm anything gear-related against the
              current Michigan Hunting Digest or Fishing Guide before you rely on it.
            </VerifyNotice>
          </PageIntro>
        </div>

        <JsonLd
          schemas={[
            breadcrumbSchema(crumbs),
            itemListSchema(
              category.title,
              linked.map((entry: ResolvedProduct) => ({
                name: entry.product.name,
                path: `/gear/${category.slug}/`,
              })),
            ),
          ]}
        />
      </div>
    );
  });
}
