import type { ReactElement } from "react";
import { formatCount } from "@/lib/format";

export type TableColumn = {
  readonly key: string;
  readonly label: string;
  readonly numeric?: boolean;
};

export type TableRow = Readonly<Record<string, string>>;

export type DataTableProps = {
  readonly caption: string;
  readonly columns: readonly TableColumn[];
  readonly rows: readonly TableRow[];
};

export function DataTable({ caption, columns, rows }: DataTableProps): ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column: TableColumn): ReactElement => (
              <th
                key={column.key}
                scope="col"
                className={column.numeric === true ? "numeric" : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: TableRow, rowIndex: number): ReactElement => {
            const firstColumn: TableColumn = columns[0] as TableColumn;
            return (
              <tr key={rowIndex}>
                <th scope="row">{row[firstColumn.key] ?? ""}</th>
                {columns.slice(1).map((column: TableColumn): ReactElement => (
                  <td
                    key={column.key}
                    className={column.numeric === true ? "numeric" : undefined}
                  >
                    {row[column.key] ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export type TrendPoint = {
  readonly label: string;
  readonly value: number;
};

export type TrendChartProps = {
  readonly title: string;
  readonly unitLabel: string;
  readonly points: readonly TrendPoint[];
};

const CHART_WIDTH: number = 720;
const CHART_HEIGHT: number = 260;
const PADDING_LEFT: number = 56;
const PADDING_BOTTOM: number = 32;
const PADDING_TOP: number = 16;

export function TrendChart({
  title,
  unitLabel,
  points,
}: TrendChartProps): ReactElement | null {
  if (points.length === 0) {
    return null;
  }
  const maxValue: number = Math.max(
    ...points.map((point: TrendPoint): number => point.value),
    1,
  );
  const plotWidth: number = CHART_WIDTH - PADDING_LEFT - 8;
  const plotHeight: number = CHART_HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const slotWidth: number = plotWidth / points.length;
  const barWidth: number = Math.max(6, slotWidth * 0.6);
  const description: string = points
    .map((point: TrendPoint): string => `${point.label}: ${formatCount(point.value)}`)
    .join(", ");

  return (
    <figure className="card">
      <figcaption className="text-sm text-bark-500">{title}</figcaption>
      <svg
        role="img"
        aria-label={`${title}. ${description}.`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="mt-3 block h-auto w-full"
      >
        <title>{title}</title>
        <desc>{description}</desc>
        <line
          x1={PADDING_LEFT}
          y1={PADDING_TOP}
          x2={PADDING_LEFT}
          y2={CHART_HEIGHT - PADDING_BOTTOM}
          stroke="#d4cab5"
          strokeWidth={1}
        />
        <line
          x1={PADDING_LEFT}
          y1={CHART_HEIGHT - PADDING_BOTTOM}
          x2={CHART_WIDTH - 8}
          y2={CHART_HEIGHT - PADDING_BOTTOM}
          stroke="#d4cab5"
          strokeWidth={1}
        />
        <text x={4} y={PADDING_TOP + 10} fontSize={12} fill="#6b6354">
          {formatCount(maxValue)}
        </text>
        <text x={4} y={CHART_HEIGHT - PADDING_BOTTOM} fontSize={12} fill="#6b6354">
          0
        </text>
        <text
          x={CHART_WIDTH - 8}
          y={PADDING_TOP + 10}
          fontSize={12}
          fill="#6b6354"
          textAnchor="end"
        >
          {unitLabel}
        </text>
        {points.map((point: TrendPoint, index: number): ReactElement => {
          const barHeight: number = (point.value / maxValue) * plotHeight;
          const x: number = PADDING_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
          const y: number = CHART_HEIGHT - PADDING_BOTTOM - barHeight;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#256143"
                rx={2}
              />
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT - PADDING_BOTTOM + 16}
                fontSize={12}
                fill="#6b6354"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export type FaqItem = {
  readonly question: string;
  readonly answer: string;
};

export type FaqBlockProps = {
  readonly items: readonly FaqItem[];
};

export function FaqBlock({ items }: FaqBlockProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-4">
      {items.map((item: FaqItem): ReactElement => (
        <div key={item.question} className="card">
          <h3 className="text-lg">{item.question}</h3>
          <p className="mt-2 text-bark-600">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}
