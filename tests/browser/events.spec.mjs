import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

function sampleEvent(overrides = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Church Family Picnic",
    description: "Lunch and fellowship on the church grounds.",
    location: "Church grounds",
    startsAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    timeZone: "Africa/Lagos",
    capacity: 5,
    attendeeCount: 1,
    myAttendeeCount: 0,
    status: "published",
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("public event page loads published events from the API", async ({ page }) => {
  await mocked(page);
  const event = sampleEvent();
  await page.route("**/api/v1/events", (route) =>
    route.fulfill({ json: { data: [event] } }),
  );

  await page.goto("/#/events");

  await expect(
    page.getByRole("heading", { name: "Church Family Picnic", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Lunch and fellowship on the church grounds.")).toBeVisible();
  await expect(page.getByText("1 / 5 seats reserved")).toBeVisible();
  await expect(page.getByText("Design preview", { exact: false })).toHaveCount(0);
});

test("member RSVP sends attendeeCount and reflects the saved guest count", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const event = sampleEvent({ capacity: 6 });
  let saved = null;
  await page.route("**/api/v1/events", (route) =>
    route.fulfill({ json: { data: [saved ? { ...event, ...saved } : event] } }),
  );
  await page.route("**/api/v1/events/*/rsvp", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const { attendeeCount } = route.request().postDataJSON();
    saved = { attendeeCount: attendeeCount + 1, myAttendeeCount: attendeeCount };
    await route.fulfill({
      json: {
        data: {
          eventId: event.id,
          attendeeCount,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });

  await page.goto("/#/events");
  await expect(page.getByRole("heading", { name: "Church Family Picnic" })).toBeVisible();
  await page.getByLabel("You and your guests").selectOption("3");
  await page.getByRole("button", { name: "RSVP", exact: true }).click();

  await expect(page.getByText("Your RSVP: 3 attendees")).toBeVisible();
  await expect(page.getByText("4 / 6 seats reserved")).toBeVisible();
});

test("a capacity conflict stays visible and does not show a false RSVP success", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const event = sampleEvent({ capacity: 1, attendeeCount: 0 });
  await page.route("**/api/v1/events", (route) =>
    route.fulfill({ json: { data: [event] } }),
  );
  await page.route("**/api/v1/events/*/rsvp", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: {
          code: "event_full",
          message: "The event has no remaining capacity for that RSVP.",
          fields: {},
          requestId: "event-full-test",
        },
      },
    }),
  );

  await page.goto("/#/events");
  await expect(page.getByRole("heading", { name: "Church Family Picnic" })).toBeVisible();
  await page.getByRole("button", { name: "RSVP", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("no remaining capacity");
  await expect(page.getByRole("button", { name: "RSVP", exact: true })).toBeVisible();
  await expect(page.getByText("Your RSVP:")).toHaveCount(0);
});

test("event managers can create a draft and publish it", async ({ page }) => {
  await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "staff", scope: "" }],
      capabilities: [{ permission: "events.manage", scope: "" }],
    },
  });
  let managed = [];
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/admin/events**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { data: managed } });
    const body = request.postDataJSON();
    if (request.method() === "POST") {
      const created = { ...sampleEvent(), ...body, status: "draft", version: 1 };
      managed = [created];
      return route.fulfill({ status: 201, json: { data: created } });
    }
    const id = new URL(request.url()).pathname.split("/").at(-1);
    managed = managed.map((item) => item.id === id ? { ...item, ...body, version: item.version + 1 } : item);
    return route.fulfill({ json: { data: managed[0] } });
  });

  await page.goto("/#/events");
  await expect(page.getByRole("heading", { name: "Manage church events" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Community service day");
  await page.getByLabel(/Start time/).fill("2027-01-15T10:00");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByRole("heading", { name: "Community service day" })).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Community service and cleanup day");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Community service and cleanup day" })).toBeVisible();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("published · 1 reserved")).toBeVisible();
});
