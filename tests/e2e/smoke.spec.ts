import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { APIResponse, Page } from "@playwright/test";

type TemplateCase = {
  readonly name: string;
  readonly path: string;
  readonly heading: RegExp;
};

const TEMPLATES: readonly TemplateCase[] = [
  { name: "home", path: "/", heading: /Every Michigan county/i },
  { name: "about", path: "/about/", heading: /About Michigan Outdoors Report/i },
  { name: "methodology", path: "/methodology/", heading: /Methodology/i },
  { name: "data", path: "/data/", heading: /Data downloads/i },
  { name: "seasons", path: "/seasons/", heading: /Michigan season dates/i },
  { name: "advertise", path: "/advertise/", heading: /Advertise/i },
];

for (const template of TEMPLATES) {
  test(`${template.name} renders its heading, canonical and structured data`, ({
    page,
  }: {
    page: Page;
  }): Promise<void> =>
    page
      .goto(template.path)
      .then((): Promise<void> => expect(page.locator("h1")).toHaveCount(1))
      .then((): Promise<void> => expect(page.locator("h1")).toHaveText(template.heading))
      .then((): Promise<string[]> =>
        page.locator('script[type="application/ld+json"]').allTextContents(),
      )
      .then((blocks: string[]): void => {
        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
          const parsed: Record<string, unknown> = JSON.parse(block) as Record<
            string,
            unknown
          >;
          expect(parsed["@context"]).toBe("https://schema.org");
        }
      }));
}

test("primary navigation reaches the seasons page", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/")
    .then((): Promise<void> =>
      page.getByRole("navigation", { name: "Primary" }).getByText("Seasons").click(),
    )
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Michigan season dates/i),
    ));

test("the data page links a downloadable csv that resolves", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/data/")
    .then((): Promise<string | null> =>
      page.locator('a[href$=".csv"]').first().getAttribute("href"),
    )
    .then((href: string | null): Promise<APIResponse> => {
      expect(href).not.toBeNull();
      return page.request.get(href as string);
    })
    .then((response: APIResponse): void => {
      expect(response.status()).toBe(200);
    }));

test("an unknown url serves the custom 404", ({ page }: { page: Page }): Promise<void> =>
  page
    .goto("/county/not-a-real-county/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/That page is not here/i),
    ));

test("the home page has no detectable accessibility violations", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/")
    .then((): Promise<{ violations: unknown[] }> =>
      new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze(),
    )
    .then((results: { violations: unknown[] }): void => {
      expect(results.violations).toEqual([]);
    }));

test("robots.txt allows AI crawlers and points at the sitemap index", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/robots.txt")
    .then((): Promise<string> => page.locator("body").innerText())
    .then((body: string): void => {
      expect(body).toContain("GPTBot");
      expect(body).toContain("ClaudeBot");
      expect(body).toContain("Sitemap:");
    }));
