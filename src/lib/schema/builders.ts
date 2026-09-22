import type {
  BreadcrumbList,
  Dataset,
  FAQPage,
  ItemList,
  LocalBusiness,
  Organization,
  Place,
  WebSite,
  WithContext,
} from "schema-dts";
import { SITE, absoluteUrl } from "../site";

export type Crumb = {
  readonly name: string;
  readonly path: string;
};

export type FaqEntry = {
  readonly question: string;
  readonly answer: string;
};

export type GeoPoint = {
  readonly lat: number;
  readonly lng: number;
};

export function organizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: `${SITE.url}/`,
    description: SITE.description,
    email: SITE.contactEmail,
    areaServed: { "@type": "State", name: "Michigan" },
  };
}

export function websiteSchema(): WithContext<WebSite> {
  const searchAction: WebSite["potentialAction"] = {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/search/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  } as unknown as WebSite["potentialAction"];
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: `${SITE.url}/`,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en-US",
    potentialAction: searchAction,
  };
}

export function breadcrumbSchema(crumbs: readonly Crumb[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb: Crumb, index: number) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqSchema(entries: readonly FaqEntry[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry: FaqEntry) => ({
      "@type": "Question" as const,
      name: entry.question,
      acceptedAnswer: { "@type": "Answer" as const, text: entry.answer },
    })),
  };
}

export type DatasetInput = {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly dateModified: string;
  readonly sourceUrl: string;
  readonly distributions?: readonly { readonly url: string; readonly format: string }[];
};

export function datasetSchema(input: DatasetInput): WithContext<Dataset> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    dateModified: input.dateModified,
    isBasedOn: input.sourceUrl,
    creator: { "@id": `${SITE.url}/#organization` },
    license: "https://creativecommons.org/licenses/by/4.0/",
    spatialCoverage: { "@type": "Place", name: "Michigan, United States" },
    ...(input.distributions === undefined
      ? {}
      : {
          distribution: input.distributions.map(
            (entry: { readonly url: string; readonly format: string }) => ({
              "@type": "DataDownload" as const,
              contentUrl: absoluteUrl(entry.url),
              encodingFormat: entry.format,
            }),
          ),
        }),
  };
}

export type PlaceInput = {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly geo: GeoPoint | null;
  readonly type:
    "AdministrativeArea" | "LakeBodyOfWater" | "RiverBodyOfWater" | "Park" | "Place";
  readonly sameAs?: readonly string[];
};

export function placeSchema(input: PlaceInput): WithContext<Place> {
  return {
    "@context": "https://schema.org",
    "@type": input.type,
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    ...(input.geo === null
      ? {}
      : {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: input.geo.lat,
            longitude: input.geo.lng,
          },
        }),
    ...(input.sameAs === undefined ? {} : { sameAs: [...input.sameAs] }),
    containedInPlace: { "@type": "State", name: "Michigan" },
  } as WithContext<Place>;
}

export type ListingInput = {
  readonly name: string;
  readonly path: string;
  readonly category: string;
  readonly phone: string | null;
  readonly website: string | null;
  readonly address: string | null;
  readonly geo: GeoPoint | null;
};

export function localBusinessSchema(input: ListingInput): WithContext<LocalBusiness> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: absoluteUrl(input.path),
    additionalType: input.category,
    ...(input.phone === null ? {} : { telephone: input.phone }),
    ...(input.website === null ? {} : { sameAs: [input.website] }),
    ...(input.address === null
      ? {}
      : {
          address: {
            "@type": "PostalAddress" as const,
            streetAddress: input.address,
            addressRegion: "MI",
            addressCountry: "US",
          },
        }),
    ...(input.geo === null
      ? {}
      : {
          geo: {
            "@type": "GeoCoordinates" as const,
            latitude: input.geo.lat,
            longitude: input.geo.lng,
          },
        }),
  };
}

export type ItemListEntry = {
  readonly name: string;
  readonly path: string;
};

export function itemListSchema(
  name: string,
  entries: readonly ItemListEntry[],
): WithContext<ItemList> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: entries.length,
    itemListElement: entries.map((entry: ItemListEntry, index: number) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: entry.name,
      url: absoluteUrl(entry.path),
    })),
  };
}
