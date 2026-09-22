import { use } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import {
  CountyHunting,
  huntingMetadata,
  huntingParams,
} from "@/components/county/hunting";
import {
  CountyFishing,
  fishingMetadata,
  fishingParams,
} from "@/components/county/fishing";
import { buildMetadata } from "@/lib/seo";

const HUNTING_SUFFIX: string = "-hunting";
const FISHING_SUFFIX: string = "-fishing";

export type TopicParams = {
  readonly county: string;
  readonly topic: string;
};

export type TopicPageProps = {
  readonly params: Promise<TopicParams>;
};

export type ParsedTopic = {
  readonly kind: "hunting" | "fishing";
  readonly speciesSlug: string;
};

export function parseTopic(segment: string): ParsedTopic | null {
  if (segment.endsWith(HUNTING_SUFFIX)) {
    return {
      kind: "hunting",
      speciesSlug: segment.slice(0, -HUNTING_SUFFIX.length),
    };
  }
  if (segment.endsWith(FISHING_SUFFIX)) {
    return {
      kind: "fishing",
      speciesSlug: segment.slice(0, -FISHING_SUFFIX.length),
    };
  }
  return null;
}

export function generateStaticParams(): TopicParams[] {
  const params: TopicParams[] = [];
  for (const entry of huntingParams()) {
    params.push({ county: entry.county, topic: `${entry.speciesSlug}${HUNTING_SUFFIX}` });
  }
  for (const entry of fishingParams()) {
    params.push({ county: entry.county, topic: `${entry.speciesSlug}${FISHING_SUFFIX}` });
  }
  return params;
}

export function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  return params.then((resolved: TopicParams): Metadata => {
    const parsed: ParsedTopic | null = parseTopic(resolved.topic);
    if (parsed === null) {
      return buildMetadata({
        title: "Page not found",
        description: "This page does not exist.",
        path: `/county/${resolved.county}/${resolved.topic}/`,
        indexable: false,
      });
    }
    return parsed.kind === "hunting"
      ? huntingMetadata({ county: resolved.county, speciesSlug: parsed.speciesSlug })
      : fishingMetadata({ county: resolved.county, speciesSlug: parsed.speciesSlug });
  });
}

export default function CountyTopicPage({ params }: TopicPageProps): ReactElement {
  const resolved: TopicParams = use(params);
  const parsed: ParsedTopic | null = parseTopic(resolved.topic);
  if (parsed === null) {
    notFound();
  }
  if (parsed.kind === "hunting") {
    return (
      <CountyHunting
        params={{ county: resolved.county, speciesSlug: parsed.speciesSlug }}
      />
    );
  }
  const fishing: ReactElement | null = CountyFishing({
    params: { county: resolved.county, speciesSlug: parsed.speciesSlug },
  });
  if (fishing === null) {
    notFound();
  }
  return fishing;
}
