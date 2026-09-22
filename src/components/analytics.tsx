import type { ReactElement } from "react";

const MEASUREMENT_ID: string = process.env.NEXT_PUBLIC_GA_ID ?? "";

export function analyticsEnabled(): boolean {
  return /^G-[A-Z0-9]{6,}$/.test(MEASUREMENT_ID);
}

export function Analytics(): ReactElement | null {
  if (!analyticsEnabled()) {
    return null;
  }
  const bootstrap: string = [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js',new Date());",
    `gtag('config','${MEASUREMENT_ID}',{anonymize_ip:true});`,
  ].join("");
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      />
      <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
    </>
  );
}
