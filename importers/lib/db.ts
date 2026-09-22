import { config } from "dotenv";
import pg from "pg";

config();

export type QueryValue = string | number | boolean | null;

export function connect(): Promise<pg.Client> {
  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    return Promise.reject(new Error("DATABASE_URL is not set"));
  }
  const client: pg.Client = new pg.Client({ connectionString });
  return client.connect().then((): pg.Client => client);
}

export function sequential<T>(
  items: readonly T[],
  step: (item: T, index: number) => Promise<unknown>,
): Promise<void> {
  return items.reduce(
    (chain: Promise<void>, item: T, index: number): Promise<void> =>
      chain.then((): Promise<void> => step(item, index).then((): void => undefined)),
    Promise.resolve(),
  );
}

export function chunk<T>(items: readonly T[], size: number): readonly T[][] {
  const pages: T[][] = [];
  for (let index: number = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function lookupIds(
  client: pg.Client,
  table: string,
  keyColumn: string,
): Promise<Map<string, number>> {
  return client
    .query(`SELECT id, ${keyColumn} AS key FROM ${table}`)
    .then((result: pg.QueryResult): Map<string, number> => {
      const map: Map<string, number> = new Map<string, number>();
      for (const row of result.rows as { id: string; key: string }[]) {
        map.set(row.key, Number(row.id));
      }
      return map;
    });
}
