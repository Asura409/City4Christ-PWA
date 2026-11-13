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
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { data: [event] } }));
  await page.route(`**/api/v1/events/${event.id}`, (route) => route.fulfill({ json: { data: event } }));

  await page.goto("/#/events");

  await expect(page.getByRole("heading", { name: "Church Family Picnic", exact: true, level: 3 })).toBeVisible();
  await expect(page.getByText("Lunch and fellowship on the church grounds.")).toBeVisible();
  await expect(page.getByText("4 left", { exact: true })).toBeVisible();
  await expect(page.getByText("Design preview", { exact: false })).toHaveCount(0);

  await page.getByRole("link", { name: "Church Family Picnic", exact: true }).click();
  await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute(
    "href",
    `/api/v1/events/${event.id}/calendar.ics`,
  );
});

test("member RSVP sends attendeeCount and reflects the saved guest count", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const event = sampleEvent({ capacity: 6 });
  let saved = null;
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { data: [event] } }));
  await page.route(`**/api/v1/events/${event.id}`, (route) => route.fulfill({ json: { data: event } }));
  await page.route("**/api/v1/events/*/coordinators", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/events/*/rsvp", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const { attendeeCount } = route.request().postDataJSON();
    saved = { attendeeCount, myAttendeeCount: attendeeCount };
    await route.fulfill({ json: { data: { eventId: event.id, attendeeCount, updatedAt: new Date().toISOString() } } });
  });

  await page.goto("/#/events");
  await page.getByRole("link", { name: "Church Family Picnic", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Church Family Picnic" })).toBeVisible();
  await page.getByRole("button", { name: "Add a guest" }).click();
  await page.getByRole("button", { name: "Add a guest" }).click();
  await page.getByRole("button", { name: "Reserve 3 seats", exact: true }).click();

  await expect(page.getByText("You’re going")).toBeVisible();
  await expect(page.getByText("4 of 6 seats reserved")).toBeVisible();
  expect(saved.myAttendeeCount).toBe(3);
});

test("a capacity conflict stays visible and does not show a false RSVP success", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const event = sampleEvent({ capacity: 1, attendeeCount: 0 });
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { data: [event] } }));
  await page.route(`**/api/v1/events/${event.id}`, (route) => route.fulfill({ json: { data: event } }));
  await page.route("**/api/v1/events/*/coordinators", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/events/*/rsvp", (route) =>
    route.fulfill({
      status: 409,
      json: { error: { code: "event_full", message: "The event has no remaining capacity for that RSVP.", fields: {}, requestId: "event-full-test" } },
    }),
  );

  await page.goto("/#/events");
  await page.getByRole("link", { name: "Church Family Picnic", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Church Family Picnic" })).toBeVisible();
  await page.getByRole("button", { name: "Reserve 1 seat", exact: true }).click();

  await expect(page.getByRole("alert")).toContainText("no remaining capacity");
  await expect(page.getByRole("button", { name: "Reserve 1 seat", exact: true })).toBeVisible();
  await expect(page.getByText("You’re going")).toHaveCount(0);
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

  await page.goto("/#/admin/events");
  await expect(page.getByRole("heading", { name: "Manage church events" })).toBeVisible();
  await page.getByRole("button", { name: "+ New event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Community service day");
  await page.getByLabel(/Start time/).fill("2027-01-15T10:00");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByRole("heading", { name: "Community service day" })).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Community service and cleanup day");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Community service and cleanup day" })).toBeVisible();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByRole("article", { name: "Community service and cleanup day" })).toContainText("published");
});

test("event managers can assign and remove an eligible group coordinator", async ({ page }) => {
  await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "staff", scope: "" }],
      capabilities: [{ permission: "events.manage", scope: "" }],
    },
  });
  const event = sampleEvent({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  await page.route("**/api/v1/events", (route) => route.fulfill({ json: { data: [event] } }));
  await page.route("**/api/v1/admin/events**", (route) => route.fulfill({ json: { data: [event] } }));
  await page.route("**/api/v1/groups?**", (route) => route.fulfill({ json: { data: [{ id: "33333333-3333-4333-8333-333333333333", name: "Choir", audience: "church" }] } }));
  await page.route("**/api/v1/groups/*/members", (route) => route.fulfill({ json: { data: [{ accountId: "11111111-1111-4111-8111-111111111111", firstName: "Grace", lastName: "Member" }] } }));
  let coordinator = null;
  await page.route("**/api/v1/events/*/coordinators**", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: coordinator ? [coordinator] : [] } });
    if (route.request().method() === "PUT") {
      coordinator = { eventId: event.id, groupId: "33333333-3333-4333-8333-333333333333", groupName: "Choir", accountId: "11111111-1111-4111-8111-111111111111", firstName: "Grace", lastName: "Member" };
      return route.fulfill({ json: { data: coordinator } });
    }
    coordinator = null;
    return route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/#/admin/events");
  await page.getByRole("button", { name: "Coordinators", exact: true }).click();
  await page.getByLabel("Coordinator group").selectOption("33333333-3333-4333-8333-333333333333");
  await page.getByLabel("Event coordinator").selectOption("11111111-1111-4111-8111-111111111111");
  await page.getByRole("button", { name: "Assign coordinator" }).click();
  await expect(page.getByRole("dialog")).toContainText("Grace Member");
  await expect(page.getByRole("dialog")).toContainText("Choir");
  await page.getByRole("button", { name: "Remove Grace Member" }).click();
  await expect(page.getByRole("dialog").getByLabel("Assigned coordinators").getByText("Grace Member", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("article", { name: event.title })).toContainText("No coordinator assigned");
});

async function manageEvents(page, events) {
  await mocked(page, { signedIn: true, access: {
    roles: [{ role: "staff", scope: "" }],
    capabilities: [{ permission: "events.manage", scope: "" }],
  } });
  await page.route("**/api/v1/admin/events**", (route) => route.fulfill({ json: { data: events } }));
  await page.route("**/api/v1/events/*/coordinators", (route) => route.fulfill({ json: { data: [] } }));
}

test("compact event cards search and open an isolated coordinator popup", async ({ page }, testInfo) => {
  const first = sampleEvent({ title: "Church Bible Study" });
  const second = sampleEvent({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "IT Office Meeting" });
  await manageEvents(page, [first, second]);
  await page.goto("/#/admin/events");
  const firstCard = page.getByRole("article", { name: first.title, exact: true });
  const secondCard = page.getByRole("article", { name: second.title, exact: true });
  await expect(firstCard).toBeVisible();
  await expect(page.getByLabel("Coordinator group")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel event", exact: true })).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Create event" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search managed events" }).fill("Bible");
  await expect(secondCard).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search managed events" }).fill("");
  await firstCard.getByRole("button", { name: "Coordinators", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Coordinators", exact: true });
  await expect(dialog).toContainText(first.title);
  await page.getByLabel("Coordinator group").selectOption("33333333-3333-4333-8333-333333333333");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(firstCard.getByRole("button", { name: "Coordinators", exact: true })).toBeFocused();
  await secondCard.getByRole("button", { name: "Coordinators", exact: true }).click();
  await expect(dialog).toContainText(second.title);
  await expect(page.getByLabel("Coordinator group")).toHaveValue("");
  await expect(page.getByLabel("Event coordinator")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Assign coordinator", exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("coordinators.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("event-list.png"), fullPage: true });
});

test("event cancellation requires confirmation and retains errors for retry", async ({ page }) => {
  const event = sampleEvent();
  await manageEvents(page, [event]);
  let cancellations = 0;
  await page.route(`**/api/v1/admin/events/${event.id}`, (route) => {
    cancellations++;
    expect(route.request().postDataJSON()).toMatchObject({ status: "cancelled", version: event.version });
    return route.fulfill({ status: 409, json: { error: { code: "conflict", message: "This event changed. Please reopen it.", fields: {} } } });
  });
  await page.goto("/#/admin/events");
  await page.getByLabel(`More actions for ${event.title}`).click();
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel event?", exact: true });
  await expect(dialog).toBeVisible();
  expect(cancellations).toBe(0);
  await dialog.getByRole("button", { name: "Keep event" }).click();
  expect(cancellations).toBe(0);
  await page.getByLabel(`More actions for ${event.title}`).click();
  await page.getByRole("button", { name: "Cancel event", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel event", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("This event changed");
  expect(cancellations).toBe(1);
  await expect(dialog.getByRole("button", { name: "Cancel event", exact: true })).toBeEnabled();
});

test("changing groups ignores a late member response and assignment failures stay in the popup", async ({ page }) => {
  const event = sampleEvent();
  await manageEvents(page, [event]);
  const choir = "33333333-3333-4333-8333-333333333333", youth = "55555555-5555-4555-8555-555555555555";
  await page.route("**/api/v1/groups?**", (route) => route.fulfill({ json: { data: [
    { id: choir, name: "Choir", audience: "church" }, { id: youth, name: "Youth", audience: "church" },
  ] } }));
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route(`**/api/v1/groups/${choir}/members`, async (route) => {
    await pending;
    await route.fulfill({ json: { data: [{ accountId: "old", firstName: "Old", lastName: "Member", status: "active" }] } });
  });
  await page.route(`**/api/v1/groups/${youth}/members`, (route) => route.fulfill({ json: { data: [
    { accountId: "new", firstName: "Youth", lastName: "Member", status: "active" },
    { accountId: "inactive", firstName: "Inactive", lastName: "Member", status: "removed" },
  ] } }));
  await page.route(`**/api/v1/events/${event.id}/coordinators`, (route) => route.request().method() === "PUT"
    ? route.fulfill({ status: 403, json: { error: { code: "forbidden", message: "This member is no longer eligible.", fields: {} } } })
    : route.fulfill({ json: { data: [] } }));
  await page.goto("/#/admin/events");
  await page.getByRole("button", { name: "Coordinators", exact: true }).click();
  const started = page.waitForRequest(`**/api/v1/groups/${choir}/members`);
  await page.getByLabel("Coordinator group").selectOption(choir);
  await started;
  await page.getByLabel("Coordinator group").selectOption(youth);
  await expect(page.getByLabel("Event coordinator").getByRole("option", { name: "Youth Member" })).toHaveCount(1);
  const oldResponse = page.waitForResponse(`**/api/v1/groups/${choir}/members`);
  release();
  await oldResponse;
  await expect(page.getByLabel("Event coordinator").getByRole("option", { name: "Old Member" })).toHaveCount(0);
  await expect(page.getByLabel("Event coordinator").getByRole("option", { name: "Inactive Member" })).toHaveCount(0);
  await page.getByLabel("Event coordinator").selectOption("new");
  await page.getByRole("button", { name: "Assign coordinator", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("no longer eligible");
  await expect(page.getByRole("button", { name: "Assign coordinator", exact: true })).toBeEnabled();
});
