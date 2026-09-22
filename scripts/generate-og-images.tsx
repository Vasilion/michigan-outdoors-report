import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import type { ReactElement } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getCountShapesForOg, stateOutlineRings } from "./lib/og-shapes";
import { getCounties, getMeta, getSpecies } from "../src/lib/data/snapshot";
import type { County, HarvestSnapshot } from "../src/lib/data/schemas";
import { formatCount } from "../src/lib/format";
import { harvestSeries } from "../src/lib/views/county";
import { stockingBySpecies } from "../src/lib/views/water";
import { SITE } from "../src/lib/site";

const WIDTH: number = 1200;
const HEIGHT: number = 630;
const OUT_DIR: string = join(process.cwd(), "public", "og");
const FONT_DIR: string = join(process.cwd(), "assets", "fonts");

type FontSpec = {
  readonly name: string;
  readonly data: Buffer;
  readonly weight: 400 | 600 | 700;
  readonly style: "normal";
};

let cachedFonts: readonly FontSpec[] | null = null;

function loadFonts(): readonly FontSpec[] {
  if (cachedFonts !== null) {
    return cachedFonts;
  }
  cachedFonts = [
    {
      name: "SourceSerif",
      data: readFileSync(join(FONT_DIR, "SourceSerif-700.woff")),
      weight: 700,
      style: "normal",
    },
    {
      name: "Inter",
      data: readFileSync(join(FONT_DIR, "Inter-400.woff")),
      weight: 400,
      style: "normal",
    },
    {
      name: "Inter",
      data: readFileSync(join(FONT_DIR, "Inter-600.woff")),
      weight: 600,
      style: "normal",
    },
  ];
  return cachedFonts;
}

function mapDataUri(countySlug: string | null): string {
  const svg: string =
    countySlug === null ? stateOutlineRings() : getCountShapesForOg(countySlug);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export type CardInput = {
  readonly eyebrow: string;
  readonly title: string;
  readonly statLabel: string | null;
  readonly statValue: string | null;
  readonly countySlug: string | null;
};

function card(input: CardInput): ReactElement {
  return createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#0b2218",
        color: "#ffffff",
        fontFamily: "Inter",
        position: "relative",
      },
    },
    createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "14px",
        height: "100%",
        backgroundColor: "#e2570f",
      },
    }),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 56px 56px 84px",
          width: "740px",
        },
      },
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        createElement(
          "div",
          {
            style: {
              fontSize: "22px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#a9d3ba",
              fontWeight: 600,
            },
          },
          input.eyebrow,
        ),
        createElement(
          "div",
          {
            style: {
              fontFamily: "SourceSerif",
              fontSize: input.title.length > 34 ? "62px" : "76px",
              lineHeight: 1.05,
              marginTop: "18px",
              fontWeight: 700,
            },
          },
          input.title,
        ),
      ),
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        input.statValue === null
          ? createElement("div", { style: { display: "flex" } })
          : createElement(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              createElement(
                "div",
                { style: { fontSize: "20px", color: "#a9d3ba", fontWeight: 600 } },
                input.statLabel ?? "",
              ),
              createElement(
                "div",
                {
                  style: {
                    fontFamily: "SourceSerif",
                    fontSize: "58px",
                    color: "#f07b34",
                    fontWeight: 700,
                  },
                },
                input.statValue,
              ),
            ),
        createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "24px",
              color: "#d9ece1",
              marginTop: "26px",
              fontWeight: 600,
            },
          },
          SITE.name,
        ),
      ),
    ),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "460px",
        },
      },
      createElement("img", {
        src: mapDataUri(input.countySlug),
        width: 340,
        height: 400,
      }),
    ),
  );
}

function renderCard(input: CardInput, file: string): Promise<void> {
  return satori(card(input), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [...loadFonts()],
  }).then((svg: string): void => {
    const png: Buffer = new Resvg(svg, {
      fitTo: { mode: "width", value: WIDTH },
    })
      .render()
      .asPng();
    writeFileSync(join(OUT_DIR, file), png);
  });
}

function sequential<T>(
  items: readonly T[],
  step: (item: T) => Promise<void>,
): Promise<void> {
  return items.reduce(
    (chain: Promise<void>, item: T): Promise<void> =>
      chain.then((): Promise<void> => step(item)),
    Promise.resolve(),
  );
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const dataDate: string = getMeta().generatedAt.slice(0, 10);
  const counties: readonly County[] = getCounties();
  const stocked: Map<string, unknown[]> = stockingBySpecies();

  const cards: { input: CardInput; file: string }[] = [
    {
      file: "default.png",
      input: {
        eyebrow: "Michigan only. DNR data only.",
        title: "Every Michigan county, by the numbers that matter.",
        statLabel: null,
        statValue: null,
        countySlug: null,
      },
    },
  ];

  for (const county of counties) {
    const latest: HarvestSnapshot | null = harvestSeries(county.slug, "deer").latestFinal;
    cards.push({
      file: `county-${county.slug}.png`,
      input: {
        eyebrow: `${county.peninsula === "UP" ? "Upper" : "Lower"} Peninsula`,
        title: `${county.name} County`,
        statLabel: latest === null ? null : `${latest.seasonYear} deer reported`,
        statValue: latest === null ? null : formatCount(latest.total),
        countySlug: county.slug,
      },
    });
  }

  for (const species of getSpecies()) {
    const hasData: boolean =
      species.kind === "game" || (stocked.get(species.slug) ?? []).length > 0;
    if (!hasData) {
      continue;
    }
    cards.push({
      file: `species-${species.slug}.png`,
      input: {
        eyebrow: species.kind === "game" ? "Harvest by county" : "Stocking by county",
        title: `Michigan ${species.name}`,
        statLabel: "Statewide, every county",
        statValue: species.kind === "game" ? "83 counties" : "DNR records",
        countySlug: null,
      },
    });
  }

  process.stdout.write(`generating ${cards.length} og images (data ${dataDate})\n`);
  sequential(cards, (entry: { input: CardInput; file: string }): Promise<void> =>
    renderCard(entry.input, entry.file),
  )
    .then((): void => {
      process.stdout.write(`og images written to public/og\n`);
    })
    .catch((error: unknown): void => {
      process.stderr.write(`og generation failed: ${String(error)}\n`);
      process.exitCode = 1;
    });
}

main();
