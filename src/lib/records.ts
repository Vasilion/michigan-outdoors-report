export const MASTER_ANGLER_URL: string =
  "https://www.michigan.gov/dnr/things-to-do/fishing/master-angler";

export function formatLength(inches: number | null): string {
  if (inches === null) {
    return "—";
  }
  const rounded: number = Math.round(inches * 100) / 100;
  return `${rounded}″`;
}

export function formatWeight(pounds: number | null): string {
  if (pounds === null) {
    return "—";
  }
  const rounded: number = Math.round(pounds * 100) / 100;
  return `${rounded} lb`;
}

export function recordSentence(
  speciesName: string,
  lengthIn: number,
  weightLb: number | null,
  waterName: string | null,
  year: number,
): string {
  const size: string =
    weightLb === null
      ? `${formatLength(lengthIn)}`
      : `${formatLength(lengthIn)} and ${formatWeight(weightLb)}`;
  const where: string = waterName === null ? "" : ` from ${waterName}`;
  return `${speciesName}, ${size}${where}, ${year}`;
}
