import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { SITE } from "@/lib/site";
import { formatLongDate } from "@/lib/format";

export type NavItem = {
  readonly label: string;
  readonly href: string;
};

const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Counties", href: "/#counties" },
  { label: "Hunting", href: "/#hunting" },
  { label: "Fishing", href: "/#fishing" },
  { label: "Seasons", href: "/seasons/" },
  { label: "Directory", href: "/#directory" },
  { label: "Data", href: "/data/" },
];

const FOOTER_NAV: readonly NavItem[] = [
  { label: "About", href: "/about/" },
  { label: "Methodology", href: "/methodology/" },
  { label: "Data downloads", href: "/data/" },
  { label: "Advertise", href: "/advertise/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
];

export function SiteHeader(): ReactElement {
  return (
    <header className="border-b border-sand-200 bg-pine-900 text-sand-100">
      <div className="wrap flex flex-wrap items-center justify-between gap-4 py-4">
        <Link
          href="/"
          prefetch={false}
          className="font-display text-xl font-semibold text-white no-underline"
        >
          Michigan Outdoors Report
        </Link>
        <nav aria-label="Primary">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {PRIMARY_NAV.map((item: NavItem): ReactElement => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="text-sand-100 no-underline hover:text-blaze-100"
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
    <footer className="mt-16 border-t border-sand-200 bg-sand-100">
      <div className="wrap grid gap-8 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-pine-900">{SITE.name}</p>
          <p className="mt-2 text-sm text-bark-500">{SITE.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {FOOTER_NAV.map((item: NavItem): ReactElement => (
              <li key={item.href}>
                <Link href={item.href} prefetch={false}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm text-bark-500">
          <p>{SITE.disclaimer}</p>
          <p className="mt-3">
            {"© "}
            {year} {SITE.owner}
          </p>
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
    <nav aria-label="Breadcrumb" className="py-4 text-sm text-bark-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item: BreadcrumbItem, index: number): ReactElement => {
          const isLast: boolean = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path} prefetch={false}>
                  {item.name}
                </Link>
              )}
              {isLast ? null : <span aria-hidden="true">/</span>}
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
    <div className="rounded-xl border-l-4 border-blaze-500 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-lg leading-relaxed text-bark-700">{text}</p>
    </div>
  );
}

export type LastUpdatedProps = {
  readonly isoDate: string;
};

export function LastUpdated({ isoDate }: LastUpdatedProps): ReactElement {
  return (
    <p className="text-sm text-bark-500">
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
    <p className="text-sm text-bark-500">
      Source:{" "}
      <a href={href} rel="noopener">
        {label}
      </a>
      , retrieved <time dateTime={retrieved}>{formatLongDate(retrieved)}</time>.
    </p>
  );
}

export type SectionProps = {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
};

export function Section({
  id,
  title,
  description,
  children,
}: SectionProps): ReactElement {
  return (
    <section id={id} className="mt-12">
      <h2 className="text-2xl">{title}</h2>
      {description === undefined ? null : (
        <p className="mt-2 max-w-[68ch] text-bark-600">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type QuickFact = {
  readonly label: string;
  readonly value: string;
};

export type QuickFactsProps = {
  readonly facts: readonly QuickFact[];
};

export function QuickFacts({ facts }: QuickFactsProps): ReactElement {
  return (
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {facts.map((fact: QuickFact): ReactElement => (
        <div key={fact.label} className="card">
          <dt className="text-xs uppercase tracking-wide text-bark-500">{fact.label}</dt>
          <dd className="mt-1 font-display text-2xl text-pine-800">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
