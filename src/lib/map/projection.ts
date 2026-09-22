export type MapPoint = readonly [number, number];
export type MapRing = readonly MapPoint[];

export type MapBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

export type MapFrame = {
  readonly bounds: MapBounds;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
};

export const MICHIGAN_MID_LATITUDE: number = 44.8;

export function projectPoint(point: MapPoint, midLatitude: number): MapPoint {
  const cosine: number = Math.cos((midLatitude * Math.PI) / 180);
  return [point[0] * cosine, -point[1]];
}

export function boundsOf(rings: readonly MapRing[], midLatitude: number): MapBounds {
  let minX: number = Number.POSITIVE_INFINITY;
  let minY: number = Number.POSITIVE_INFINITY;
  let maxX: number = Number.NEGATIVE_INFINITY;
  let maxY: number = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (const point of ring) {
      const projected: MapPoint = projectPoint(point, midLatitude);
      minX = Math.min(minX, projected[0]);
      minY = Math.min(minY, projected[1]);
      maxX = Math.max(maxX, projected[0]);
      maxY = Math.max(maxY, projected[1]);
    }
  }
  return { minX, minY, maxX, maxY };
}

export function frameFor(
  rings: readonly MapRing[],
  targetWidth: number,
  midLatitude: number,
): MapFrame {
  const bounds: MapBounds = boundsOf(rings, midLatitude);
  const spanX: number = bounds.maxX - bounds.minX;
  const spanY: number = bounds.maxY - bounds.minY;
  const scale: number = spanX === 0 ? 1 : targetWidth / spanX;
  return {
    bounds,
    width: targetWidth,
    height: Math.round(spanY * scale),
    scale,
  };
}

export function ringToPath(ring: MapRing, frame: MapFrame, midLatitude: number): string {
  const commands: string[] = [];
  for (let index: number = 0; index < ring.length; index += 1) {
    const projected: MapPoint = projectPoint(ring[index] as MapPoint, midLatitude);
    const x: number = Math.round((projected[0] - frame.bounds.minX) * frame.scale);
    const y: number = Math.round((projected[1] - frame.bounds.minY) * frame.scale);
    commands.push(`${index === 0 ? "M" : "L"}${x} ${y}`);
  }
  commands.push("Z");
  return commands.join("");
}

export function ringsToPath(
  rings: readonly MapRing[],
  frame: MapFrame,
  midLatitude: number,
): string {
  return rings
    .map((ring: MapRing): string => ringToPath(ring, frame, midLatitude))
    .join("");
}
