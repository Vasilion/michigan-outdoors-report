import type { ComponentType, ReactElement, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

export type StatProps = {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly icon?: ComponentType<SVGProps<SVGSVGElement>>;
  readonly tone?: "default" | "accent";
  readonly className?: string;
};

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  className,
}: StatProps): ReactElement {
  return (
    <div
      data-slot="stat"
      className={cn(
        "bg-card border-border shadow-card rounded-xl border px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon === undefined ? null : (
          <Icon
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "accent" ? "text-blaze-600" : "text-pine-600",
            )}
          />
        )}
        <p className="eyebrow">{label}</p>
      </div>
      <p
        className={cn(
          "numeric font-display mt-2 text-3xl leading-none",
          tone === "accent" ? "text-blaze-600" : "text-pine-800",
        )}
      >
        {value}
      </p>
      {hint === undefined ? null : (
        <p className="text-muted-foreground mt-1.5 text-sm">{hint}</p>
      )}
    </div>
  );
}

export type StatGridProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function StatGrid({ children, className }: StatGridProps): ReactElement {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {children}
    </div>
  );
}
