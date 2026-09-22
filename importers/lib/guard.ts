export const MAX_DROP_RATIO: number = 0.3;

export type GuardInput = {
  readonly importer: string;
  readonly previousRows: number;
  readonly incomingRows: number;
};

export type GuardVerdict = {
  readonly ok: boolean;
  readonly reason: string;
};

export function guardRowCount(input: GuardInput): GuardVerdict {
  if (input.incomingRows === 0 && input.previousRows > 0) {
    return {
      ok: false,
      reason: `${input.importer}: fetch returned 0 rows but ${input.previousRows} rows are already stored`,
    };
  }
  if (input.previousRows === 0) {
    return {
      ok: true,
      reason: `${input.importer}: first run, ${input.incomingRows} rows`,
    };
  }
  const drop: number = (input.previousRows - input.incomingRows) / input.previousRows;
  if (drop > MAX_DROP_RATIO) {
    return {
      ok: false,
      reason: `${input.importer}: row count fell ${Math.round(drop * 100)}% (${input.previousRows} to ${input.incomingRows}), above the ${Math.round(MAX_DROP_RATIO * 100)}% guard`,
    };
  }
  return {
    ok: true,
    reason: `${input.importer}: ${input.incomingRows} rows (was ${input.previousRows})`,
  };
}
