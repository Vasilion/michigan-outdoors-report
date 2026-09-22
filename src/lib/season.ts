import { parseIsoDate } from "./format";
import type { Season } from "./data/schemas";

export type SeasonStatus = {
  readonly state: "open" | "upcoming" | "closed";
  readonly daysUntilOpen: number | null;
  readonly daysRemaining: number | null;
};

const MS_PER_DAY: number = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  const from: number = parseIsoDate(fromIso).getTime();
  const to: number = parseIsoDate(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

export function seasonStatus(season: Season, todayIso: string): SeasonStatus {
  const toStart: number = daysBetween(todayIso, season.startDate);
  const toEnd: number = daysBetween(todayIso, season.endDate);
  if (toStart > 0) {
    return { state: "upcoming", daysUntilOpen: toStart, daysRemaining: null };
  }
  if (toEnd >= 0) {
    return { state: "open", daysUntilOpen: null, daysRemaining: toEnd };
  }
  return { state: "closed", daysUntilOpen: null, daysRemaining: null };
}

export function nextOpeningSeason(
  seasons: readonly Season[],
  todayIso: string,
): Season | null {
  const upcoming: Season[] = seasons
    .filter((season: Season): boolean => daysBetween(todayIso, season.startDate) > 0)
    .sort((a: Season, b: Season): number => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

export function openSeasons(
  seasons: readonly Season[],
  todayIso: string,
): readonly Season[] {
  return seasons.filter(
    (season: Season): boolean => seasonStatus(season, todayIso).state === "open",
  );
}
