import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground border-border shadow-card flex flex-col rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-5 pt-5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">): ReactElement {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg leading-snug font-semibold", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"p">): ReactElement {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div data-slot="card-content" className={cn("px-5 py-5", className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "border-border flex items-center gap-3 border-t px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
