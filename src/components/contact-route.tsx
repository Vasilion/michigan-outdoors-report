import type { ReactElement } from "react";
import { SITE } from "@/lib/site";

export type ContactRouteProps = {
  readonly purpose: string;
};

export function ContactRoute({ purpose }: ContactRouteProps): ReactElement {
  if (SITE.contactEmail !== null) {
    return (
      <p>
        {purpose} <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    );
  }
  return (
    <p>
      {purpose}{" "}
      <a href={`${SITE.repoUrl}/issues/new`} rel="noopener">
        open an issue on the public repository
      </a>
      . Every page on this site is generated from data in that repository, so a correction
      filed there is the fastest route to a fix.
    </p>
  );
}
