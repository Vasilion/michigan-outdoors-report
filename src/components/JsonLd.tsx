import type { ReactElement } from "react";
import type { Thing, WithContext } from "schema-dts";

export type JsonLdProps = {
  readonly schemas: readonly WithContext<Thing>[];
};

export function JsonLd({ schemas }: JsonLdProps): ReactElement {
  return (
    <>
      {schemas.map((schema: WithContext<Thing>, index: number): ReactElement => {
        const json: string = JSON.stringify(schema).replace(/</g, "\\u003c");
        return (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        );
      })}
    </>
  );
}
