import { describe, expect, it } from "vitest";
import {
  formatAcres,
  formatCount,
  formatLongDate,
  joinList,
  percentChange,
  pluralize,
} from "../../src/lib/format";
import type { PercentChange } from "../../src/lib/format";
import {
  daysBetween,
  nextOpeningSeason,
  openSeasons,
  seasonStatus,
} from "../../src/lib/season";
import type { Season } from "../../src/lib/data/schemas";

function season(partial: Partial<Season>): Season {
  return {
    speciesSlug: "white-tailed-deer",
    name: "Firearm",
    zone: "Statewide",
    startDate: "2026-11-15",
    endDate: "2026-11-30",
    notes: null,
    sourceUrl: "https://www.michigan.gov/dnr",
    lastVerified: "2026-09-01",
    ...partial,
  };
}

describe("format", (): void => {
  it("formats counts with separators", (): void => {
    expect(formatCount(12345)).toBe("12,345");
    expect(formatAcres(4320.4)).toBe("4,320 acres");
  });

  it("formats dates in UTC so a snapshot date never shifts a day", (): void => {
    expect(formatLongDate("2026-11-15")).toBe("November 15, 2026");
    expect(formatLongDate("2026-01-01T00:00:00.000Z")).toBe("January 1, 2026");
  });

  it("rejects an unparseable date", (): void => {
    expect((): string => formatLongDate("not-a-date")).toThrow();
  });

  it("computes percent change with direction", (): void => {
    const up: PercentChange | null = percentChange(120, 100);
    expect(up).not.toBeNull();
    expect((up as PercentChange).direction).toBe("up");
    expect((up as PercentChange).percent).toBe(20);
    expect((up as PercentChange).text).toBe("up 20% from");

    const down: PercentChange | null = percentChange(80, 100);
    expect((down as PercentChange).direction).toBe("down");
    expect((down as PercentChange).text).toBe("down 20% from");
  });

  it("returns null rather than dividing by zero", (): void => {
    expect(percentChange(50, 0)).toBeNull();
  });

  it("reports an unchanged value without a percentage", (): void => {
    const same: PercentChange | null = percentChange(100, 100);
    expect((same as PercentChange).direction).toBe("unchanged");
  });

  it("pluralizes and joins lists", (): void => {
    expect(pluralize(1, "lake", "lakes")).toBe("lake");
    expect(pluralize(2, "lake", "lakes")).toBe("lakes");
    expect(joinList([])).toBe("");
    expect(joinList(["walleye"])).toBe("walleye");
    expect(joinList(["walleye", "pike"])).toBe("walleye and pike");
    expect(joinList(["walleye", "pike", "perch"])).toBe("walleye, pike, and perch");
  });
});

describe("season status", (): void => {
  it("counts days between dates", (): void => {
    expect(daysBetween("2026-11-01", "2026-11-15")).toBe(14);
  });

  it("reports an upcoming season with a countdown", (): void => {
    expect(seasonStatus(season({}), "2026-11-01")).toEqual({
      state: "upcoming",
      daysUntilOpen: 14,
      daysRemaining: null,
    });
  });

  it("reports an open season with days remaining", (): void => {
    expect(seasonStatus(season({}), "2026-11-20")).toEqual({
      state: "open",
      daysUntilOpen: null,
      daysRemaining: 10,
    });
  });

  it("treats the closing day as open and the next day as closed", (): void => {
    expect(seasonStatus(season({}), "2026-11-30").state).toBe("open");
    expect(seasonStatus(season({}), "2026-12-01").state).toBe("closed");
  });

  it("picks the next opening season", (): void => {
    const seasons: readonly Season[] = [
      season({ name: "Late antlerless", startDate: "2026-12-01", endDate: "2027-01-01" }),
      season({ name: "Firearm" }),
    ];
    const next: Season | null = nextOpeningSeason(seasons, "2026-10-01");
    expect(next).not.toBeNull();
    expect((next as Season).name).toBe("Firearm");
  });

  it("lists only the seasons open today", (): void => {
    const seasons: readonly Season[] = [
      season({ name: "Firearm" }),
      season({ name: "Late antlerless", startDate: "2026-12-01", endDate: "2027-01-01" }),
    ];
    expect(openSeasons(seasons, "2026-11-20").length).toBe(1);
  });
});
