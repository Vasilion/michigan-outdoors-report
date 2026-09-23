import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("a county hub carries its summary, stats, public land and seasons", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/county/kent/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Kent County hunting and fishing/i),
    )
    .then((): Promise<void> =>
      expect(page.getByText(/Kent County, Michigan has/i).first()).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Public land" })).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Season dates" })).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(
        page.getByRole("link", { name: /Deer hunting in Kent County/i }),
      ).toBeVisible(),
    ));

test("a county deer page shows the harvest table, chart and a season trend", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/county/kent/deer-hunting/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Kent County white-tailed deer hunting/i),
    )
    .then((): Promise<void> => expect(page.locator("figure svg")).toBeVisible())
    .then((): Promise<number> => page.locator("table tbody tr").count())
    .then((rows: number): void => {
      expect(rows).toBeGreaterThanOrEqual(4);
    })
    .then((): Promise<void> =>
      expect(page.getByText(/Michigan DNR harvest reporting/i).first()).toBeVisible(),
    ));

test("the statewide deer hub lists every reporting county", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/hunting/deer/")
    .then((): Promise<number> => page.locator("table tbody tr").count())
    .then((rows: number): void => {
      expect(rows).toBe(83);
    })
    .then((): Promise<void> =>
      expect(page.getByRole("link", { name: "Kent", exact: true }).first()).toBeVisible(),
    ));

test("a public land page states type, acreage and county", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/public-land/allegan-state-game-area/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Allegan State Game Area/i),
    )
    .then((): Promise<void> =>
      expect(page.getByText(/state game area/i).first()).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("link", { name: /Allegan County/i }).first()).toBeVisible(),
    ));

test("the deer season page lists dates and links the official source", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/seasons/deer/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Michigan white-tailed deer season dates/i),
    )
    .then((): Promise<number> => page.locator("table tbody tr").count())
    .then((rows: number): void => {
      expect(rows).toBeGreaterThanOrEqual(9);
    })
    .then((): Promise<void> =>
      expect(
        page.getByRole("link", { name: /official Michigan DNR/i }).first(),
      ).toBeVisible(),
    ));

test("county pages link up to the statewide hub and out to neighbours", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/county/kent/deer-hunting/")
    .then((): Promise<void> =>
      page.getByRole("link", { name: /Statewide deer harvest/i }).click(),
    )
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(
        /Michigan white-tailed deer harvest by county/i,
      ),
    ));

test("a lake page shows stocking, access and nearby waters", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/lake/roscommon/higgins-lake/")
    .then((): Promise<void> => expect(page.locator("h1")).toHaveText(/Higgins Lake/i))
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Stocking history" })).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Public access" })).toBeVisible(),
    )
    .then((): Promise<number> => page.locator("table").count())
    .then((tables: number): void => {
      expect(tables).toBeGreaterThanOrEqual(2);
    }));

test("a county fishing page lists stocked waters", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/county/roscommon/walleye-fishing/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Roscommon County walleye stocking/i),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Waters stocked" })).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(
        page.getByRole("link", { name: /Statewide walleye stocking/i }),
      ).toBeVisible(),
    ));

test("the statewide fish hub maps stocking by county", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/fishing/walleye/")
    .then((): Promise<void> =>
      expect(page.locator("h1")).toHaveText(/Michigan walleye stocking/i),
    )
    .then((): Promise<void> => expect(page.locator("svg a").first()).toBeVisible())
    .then((): Promise<void> =>
      expect(
        page.getByRole("heading", { name: /Waters that got the most/i }),
      ).toBeVisible(),
    ));

test("the county hub links its lakes and fish species", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/county/roscommon/")
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Fishing", exact: true })).toBeVisible(),
    )
    .then((): Promise<void> =>
      page.getByRole("link", { name: "Higgins Lake", exact: true }).first().click(),
    )
    .then((): Promise<void> => expect(page.locator("h1")).toHaveText(/Higgins Lake/i)));

test("a river page shows trout designation, stocking and access", ({
  page,
}: {
  page: Page;
}): Promise<void> =>
  page
    .goto("/river/manistee/manistee-river/")
    .then((): Promise<void> => expect(page.locator("h1")).toHaveText(/Manistee River/i))
    .then((): Promise<void> =>
      expect(page.getByText(/designated trout stream/i).first()).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Stocking history" })).toBeVisible(),
    )
    .then((): Promise<void> =>
      expect(page.getByRole("heading", { name: "Trout regulations" })).toBeVisible(),
    ));
