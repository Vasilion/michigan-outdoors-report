import Link from "next/link";
import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { JsonLd } from "@/components/JsonLd";
import {
  AnswerSummary,
  Breadcrumbs,
  LastUpdated,
  QuickFacts,
  Section,
  SourceNote,
} from "@/components/layout";
import type { QuickFact } from "@/components/layout";
import { FaqBlock } from "@/components/data";
import type { FaqItem } from "@/components/data";
import { breadcrumbSchema, faqSchema, placeSchema } from "@/lib/schema/builders";
import type { Crumb } from "@/lib/schema/builders";
import { TITLE_HARD_MAX, buildMetadata } from "@/lib/seo";
import { formatCount, joinList } from "@/lib/format";
import { publicLandSummary } from "@/lib/summary";
import { findCounty, getMeta, getPublicLands } from "@/lib/data/snapshot";
import type { County, PublicLand } from "@/lib/data/schemas";
import { publicLandGate } from "@/lib/quality-gate";

const MIHUNT_URL: string = "https://www.mcgi.state.mi.us/mihunt/";

export type UnitParams = {
  readonly unit: string;
};

export type UnitPageProps = {
  readonly params: Promise<UnitParams>;
};

type UnitView = {
  readonly land: PublicLand;
  readonly counties: readonly County[];
  readonly dataDate: string;
};

export function generateStaticParams(): UnitParams[] {
  return getPublicLands()
    .filter(
      (land: PublicLand): boolean =>
        publicLandGate({ hasGeometry: land.centroid !== null, acres: land.acres })
          .indexed,
    )
    .map((land: PublicLand): UnitParams => ({ unit: land.slug }));
}

function buildUnitView(slug: string): UnitView | null {
  const land: PublicLand | undefined = getPublicLands().find(
    (entry: PublicLand): boolean => entry.slug === slug,
  );
  if (land === undefined) {
    return null;
  }
  const counties: County[] = [];
  for (const countySlug of land.countySlugs) {
    const county: County | null = findCounty(countySlug);
    if (county !== null) {
      counties.push(county);
    }
  }
  return { land, counties, dataDate: getMeta().generatedAt.slice(0, 10) };
}

function summaryText(view: UnitView): string {
  return publicLandSummary({
    name: view.land.name,
    typeLabel: view.land.typeLabel,
    acres: view.land.acres,
    countyNames: view.counties.map((county: County): string => county.name),
    managingAgency: view.land.managingAgency,
    asOfDate: view.land.updatedAt,
  });
}

export function generateMetadata({ params }: UnitPageProps): Promise<Metadata> {
  return params.then((resolved: UnitParams): Metadata => {
    const view: UnitView | null = buildUnitView(resolved.unit);
    if (view === null) {
      return buildMetadata({
        title: "Public land not found",
        description: "This public land page does not exist.",
        path: `/public-land/${resolved.unit}/`,
        indexable: false,
      });
    }
    const where: string =
      view.counties.length === 0
        ? "Michigan"
        : `${(view.counties[0] as County).name} County, Michigan`;
    const acres: string =
      view.land.acres === null ? "" : `${formatCount(view.land.acres)} acres of `;
    const suffixed: string = `${view.land.name}: Hunting Land & Acreage`;
    return buildMetadata({
      title: suffixed.length <= TITLE_HARD_MAX ? suffixed : view.land.name,
      description: `${acres}${view.land.typeLabel} in ${where}, managed by ${view.land.managingAgency}, with county context and DNR sources.`,
      path: `/public-land/${view.land.slug}/`,
      indexable: true,
      dateModified: view.land.updatedAt,
    });
  });
}

export default function PublicLandPage({ params }: UnitPageProps): ReactElement {
  const resolved: UnitParams = use(params);
  const view: UnitView | null = buildUnitView(resolved.unit);
  if (view === null) {
    notFound();
  }

  const crumbs: readonly Crumb[] = [
    { name: "Home", path: "/" },
    ...(view.counties.length === 0
      ? []
      : [
          {
            name: `${(view.counties[0] as County).name} County`,
            path: `/county/${(view.counties[0] as County).slug}/`,
          },
        ]),
    { name: view.land.name, path: `/public-land/${view.land.slug}/` },
  ];

  const facts: QuickFact[] = [
    { label: "Type", value: view.land.typeLabel },
    {
      label: "Acres",
      value: view.land.acres === null ? "Not published" : formatCount(view.land.acres),
    },
    {
      label: "Counties",
      value:
        view.counties.length === 0
          ? "Not mapped"
          : joinList(view.counties.map((county: County): string => county.name)),
    },
    {
      label: "Hunting",
      value: view.land.huntingStatus ?? "See DNR listing",
    },
  ];

  const faqs: FaqItem[] = [
    {
      question: `How big is ${view.land.name}?`,
      answer:
        view.land.acres === null
          ? `The Michigan DNR has not published an acreage for ${view.land.name}.`
          : `${view.land.name} covers about ${formatCount(view.land.acres)} acres, according to Michigan DNR boundary data.`,
    },
    {
      question: `Can you hunt at ${view.land.name}?`,
      answer:
        view.land.huntingStatus === null
          ? `${view.land.name} is managed by ${view.land.managingAgency}. Hunting rules vary by unit and by season, so check the DNR listing and the current digest before you go.`
          : `The Michigan DNR lists hunting and trapping at ${view.land.name} as "${view.land.huntingStatus}". Rules vary by season, so check the current digest before you go.`,
    },
  ];
  if (view.counties.length > 0) {
    faqs.push({
      question: `Which county is ${view.land.name} in?`,
      answer: `${view.land.name} lies in ${joinList(view.counties.map((county: County): string => `${county.name} County`))}.`,
    });
  }

  return (
    <>
      <Breadcrumbs items={[...crumbs]} />
      <h1 className="text-4xl">{view.land.name}</h1>
      <div className="mt-6">
        <AnswerSummary text={summaryText(view)} />
      </div>
      <div className="mt-8">
        <QuickFacts facts={facts} />
      </div>

      {view.counties.length === 0 ? null : (
        <Section
          title="Counties"
          description="Harvest data, season dates and other public land nearby."
        >
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {view.counties.map((county: County): ReactElement => (
              <li key={county.slug}>
                <Link href={`/county/${county.slug}/`} prefetch={false}>
                  {county.name} County
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Before you go" description="Official sources for rules and maps.">
        <div className="prose-block">
          <ul>
            <li>
              <a href={MIHUNT_URL} rel="noopener">
                Mi-HUNT
              </a>{" "}
              maps every parcel of Michigan public hunting land, including this one.
            </li>
            <li>
              Hunting and trapping rules vary by unit, season and species. The Michigan
              DNR digest is the only authority.
            </li>
            <li>
              Acreage and boundaries here come from DNR open data and can lag recent land
              transactions.
            </li>
          </ul>
        </div>
      </Section>

      <Section
        title="Common questions"
        description="Answers drawn from the data on this page."
      >
        <FaqBlock items={faqs} />
      </Section>

      <div className="mt-10 grid gap-2">
        <LastUpdated isoDate={view.land.updatedAt} />
        <SourceNote
          label="Michigan DNR open data land boundaries"
          href={view.land.sourceUrl}
          retrieved={view.land.updatedAt}
        />
      </div>

      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          placeSchema({
            name: view.land.name,
            description: summaryText(view),
            path: `/public-land/${view.land.slug}/`,
            geo: view.land.centroid,
            type: view.land.type === "state_park" ? "Park" : "Place",
          }),
          faqSchema(faqs),
        ]}
      />
    </>
  );
}
