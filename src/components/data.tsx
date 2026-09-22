import type { ReactElement, ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
  TableWrap,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export type TableColumn = {
  readonly key: string;
  readonly label: string;
  readonly numeric?: boolean;
};

export type TableCellValue = ReactNode;
export type TableRowData = Readonly<Record<string, TableCellValue>>;

export type DataTableProps = {
  readonly caption: string;
  readonly columns: readonly TableColumn[];
  readonly rows: readonly TableRowData[];
};

export function DataTable({ caption, columns, rows }: DataTableProps): ReactElement {
  const firstColumn: TableColumn = columns[0] as TableColumn;
  return (
    <TableWrap>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column: TableColumn): ReactElement => (
              <TableHead
                key={column.key}
                scope="col"
                className={column.numeric === true ? "text-right" : undefined}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: TableRowData, rowIndex: number): ReactElement => (
            <TableRow key={rowIndex}>
              <TableRowHeader>{row[firstColumn.key] ?? ""}</TableRowHeader>
              {columns.slice(1).map((column: TableColumn): ReactElement => (
                <TableCell
                  key={column.key}
                  className={column.numeric === true ? "text-right" : undefined}
                >
                  {row[column.key] ?? ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>{caption}</TableCaption>
      </Table>
    </TableWrap>
  );
}

export type TrendPoint = {
  readonly label: string;
  readonly value: number;
  readonly muted?: boolean;
};

export type TrendChartProps = {
  readonly title: string;
  readonly unitLabel: string;
  readonly points: readonly TrendPoint[];
  readonly className?: string;
};

const CHART_WIDTH: number = 720;
const CHART_HEIGHT: number = 230;
const PADDING_LEFT: number = 58;
const PADDING_BOTTOM: number = 30;
const PADDING_TOP: number = 20;

export function TrendChart({
  title,
  unitLabel,
  points,
  className,
}: TrendChartProps): ReactElement | null {
  if (points.length === 0) {
    return null;
  }
  const maxValue: number = Math.max(
    ...points.map((point: TrendPoint): number => point.value),
    1,
  );
  const plotWidth: number = CHART_WIDTH - PADDING_LEFT - 10;
  const plotHeight: number = CHART_HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const slotWidth: number = plotWidth / points.length;
  const barWidth: number = Math.max(8, Math.min(76, slotWidth * 0.62));
  const description: string = points
    .map((point: TrendPoint): string => `${point.label}: ${formatCount(point.value)}`)
    .join(", ");
  const gridValues: readonly number[] = [0.25, 0.5, 0.75, 1];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="pb-4">
        <figure>
          <figcaption className="text-muted-foreground text-sm">{title}</figcaption>
          <svg
            role="img"
            aria-label={`${title}. ${description}.`}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="mt-3 block h-auto w-full"
          >
            <title>{title}</title>
            <desc>{description}</desc>
            {gridValues.map((fraction: number): ReactElement => {
              const y: number = CHART_HEIGHT - PADDING_BOTTOM - fraction * plotHeight;
              return (
                <g key={fraction}>
                  <line
                    x1={PADDING_LEFT}
                    y1={y}
                    x2={CHART_WIDTH - 10}
                    y2={y}
                    stroke="#e8e1d3"
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING_LEFT - 8}
                    y={y + 4}
                    fontSize={11}
                    fill="#7a7062"
                    textAnchor="end"
                  >
                    {formatCount(Math.round(maxValue * fraction))}
                  </text>
                </g>
              );
            })}
            <line
              x1={PADDING_LEFT}
              y1={CHART_HEIGHT - PADDING_BOTTOM}
              x2={CHART_WIDTH - 10}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke="#d6ccb8"
              strokeWidth={1}
            />
            {points.map((point: TrendPoint, index: number): ReactElement => {
              const barHeight: number = Math.max(
                2,
                (point.value / maxValue) * plotHeight,
              );
              const x: number =
                PADDING_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
              const y: number = CHART_HEIGHT - PADDING_BOTTOM - barHeight;
              return (
                <g key={point.label}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={point.muted === true ? "#a9d3ba" : "#1f5a3c"}
                    rx={3}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    fontSize={11}
                    fill="#453d31"
                    textAnchor="middle"
                  >
                    {formatCount(point.value)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={CHART_HEIGHT - PADDING_BOTTOM + 16}
                    fontSize={12}
                    fill="#5c5344"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="eyebrow mt-1">{unitLabel}</p>
        </figure>
      </CardContent>
    </Card>
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
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item: FaqItem): ReactElement => (
        <Card key={item.question}>
          <CardContent>
            <h3 className="flex items-start gap-2 text-base leading-snug font-semibold">
              <HelpCircle
                aria-hidden="true"
                className="text-pine-500 mt-0.5 h-4 w-4 shrink-0"
              />
              {item.question}
            </h3>
            <p className="text-bark-600 mt-2 text-sm leading-relaxed">{item.answer}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
