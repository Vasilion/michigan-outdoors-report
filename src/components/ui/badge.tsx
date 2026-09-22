import type { ComponentProps, ReactElement } from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-pine-100 text-pine-800",
        open: "border-transparent bg-pine-600 text-white",
        upcoming: "border-transparent bg-blaze-100 text-blaze-700",
        closed: "border-border bg-muted text-bark-600",
        accent: "border-transparent bg-blaze-600 text-white",
        outline: "border-border bg-card text-bark-600",
        live: "border-transparent bg-lake-100 text-lake-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps): ReactElement {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
