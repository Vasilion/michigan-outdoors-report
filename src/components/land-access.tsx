import Link from "next/link";
import type { ReactElement } from "react";
import { Crosshair, Trees } from "lucide-react";
import { Section } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@/lib/format";
import { detailNumber, programMeta } from "@/lib/views/land-access";
import type { ProgramKey, ProgramMeta } from "@/lib/views/land-access";
import type { LandProgram, ManagementUnit } from "@/lib/data/schemas";

export type LandProgramSectionProps = {
  readonly countyName: string;
  readonly programs: readonly LandProgram[];
};

function habitatLine(program: LandProgram): string | null {
  if (program.program !== "hunter_access") {
    return null;
  }
  const parts: string[] = [];
  const fields: readonly { key: string; label: string }[] = [
    { key: "agriculturalAcres", label: "agricultural" },
    { key: "forestAcres", label: "forest" },
    { key: "grasslandAcres", label: "grassland and brush" },
    { key: "wetlandAcres", label: "wetland" },
  ];
  for (const field of fields) {
    const value: number | null = detailNumber(program.detail, field.key);
    if (value !== null && value > 0) {
      parts.push(`${formatCount(Math.round(value))} acres ${field.label}`);
    }
  }
  return parts.length === 0 ? null : parts.join(", ");
}

export function LandProgramSection({
  countyName,
  programs,
}: LandProgramSectionProps): ReactElement | null {
  if (programs.length === 0) {
    return null;
  }
  return (
    <Section
      eyebrow="Beyond state land"
      title="Private land open to public hunting"
      icon={Trees}
      description={`Two Michigan programs open privately owned land in ${countyName} County to public hunting. The rules are not the same as on state land.`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {programs.map((program: LandProgram): ReactElement => {
          const meta: ProgramMeta = programMeta(program.program as ProgramKey);
          const habitat: string | null = habitatLine(program);
          return (
            <Card key={program.program}>
              <CardContent className="grid gap-2">
                <h3 className="text-lg font-semibold">{meta.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {formatCount(Math.round(program.acres))} acres ·{" "}
                  {formatCount(program.parcelCount)}{" "}
                  {program.parcelCount === 1 ? "parcel" : "parcels"} in {countyName}{" "}
                  County
                </p>
                {habitat === null ? null : <p className="text-sm">{habitat}</p>}
                <p className="border-l-2 border-sand-200 pl-3 text-sm">{meta.rules}</p>
                <p className="text-sm">
                  <Link href="/public-hunting-land/" prefetch={false}>
                    How this compares to every other access type
                  </Link>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

export type ManagementUnitSectionProps = {
  readonly countyName: string;
  readonly units: readonly ManagementUnit[];
};

const SPECIES_LABEL: Readonly<Record<string, string>> = {
  deer: "Deer",
  turkey: "Turkey",
  bear: "Bear",
  elk: "Elk",
};

export function ManagementUnitSection({
  countyName,
  units,
}: ManagementUnitSectionProps): ReactElement | null {
  if (units.length === 0) {
    return null;
  }
  const grouped: Map<string, ManagementUnit[]> = new Map<string, ManagementUnit[]>();
  for (const unit of units) {
    const bucket: ManagementUnit[] = grouped.get(unit.speciesSlug) ?? [];
    bucket.push(unit);
    grouped.set(unit.speciesSlug, bucket);
  }
  const year: number | null =
    units.find((unit: ManagementUnit): boolean => unit.unitYear !== null)?.unitYear ??
    null;
  return (
    <Section
      title="Management units"
      icon={Crosshair}
      description={`Which DNR management units cover ${countyName} County. Bag limits, quotas and license types are set per unit, not per county, so a county split between units can have two different sets of rules.${year === null ? "" : ` Boundaries shown are the ${year} units.`}`}
    >
      <Card>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[...grouped.entries()].map(
              ([slug, list]: [string, ManagementUnit[]]): ReactElement => (
                <div key={slug}>
                  <dt className="text-sm font-semibold">{SPECIES_LABEL[slug] ?? slug}</dt>
                  <dd className="text-muted-foreground text-sm">
                    {list
                      .map((unit: ManagementUnit): string => unit.name)
                      .sort()
                      .join(", ")}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </CardContent>
      </Card>
    </Section>
  );
}
