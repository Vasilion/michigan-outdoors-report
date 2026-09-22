import { describe, expect, it } from "vitest";
import { countySlug, resolveLakeSlugs, slugify } from "../../src/lib/slug";
import type { LakeSlugInput } from "../../src/lib/slug";

describe("slugify", (): void => {
  it("lowercases and hyphenates", (): void => {
    expect(slugify("Big Bear Lake")).toBe("big-bear-lake");
  });

  it("strips diacritics and apostrophes", (): void => {
    expect(slugify("Devil's Lake")).toBe("devils-lake");
    expect(slugify("Sault Ste. Marié")).toBe("sault-ste-marie");
  });

  it("expands ampersands", (): void => {
    expect(slugify("Fish & Game Area")).toBe("fish-and-game-area");
  });

  it("collapses repeated separators and trims edges", (): void => {
    expect(slugify("  --Long  Lake--  ")).toBe("long-lake");
  });

  it("throws on input with no slug characters", (): void => {
    expect((): string => slugify("!!!")).toThrow();
  });
});

describe("countySlug", (): void => {
  it("drops a trailing County suffix", (): void => {
    expect(countySlug("Grand Traverse County")).toBe("grand-traverse");
    expect(countySlug("Kent")).toBe("kent");
  });
});

describe("resolveLakeSlugs", (): void => {
  it("leaves unique names alone", (): void => {
    const input: readonly LakeSlugInput[] = [
      { name: "Long Lake", township: "Alpena" },
      { name: "Round Lake", township: "Alpena" },
    ];
    expect(resolveLakeSlugs(input)).toEqual(["long-lake", "round-lake"]);
  });

  it("appends the township when a name repeats in the county", (): void => {
    const input: readonly LakeSlugInput[] = [
      { name: "Long Lake", township: "Alpena" },
      { name: "Long Lake", township: "Green" },
    ];
    expect(resolveLakeSlugs(input)).toEqual(["long-lake-alpena", "long-lake-green"]);
  });

  it("falls back to a numeric suffix when the township cannot break the tie", (): void => {
    const input: readonly LakeSlugInput[] = [
      { name: "Mud Lake", township: null },
      { name: "Mud Lake", township: null },
      { name: "Mud Lake", township: "Nester" },
    ];
    expect(resolveLakeSlugs(input)).toEqual([
      "mud-lake",
      "mud-lake-2",
      "mud-lake-nester",
    ]);
  });
});
