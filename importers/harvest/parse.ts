import type { HarvestApiResponse } from "./fetch";

export type RawHarvestRow = {
  readonly countyName: string;
  readonly antlered: number | null;
  readonly antlerless: number | null;
  readonly total: number;
  readonly seasonYear: number;
};

export function parseHarvestResponse(
  response: HarvestApiResponse,
  licenseYear: number,
): readonly RawHarvestRow[] {
  if (!response.Success || response.Result === undefined) {
    throw new Error(
      `harvest api rejected license year ${licenseYear}: ${response.Message ?? "no message"}`,
    );
  }
  const rows: RawHarvestRow[] = [];
  for (const row of response.Result) {
    if (typeof row.AreaUnit !== "string" || row.AreaUnit.trim() === "") {
      continue;
    }
    if (typeof row.TotalCount !== "number" || row.TotalCount < 0) {
      continue;
    }
    rows.push({
      countyName: row.AreaUnit.trim(),
      antlered: row.AntleredCount ?? null,
      antlerless: row.AntlerlessCount ?? null,
      total: row.TotalCount,
      seasonYear: row.LicenseYear,
    });
  }
  return rows;
}

export function collapseDuplicates(
  rows: readonly RawHarvestRow[],
): readonly RawHarvestRow[] {
  const merged: Map<string, RawHarvestRow> = new Map<string, RawHarvestRow>();
  for (const row of rows) {
    const key: string = `${row.countyName}::${row.seasonYear}`;
    const existing: RawHarvestRow | undefined = merged.get(key);
    if (existing === undefined) {
      merged.set(key, row);
      continue;
    }
    merged.set(key, {
      ...existing,
      antlered:
        existing.antlered === null && row.antlered === null
          ? null
          : (existing.antlered ?? 0) + (row.antlered ?? 0),
      antlerless:
        existing.antlerless === null && row.antlerless === null
          ? null
          : (existing.antlerless ?? 0) + (row.antlerless ?? 0),
      total: existing.total + row.total,
    });
  }
  return [...merged.values()].sort((a: RawHarvestRow, b: RawHarvestRow): number =>
    a.countyName === b.countyName
      ? a.seasonYear - b.seasonYear
      : a.countyName.localeCompare(b.countyName),
  );
}
