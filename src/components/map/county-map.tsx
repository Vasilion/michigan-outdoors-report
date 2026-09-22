import type { ReactElement } from "react";
import { getCountyShapes, getStateOutline } from "@/lib/data/snapshot";
import type { CountyShape, StateOutline } from "@/lib/data/schemas";
import { MICHIGAN_MID_LATITUDE, frameFor, ringsToPath } from "@/lib/map/projection";
import type { MapFrame, MapRing } from "@/lib/map/projection";
import { formatCount } from "@/lib/format";

const MAP_WIDTH: number = 760;

export const CHOROPLETH_RAMP: readonly string[] = [
  "#eef7f1",
  "#c7e3d2",
  "#8fc7a8",
  "#4a9a6d",
  "#1f5a3c",
  "#0b2218",
];

function allRings(shapes: readonly CountyShape[]): readonly MapRing[] {
  const rings: MapRing[] = [];
  for (const shape of shapes) {
    for (const ring of shape.rings) {
      rings.push(ring);
    }
  }
  return rings;
}

export type ChoroplethBucket = {
  readonly min: number;
  readonly max: number;
  readonly color: string;
};

export function quantileBuckets(
  values: readonly number[],
  colors: readonly string[],
): readonly ChoroplethBucket[] {
  const sorted: number[] = [...values]
    .filter((value: number): boolean => value > 0)
    .sort((a: number, b: number): number => a - b);
  if (sorted.length === 0) {
    return [];
  }
  const buckets: ChoroplethBucket[] = [];
  for (let index: number = 0; index < colors.length; index += 1) {
    const lowIndex: number = Math.floor((index / colors.length) * sorted.length);
    const highIndex: number = Math.max(
      lowIndex,
      Math.floor(((index + 1) / colors.length) * sorted.length) - 1,
    );
    buckets.push({
      min: sorted[lowIndex] as number,
      max: sorted[highIndex] as number,
      color: colors[index] as string,
    });
  }
  return buckets;
}

export function colorFor(
  value: number | undefined,
  buckets: readonly ChoroplethBucket[],
  emptyColor: string,
): string {
  if (value === undefined || value <= 0 || buckets.length === 0) {
    return emptyColor;
  }
  for (const bucket of buckets) {
    if (value <= bucket.max) {
      return bucket.color;
    }
  }
  return (buckets[buckets.length - 1] as ChoroplethBucket).color;
}

export type CountyMapProps = {
  readonly title: string;
  readonly unitLabel: string;
  readonly values: ReadonlyMap<string, number>;
  readonly names: ReadonlyMap<string, string>;
  readonly hrefFor: (slug: string) => string;
};

export function CountyChoropleth({
  title,
  unitLabel,
  values,
  names,
  hrefFor,
}: CountyMapProps): ReactElement {
  const shapes: readonly CountyShape[] = getCountyShapes();
  const frame: MapFrame = frameFor(allRings(shapes), MAP_WIDTH, MICHIGAN_MID_LATITUDE);
  const buckets: readonly ChoroplethBucket[] = quantileBuckets(
    [...values.values()],
    CHOROPLETH_RAMP,
  );

  return (
    <div>
      <svg
        aria-label={`${title}. Each county is a link; the county lists on this page carry the same figures as text.`}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        className="block h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{title}</title>
        <g strokeWidth={0.6} stroke="#fbf9f5" strokeLinejoin="round">
          {shapes.map((shape: CountyShape): ReactElement => {
            const value: number | undefined = values.get(shape.slug);
            const name: string = names.get(shape.slug) ?? shape.slug;
            const label: string =
              value === undefined
                ? `${name} County, no data`
                : `${name} County, ${formatCount(value)} ${unitLabel}`;
            return (
              <a
                key={shape.slug}
                className="county-link"
                href={hrefFor(shape.slug)}
                aria-label={label}
              >
                <path
                  className="county-path"
                  d={ringsToPath(shape.rings, frame, MICHIGAN_MID_LATITUDE)}
                  fill={colorFor(value, buckets, "#e8e1d3")}
                  fillRule="evenodd"
                >
                  <title>{label}</title>
                </path>
              </a>
            );
          })}
        </g>
      </svg>
      {buckets.length === 0 ? null : (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="eyebrow">{unitLabel}</span>
          <span className="text-muted-foreground numeric flex items-center gap-1.5">
            {formatCount((buckets[0] as ChoroplethBucket).min)}
            <span className="flex">
              {buckets.map((bucket: ChoroplethBucket): ReactElement => (
                <span
                  key={bucket.color}
                  className="border-border block h-3.5 w-8 border-y border-r first:border-l"
                  style={{ backgroundColor: bucket.color }}
                />
              ))}
            </span>
            {formatCount((buckets[buckets.length - 1] as ChoroplethBucket).max)}
          </span>
        </div>
      )}
    </div>
  );
}

export type CountyLocatorProps = {
  readonly countySlug: string;
  readonly countyName: string;
};

export function CountyLocator({
  countySlug,
  countyName,
}: CountyLocatorProps): ReactElement | null {
  const outline: StateOutline | null = getStateOutline();
  const shape: CountyShape | undefined = getCountyShapes().find(
    (entry: CountyShape): boolean => entry.slug === countySlug,
  );
  if (outline === null || shape === undefined) {
    return null;
  }
  const frame: MapFrame = frameFor(outline.rings, 190, MICHIGAN_MID_LATITUDE);
  return (
    <svg
      role="img"
      aria-label={`Map of Michigan with ${countyName} County highlighted`}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      className="block h-auto w-full max-w-[190px]"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{`${countyName} County within Michigan`}</title>
      <path
        d={ringsToPath(outline.rings, frame, MICHIGAN_MID_LATITUDE)}
        fill="#e8e1d3"
        fillRule="evenodd"
      />
      <path
        d={ringsToPath(shape.rings, frame, MICHIGAN_MID_LATITUDE)}
        fill="#e2570f"
        fillRule="evenodd"
        stroke="#963706"
        strokeWidth={0.8}
      />
    </svg>
  );
}
