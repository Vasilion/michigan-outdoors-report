import { getCountyShapes, getStateOutline } from "../../src/lib/data/snapshot";
import type { CountyShape, StateOutline } from "../../src/lib/data/schemas";
import {
  MICHIGAN_MID_LATITUDE,
  frameFor,
  ringsToPath,
} from "../../src/lib/map/projection";
import type { MapFrame } from "../../src/lib/map/projection";

const CARD_MAP_WIDTH: number = 340;

function svgDocument(frame: MapFrame, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.width} ${frame.height}" width="${frame.width}" height="${frame.height}">${body}</svg>`;
}

export function stateOutlineRings(): string {
  const outline: StateOutline | null = getStateOutline();
  if (outline === null) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>`;
  }
  const frame: MapFrame = frameFor(outline.rings, CARD_MAP_WIDTH, MICHIGAN_MID_LATITUDE);
  const path: string = ringsToPath(outline.rings, frame, MICHIGAN_MID_LATITUDE);
  return svgDocument(
    frame,
    `<path d="${path}" fill="#17432e" fill-rule="evenodd" stroke="#2c774f" stroke-width="2"/>`,
  );
}

export function getCountShapesForOg(countySlug: string): string {
  const outline: StateOutline | null = getStateOutline();
  const shape: CountyShape | undefined = getCountyShapes().find(
    (entry: CountyShape): boolean => entry.slug === countySlug,
  );
  if (outline === null || shape === undefined) {
    return stateOutlineRings();
  }
  const frame: MapFrame = frameFor(outline.rings, CARD_MAP_WIDTH, MICHIGAN_MID_LATITUDE);
  const statePath: string = ringsToPath(outline.rings, frame, MICHIGAN_MID_LATITUDE);
  const countyPath: string = ringsToPath(shape.rings, frame, MICHIGAN_MID_LATITUDE);
  return svgDocument(
    frame,
    `<path d="${statePath}" fill="#17432e" fill-rule="evenodd" stroke="#2c774f" stroke-width="2"/>` +
      `<path d="${countyPath}" fill="#e2570f" fill-rule="evenodd" stroke="#f9c9a9" stroke-width="2"/>`,
  );
}
