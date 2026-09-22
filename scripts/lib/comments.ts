import ts from "typescript";

const ALLOWED_PREFIXES: readonly string[] = [
  "eslint-",
  "eslint ",
  "@ts-",
  "prettier-ignore",
  "<reference",
];

export type CommentFinding = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
};

export function isAllowedComment(raw: string): boolean {
  const body: string = raw
    .replace(/^\/\/+/, "")
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    .trim();
  return ALLOWED_PREFIXES.some((prefix: string): boolean => body.startsWith(prefix));
}

export function findComments(
  fileName: string,
  source: string,
): readonly CommentFinding[] {
  const sourceFile: ts.SourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const seen: Set<number> = new Set<number>();
  const findings: CommentFinding[] = [];

  const record = (range: ts.CommentRange): void => {
    if (seen.has(range.pos)) {
      return;
    }
    seen.add(range.pos);
    const raw: string = source.slice(range.pos, range.end);
    if (isAllowedComment(raw)) {
      return;
    }
    const line: number = sourceFile.getLineAndCharacterOfPosition(range.pos).line + 1;
    findings.push({ file: fileName, line, text: raw.split("\n")[0] ?? raw });
  };

  const visit = (node: ts.Node): void => {
    if (
      node.getFullStart() !== node.getEnd() ||
      node.kind === ts.SyntaxKind.EndOfFileToken
    ) {
      for (const range of ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []) {
        record(range);
      }
      for (const range of ts.getTrailingCommentRanges(source, node.getEnd()) ?? []) {
        record(range);
      }
    }
    for (const child of node.getChildren(sourceFile)) {
      visit(child);
    }
  };

  visit(sourceFile);
  return findings;
}
