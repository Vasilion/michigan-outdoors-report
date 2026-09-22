import type { ComponentProps, ReactElement } from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const alertVariants = cva("rounded-xl border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-bark-700",
      notice: "border-blaze-200 bg-blaze-100 text-blaze-700",
      info: "border-lake-300 bg-lake-100 text-lake-800",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export function Alert({ className, variant, ...props }: AlertProps): ReactElement {
  return (
    <div
      data-slot="alert"
      role="note"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
