import { describe, expect, it } from "vitest";
import { guardRowCount } from "../../importers/lib/guard";
import type { GuardVerdict } from "../../importers/lib/guard";
import { backoffDelayMs, cachePathFor, userAgent } from "../../importers/lib/http";

describe("row count guard", (): void => {
  it("accepts a first run", (): void => {
    const verdict: GuardVerdict = guardRowCount({
      importer: "harvest",
      previousRows: 0,
      incomingRows: 500,
    });
    expect(verdict.ok).toBe(true);
  });

  it("refuses to overwrite good data with an empty fetch", (): void => {
    expect(
      guardRowCount({ importer: "harvest", previousRows: 500, incomingRows: 0 }).ok,
    ).toBe(false);
  });

  it("refuses a drop of more than 30 percent", (): void => {
    expect(
      guardRowCount({ importer: "stocking", previousRows: 1000, incomingRows: 699 }).ok,
    ).toBe(false);
    expect(
      guardRowCount({ importer: "stocking", previousRows: 1000, incomingRows: 700 }).ok,
    ).toBe(true);
  });

  it("accepts growth", (): void => {
    expect(
      guardRowCount({ importer: "stocking", previousRows: 1000, incomingRows: 1400 }).ok,
    ).toBe(true);
  });
});

describe("importer http helpers", (): void => {
  it("identifies the crawler with a contact address", (): void => {
    expect(userAgent()).toContain("MichiganOutdoorsReportBot");
    expect(userAgent()).toContain("michiganoutdoorsreport.com");
  });

  it("derives a stable cache path per url", (): void => {
    const first: string = cachePathFor("https://example.com/a", "harvest");
    const second: string = cachePathFor("https://example.com/a", "harvest");
    const other: string = cachePathFor("https://example.com/b", "harvest");
    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).toContain("harvest-");
  });

  it("backs off exponentially with a ceiling", (): void => {
    expect(backoffDelayMs(0)).toBe(500);
    expect(backoffDelayMs(1)).toBe(1000);
    expect(backoffDelayMs(10)).toBe(30_000);
  });
});
