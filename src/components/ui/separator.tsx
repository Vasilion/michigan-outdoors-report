import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/cn";

export function Separator({ className, ...props }: ComponentProps<"hr">): ReactElement {
  return (
    <hr
      data-slot="separator"
      className={cn("border-border my-8 border-t", className)}
      {...props}
    />
  );
}
