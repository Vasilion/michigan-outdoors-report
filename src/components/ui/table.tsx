import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/lib/cn";

export function TableWrap({ className, ...props }: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="table-wrap"
      className={cn(
        "border-border bg-card shadow-card w-full overflow-x-auto rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">): ReactElement {
  return (
    <table
      data-slot="table"
      className={cn("numeric w-full caption-bottom border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<"caption">): ReactElement {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "text-muted-foreground border-border border-t px-4 py-3 text-left text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: ComponentProps<"thead">): ReactElement {
  return (
    <thead data-slot="table-header" className={cn("bg-muted", className)} {...props} />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentProps<"tbody">): ReactElement {
  return <tbody data-slot="table-body" className={cn("", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">): ReactElement {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-border hover:bg-sand-50 border-b last:border-0", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">): ReactElement {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-bark-600 px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">): ReactElement {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-2.5 align-top", className)}
      {...props}
    />
  );
}

export function TableRowHeader({
  className,
  ...props
}: ComponentProps<"th">): ReactElement {
  return (
    <th
      data-slot="table-row-header"
      scope="row"
      className={cn("text-foreground px-4 py-2.5 text-left font-medium", className)}
      {...props}
    />
  );
}
