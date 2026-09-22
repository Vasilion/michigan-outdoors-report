const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat("en-US");

const LONG_DATE_FORMAT: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE_FORMAT: Intl.DateTimeFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

export function formatAcres(value: number): string {
  return `${NUMBER_FORMAT.format(Math.round(value))} acres`;
}

export function parseIsoDate(iso: string): Date {
  const parsed: Date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return parsed;
}

export function formatLongDate(iso: string): string {
  return LONG_DATE_FORMAT.format(parseIsoDate(iso));
}

export function formatShortDate(iso: string): string {
  return SHORT_DATE_FORMAT.format(parseIsoDate(iso));
}

export type PercentChange = {
  readonly direction: "up" | "down" | "unchanged";
  readonly percent: number;
  readonly text: string;
};

export function percentChange(current: number, previous: number): PercentChange | null {
  if (previous <= 0) {
    return null;
  }
  const raw: number = ((current - previous) / previous) * 100;
  const rounded: number = Math.round(Math.abs(raw) * 10) / 10;
  if (rounded < 0.05) {
    return { direction: "unchanged", percent: 0, text: "about even with" };
  }
  const direction: "up" | "down" = raw > 0 ? "up" : "down";
  return {
    direction,
    percent: rounded,
    text: `${direction} ${rounded}% from`,
  };
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function joinList(items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0] as string;
  }
  if (items.length === 2) {
    return `${items[0] as string} and ${items[1] as string}`;
  }
  const head: string = items.slice(0, -1).join(", ");
  return `${head}, and ${items[items.length - 1] as string}`;
}
