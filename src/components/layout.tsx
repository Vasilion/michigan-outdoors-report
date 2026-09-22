import Link from "next/link";
import type { ComponentType, ReactElement, ReactNode, SVGProps } from "react";
import { ChevronRight, Compass, ExternalLink } from "lucide-react";
import { SITE } from "@/lib/site";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/alert";

export type NavItem = {
  readonly label: string;
  readonly href: string;
};

const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Counties", href: "/#counties" },
  { label: "Deer harvest", href: "/hunting/deer/" },
  { label: "Seasons", href: "/seasons/" },
  { label: "Data", href: "/data/" },
  { label: "Methodology", href: "/methodology/" },
];

const FOOTER_NAV: readonly NavItem[] = [
  { label: "About", href: "/about/" },
  { label: "Methodology", href: "/methodology/" },
  { label: "Data downloads", href: "/data/" },
  { label: "Deer harvest", href: "/hunting/deer/" },
  { label: "Season dates", href: "/seasons/" },
  { label: "Advertise", href: "/advertise/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
];

export function SiteHeader(): ReactElement {
  return (
    <header className="bg-pine-900 text-pine-100 border-pine-800 border-b">
      <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3.5">
        <Link
          href="/"
          prefetch={false}
          className="group flex items-center gap-2.5 text-white no-underline"
        >
          <Compass aria-hidden="true" className="text-pine-400 h-5 w-5" />
          <span className="font-display text-lg leading-none font-semibold tracking-tight">
            Michigan Outdoors Report
          </span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            {PRIMARY_NAV.map((item: NavItem): ReactElement => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="text-pine-100 hover:text-blaze-200 no-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter(): ReactElement {
  const year: number = 2026;
  return (
    <footer className="bg-pine-950 mt-20 text-sand-200">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1.3fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Compass aria-hidden="true" className="text-pine-400 h-5 w-5" />
            <p className="font-display text-lg text-white">{SITE.name}</p>
          </div>
          <p className="text-sand-300 mt-3 max-w-[40ch] text-sm">{SITE.tagline}</p>
          <p className="text-bark-400 mt-4 text-sm">
            {"© "}
            {year} {SITE.owner}
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow text-sand-300">Site</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {FOOTER_NAV.map((item: NavItem): ReactElement => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="text-sand-200 hover:text-blaze-200 no-underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="eyebrow text-sand-300">Not the DNR</p>
          <p className="text-sand-300 mt-3 text-sm">{SITE.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}

export type BreadcrumbItem = {
  readonly name: string;
  readonly path: string;
};

export type BreadcrumbsProps = {
  readonly items: readonly BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground py-5 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item: BreadcrumbItem, index: number): ReactElement => {
          const isLast: boolean = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-bark-600">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  prefetch={false}
                  className="no-underline hover:underline"
                >
                  {item.name}
                </Link>
              )}
              {isLast ? null : (
                <ChevronRight aria-hidden="true" className="text-bark-400 h-3.5 w-3.5" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type AnswerSummaryProps = {
  readonly text: string;
};

export function AnswerSummary({ text }: AnswerSummaryProps): ReactElement {
  return (
    <div className="border-blaze-500 bg-card shadow-card rounded-r-xl border-l-4 py-4 pr-5 pl-5">
      <p className="text-bark-700 text-lg leading-relaxed text-pretty">{text}</p>
    </div>
  );
}

export type LastUpdatedProps = {
  readonly isoDate: string;
};

export function LastUpdated({ isoDate }: LastUpdatedProps): ReactElement {
  return (
    <p className="text-muted-foreground text-sm">
      Last updated <time dateTime={isoDate}>{formatLongDate(isoDate)}</time>
    </p>
  );
}

export type SourceNoteProps = {
  readonly label: string;
  readonly href: string;
  readonly retrieved: string;
};

export function SourceNote({ label, href, retrieved }: SourceNoteProps): ReactElement {
  return (
    <p className="text-muted-foreground text-sm">
      Source:{" "}
      <a href={href} rel="noopener" className="inline-flex items-center gap-1">
        {label}
        <ExternalLink aria-hidden="true" className="h-3 w-3" />
      </a>
      , retrieved <time dateTime={retrieved}>{formatLongDate(retrieved)}</time>.
    </p>
  );
}

export type SectionProps = {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ComponentType<SVGProps<SVGSVGElement>>;
  readonly className?: string;
  readonly children: ReactNode;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  icon: Icon,
  className,
  children,
}: SectionProps): ReactElement {
  return (
    <section id={id} className={cn("mt-14 scroll-mt-8", className)}>
      {eyebrow === undefined ? null : <p className="eyebrow">{eyebrow}</p>}
      <div className="flex items-center gap-2.5">
        {Icon === undefined ? null : (
          <Icon aria-hidden="true" className="text-pine-600 h-6 w-6 shrink-0" />
        )}
        <h2 className="text-2xl">{title}</h2>
      </div>
      {description === undefined ? null : (
        <p className="text-muted-foreground mt-2 max-w-[70ch]">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export type VerifyNoticeProps = {
  readonly href: string;
  readonly children?: ReactNode;
};

export function VerifyNotice({ href, children }: VerifyNoticeProps): ReactElement {
  return (
    <Alert variant="notice" className="mt-4">
      {children ?? "Season dates and rules here are a summary, not the regulation."}{" "}
      <a href={href} rel="noopener" className="font-semibold">
        Verify with the official Michigan DNR regulations
      </a>{" "}
      before you hunt.
    </Alert>
  );
}

export type PageIntroProps = {
  readonly children: ReactNode;
};

export function PageIntro({ children }: PageIntroProps): ReactElement {
  return <div className="prose-block text-bark-700 mt-6">{children}</div>;
}

export function siteDisclaimer(): string {
  return SITE.disclaimer;
}
