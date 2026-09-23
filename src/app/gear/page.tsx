import Link from "next/link";
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
import { GearDisclosure } from "@/components/gear";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { buildMetadata } from "@/lib/seo";
import { formatCount } from "@/lib/format";
import { getGearCategories, productsInCategory } from "@/lib/gear";
import type { GearCategory } from "@/lib/gear";

export const metadata: Metadata = buildMetadata({
  title: "Michigan Hunting and Fishing Gear Guides",
  description:
    "Gear lists organized around how Michigan seasons actually run, with the regulation that applies to each item noted alongside it.",
  path: "/gear/",
  indexable: true,
  ogImagePath: "/og/default.png",
});

export default function GearIndexPage(): ReactElement {
  const categories: readonly GearCategory[] = getGearCategories();
  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    { name: "Gear", path: "/gear/" },
  ];
  const summary: string = `These ${formatCount(categories.length)} gear guides are organized around Michigan season structure rather than around brands: what the November 15 firearm opener actually demands, what run-and-gun spring turkey hunting in hardwoods needs, and what changes between Upper and Lower Peninsula ice. Every item notes the Michigan regulation that applies to it where one does.`;

  return (
    <div className="wrap pb-16">
      <Breadcrumbs items={[...crumbs]} />
      <p className="eyebrow">Gear guides</p>
      <h1 className="mt-2 text-4xl md:text-5xl">Michigan gear guides</h1>
      <div className="mt-6">
        <AnswerSummary text={summary} />
      </div>

      <div className="mt-6">
        <GearDisclosure />
      </div>

      <Section
        title="Browse by season"
        icon={ShoppingBag}
        description="Each guide covers one Michigan season and explains why the pick suits how that season runs here."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category: GearCategory): ReactElement => (
            <Card key={category.slug}>
              <CardContent className="grid gap-2">
                <h2 className="text-lg font-semibold">
                  <Link href={`/gear/${category.slug}/`} prefetch={false}>
                    {category.name}
                  </Link>
                </h2>
                <p className="text-sm">{category.intro}</p>
                <p className="text-muted-foreground text-sm">
                  {formatCount(productsInCategory(category.slug).length)} items
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <div className="mt-10">
        <PageIntro>
          <VerifyNotice href="https://www.michigan.gov/dnr/things-to-do/hunting">
            Regulations change every year. Confirm anything gear-related against the
            current Michigan Hunting Digest or Fishing Guide before you rely on it.
          </VerifyNotice>
        </PageIntro>
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          itemListSchema(
            "Michigan gear guides",
            categories.map((category: GearCategory) => ({
              name: category.name,
              path: `/gear/${category.slug}/`,
            })),
          ),
        ]}
      />
    </div>
  );
}
