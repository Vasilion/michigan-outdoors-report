const DIACRITIC_PATTERN: RegExp = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC: RegExp = /[^a-z0-9]+/g;
const EDGE_HYPHENS: RegExp = /^-+|-+$/g;

export function slugify(value: string): string {
  const normalized: string = value
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(NON_ALPHANUMERIC, "-")
    .replace(EDGE_HYPHENS, "");
  if (normalized.length === 0) {
    throw new Error(`Slug is empty for input: ${value}`);
  }
  return normalized;
}

export type LakeSlugInput = {
  readonly name: string;
  readonly township: string | null;
};

export function resolveLakeSlugs(lakes: readonly LakeSlugInput[]): readonly string[] {
  const baseSlugs: string[] = lakes.map((lake: LakeSlugInput): string =>
    slugify(lake.name),
  );
  const counts: Map<string, number> = new Map<string, number>();
  for (const slug of baseSlugs) {
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const used: Set<string> = new Set<string>();
  return baseSlugs.map((base: string, index: number): string => {
    const lake: LakeSlugInput = lakes[index] as LakeSlugInput;
    const isDuplicate: boolean = (counts.get(base) ?? 0) > 1;
    const withTownship: string =
      isDuplicate && lake.township !== null ? `${base}-${slugify(lake.township)}` : base;
    let candidate: string = withTownship;
    let suffix: number = 2;
    while (used.has(candidate)) {
      candidate = `${withTownship}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  });
}

export function countySlug(name: string): string {
  return slugify(name.replace(/\s+county$/i, ""));
}
