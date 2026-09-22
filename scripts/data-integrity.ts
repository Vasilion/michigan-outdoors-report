import { errorsOnly, runIntegrityChecks } from "../src/lib/data/integrity";
import type { Issue, SnapshotBundle } from "../src/lib/data/integrity";
import { loadBundle } from "../src/lib/data/bundle";

function main(): void {
  const bundle: SnapshotBundle = loadBundle();
  const issues: readonly Issue[] = runIntegrityChecks(bundle);
  const errors: readonly Issue[] = errorsOnly(issues);
  for (const issue of issues) {
    const stream: NodeJS.WriteStream =
      issue.level === "error" ? process.stderr : process.stdout;
    stream.write(`  ${issue.level}: [${issue.code}] ${issue.message}\n`);
  }
  const counts: string = [
    `counties=${bundle.counties.length}`,
    `species=${bundle.species.length}`,
    `lakes=${bundle.lakes.length}`,
    `public_lands=${bundle.publicLands.length}`,
    `access_sites=${bundle.accessSites.length}`,
    `stocking=${bundle.stockingEvents.length}`,
    `harvest=${bundle.harvestSnapshots.length}`,
    `seasons=${bundle.seasons.length}`,
    `listings=${bundle.directoryListings.length}`,
  ].join(" ");
  if (errors.length > 0) {
    process.stderr.write(
      `data integrity FAILED with ${errors.length} error(s): ${counts}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`data integrity passed: ${counts}\n`);
}

main();
