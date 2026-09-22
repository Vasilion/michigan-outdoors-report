import type pg from "pg";
import { connect } from "./db";
import { guardRowCount } from "./guard";
import type { GuardVerdict } from "./guard";

export type RunResult = {
  readonly rowsIn: number;
  readonly rowsUpserted: number;
};

export type ImporterBody = (client: pg.Client) => Promise<RunResult>;

function countRows(client: pg.Client, table: string): Promise<number> {
  return client
    .query(`SELECT count(*)::int AS n FROM ${table}`)
    .then((result: pg.QueryResult): number => (result.rows[0] as { n: number }).n);
}

function recordRun(
  client: pg.Client,
  importer: string,
  startedAt: string,
  result: RunResult | null,
  error: unknown,
): Promise<unknown> {
  return client.query(
    `INSERT INTO source_runs (importer, started_at, finished_at, rows_in, rows_upserted, status, error)
     VALUES ($1, $2, now(), $3, $4, $5, $6)`,
    [
      importer,
      startedAt,
      result === null ? 0 : result.rowsIn,
      result === null ? 0 : result.rowsUpserted,
      error === null ? "ok" : "failed",
      error === null ? null : String(error).slice(0, 2000),
    ],
  );
}

export function runImporter(
  importer: string,
  guardTable: string,
  body: ImporterBody,
): void {
  const startedAt: string = new Date().toISOString();
  process.stdout.write(`\n[${importer}] starting\n`);

  connect()
    .then((client: pg.Client): Promise<void> =>
      countRows(client, guardTable)
        .then((before: number): Promise<RunResult> =>
          body(client).then((result: RunResult): Promise<RunResult> =>
            countRows(client, guardTable).then((after: number): RunResult => {
              const verdict: GuardVerdict = guardRowCount({
                importer,
                previousRows: before,
                incomingRows: after,
              });
              process.stdout.write(`[${importer}] ${verdict.reason}\n`);
              if (!verdict.ok) {
                throw new Error(verdict.reason);
              }
              return result;
            }),
          ),
        )
        .then((result: RunResult): Promise<void> => {
          process.stdout.write(
            `[${importer}] read ${result.rowsIn} source rows, upserted ${result.rowsUpserted}\n`,
          );
          return recordRun(client, importer, startedAt, result, null)
            .then((): Promise<void> => client.end())
            .then((): void => undefined);
        })
        .catch((error: unknown): Promise<void> => {
          process.stderr.write(`[${importer}] FAILED: ${String(error)}\n`);
          return recordRun(client, importer, startedAt, null, error)
            .then((): Promise<void> => client.end())
            .then((): void => {
              process.exitCode = 1;
            });
        }),
    )
    .catch((error: unknown): void => {
      process.stderr.write(`[${importer}] could not connect: ${String(error)}\n`);
      process.exitCode = 1;
    });
}
