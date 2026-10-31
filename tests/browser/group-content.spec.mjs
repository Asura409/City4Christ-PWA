import { test, expect } from "@playwright/test";
import { mocked, GROUP } from "./fixtures/api.mjs";
test("active member opens a group-only feed and creates a group post", async ({
  page,
}) => {
  await mocked(page, { signedIn: true, activeGroupMembership: true });
  const calls = [];
  let items = [];
  await page.route("**/api/v1/posts**", async (route) => {
    const r = route.request(),
      u = new URL(r.url());
    calls.push({
      method: r.method(),
      groupId: u.searchParams.get("groupId"),
      body: r.postDataJSON(),
    });
    if (r.method() === "POST") {
      items = [
        {
          id: "77777777-7777-4777-8777-777777777777",
          groupId: GROUP,
          authorId: "11111111-1111-4111-8111-111111111111",
          firstName: "Grace",
          lastName: "Member",
          body: r.postDataJSON().body,
          createdAt: new Date().toISOString(),
          attachments: [],
          amenCount: 0,
          commentCount: 0,
        },
      ];
      return route.fulfill({ status: 201, json: { data: items[0] } });
    }
    return route.fulfill({ json: { data: items, meta: {} } });
  });
  await page.goto(`/#/groups/${GROUP}`);
  await page.getByRole("link", { name: "Group posts", exact: true }).click();
  await page.getByLabel("Group post text").fill("Synthetic choir update");
  await page
    .getByRole("button", { name: "Share with group", exact: true })
    .click();
  await expect(
    page.getByText("Synthetic choir update", { exact: true }),
  ).toBeVisible();
  expect(
    calls.some((c) => c.method === "POST" && c.body.groupId === GROUP),
  ).toBe(true);
  expect(calls.some((c) => c.method === "GET" && c.groupId === GROUP)).toBe(
    true,
  );
});
test("group-scoped leader can create an event only in the selected group", async ({
  page,
}) => {
  await mocked(page, {
    signedIn: true,
    access: {
      roles: [{ role: "ministry_leader", scope: GROUP }],
      capabilities: [{ permission: "ministry.members.manage", scope: GROUP }],
    },
  });
  let created;
  await page.route("**/api/v1/admin/events**", (r) => {
    if (r.request().method() === "POST") {
      created = r.request().postDataJSON();
      return r.fulfill({
        status: 201,
        json: {
          data: {
            id: "88888888-8888-4888-8888-888888888888",
            ...created,
            status: "draft",
            version: 1,
          },
        },
      });
    }
    return r.fulfill({ json: { data: [] } });
  });
  await page.route("**/api/v1/events?**", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.goto(`/#/groups/${GROUP}/events`);
  const form = page.getByRole("form", { name: "Create event" });
  await form.getByLabel("Title", { exact: true }).fill("Choir practice");
  await form.getByLabel(/Start time in/).fill("2030-01-01T12:00");
  await form.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect.poll(() => created?.groupId).toBe(GROUP);
});

test("nonmember group feed denial hides the group composer", async ({
  page,
}) => {
  await mocked(page, { signedIn: true });
  await page.route("**/api/v1/posts?**", (r) =>
    r.fulfill({
      status: 404,
      json: {
        error: {
          code: "post_not_found",
          message: "Group content is unavailable.",
        },
      },
    }),
  );
  await page.goto(`/#/groups/${GROUP}/posts`);
  await expect(page.getByRole("alert")).toContainText(
    "Group content is unavailable.",
  );
  await expect(
    page.getByRole("form", { name: "Group post", exact: true }),
  ).toHaveCount(0);
});
test("open group composer retains its private audience when the route changes", async ({
  page,
}) => {
  await mocked(page, { signedIn: true, activeGroupMembership: true });
  await page.route("**/api/v1/posts?**", (r) =>
    r.fulfill({ json: { data: [], meta: {} } }),
  );
  await page.goto(`/#/groups/${GROUP}/posts`);
  await page
    .getByRole("button", { name: "Create a post", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sharing with this group",
  );
  await page.evaluate(() => (location.hash = "#/posts"));
  await expect(
    page.getByRole("heading", { name: "Church community", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "Sharing with this group",
  );
  await page
    .getByRole("dialog")
    .getByLabel("Your message")
    .fill("Private group draft");
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/v1/posts") && r.method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Share", exact: true })
    .click();
  expect((await request).postDataJSON().groupId).toBe(GROUP);
});
