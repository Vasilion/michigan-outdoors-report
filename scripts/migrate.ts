import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { globSync } from "tinyglobby";
import { config } from "dotenv";
import pg from "pg";

config();

const MIGRATIONS_DIR: string = join(process.cwd(), "db", "migrations");

const CREATE_TABLE_SQL: string = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

export type Migration = {
  readonly name: string;
  readonly sql: string;
};

export function loadMigrations(): readonly Migration[] {
  const files: string[] = globSync(["*.sql"], { cwd: MIGRATIONS_DIR }).sort();
  return files.map((file: string): Migration => ({
    name: basename(file),
    sql: readFileSync(join(MIGRATIONS_DIR, file), "utf8"),
  }));
}

function applySequentially(
  client: pg.Client,
  pending: readonly Migration[],
): Promise<void> {
  return pending.reduce(
    (chain: Promise<void>, migration: Migration): Promise<void> =>
      chain.then((): Promise<void> => {
        process.stdout.write(`applying ${migration.name}\n`);
        return client
          .query("BEGIN")
          .then((): Promise<pg.QueryResult> => client.query(migration.sql))
          .then((): Promise<pg.QueryResult> =>
            client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
              migration.name,
            ]),
          )
          .then((): Promise<pg.QueryResult> => client.query("COMMIT"))
          .then((): void => undefined)
          .catch((error: unknown): Promise<never> =>
            client.query("ROLLBACK").then((): never => {
              throw error;
            }),
          );
      }),
    Promise.resolve(),
  );
}

function main(): void {
  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    process.stderr.write("DATABASE_URL is not set\n");
    process.exit(1);
  }
  const client: pg.Client = new pg.Client({ connectionString });
  const migrations: readonly Migration[] = loadMigrations();
  client
    .connect()
    .then((): Promise<pg.QueryResult> => client.query(CREATE_TABLE_SQL))
    .then((): Promise<pg.QueryResult> =>
      client.query("SELECT name FROM schema_migrations"),
    )
    .then((result: pg.QueryResult): Promise<void> => {
      const applied: Set<string> = new Set<string>(
        result.rows.map((row: { name: string }): string => row.name),
      );
      const pending: readonly Migration[] = migrations.filter(
        (migration: Migration): boolean => !applied.has(migration.name),
      );
      if (pending.length === 0) {
        process.stdout.write(`no pending migrations (${applied.size} applied)\n`);
        return Promise.resolve();
      }
      return applySequentially(client, pending).then((): void => {
        process.stdout.write(`applied ${pending.length} migration(s)\n`);
      });
    })
    .then((): Promise<void> => client.end())
    .catch((error: unknown): void => {
      process.stderr.write(`migration failed: ${String(error)}\n`);
      client.end().finally((): void => {
        process.exit(1);
      });
    });
}

main();
