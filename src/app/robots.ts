import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

type RouteDynamic = "force-static";

export const dynamic: RouteDynamic = "force-static";

const AI_CRAWLERS: readonly string[] = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
];

const DISALLOWED_PATHS: readonly string[] = ["/search/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOWED_PATHS],
      },
      ...AI_CRAWLERS.map((agent: string) => ({
        userAgent: agent,
        allow: "/",
        disallow: [...DISALLOWED_PATHS],
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
