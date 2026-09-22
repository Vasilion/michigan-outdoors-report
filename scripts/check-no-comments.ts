import { readFileSync } from "node:fs";
import { globSync } from "tinyglobby";
import { findComments } from "./lib/comments";
import type { CommentFinding } from "./lib/comments";

function main(): void {
  const files: string[] = globSync(["**/*.ts", "**/*.tsx"], {
    ignore: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "raw-cache/**",
      "next-env.d.ts",
    ],
  });
  const findings: CommentFinding[] = [];
  for (const file of files) {
    findings.push(...findComments(file, readFileSync(file, "utf8")));
  }
  if (findings.length > 0) {
    process.stderr.write(
      `Found ${findings.length} comment(s). This project forbids comments in code.\n`,
    );
    for (const finding of findings) {
      process.stderr.write(`  ${finding.file}:${finding.line}  ${finding.text.trim()}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`no-comments check passed across ${files.length} files\n`);
}

main();
