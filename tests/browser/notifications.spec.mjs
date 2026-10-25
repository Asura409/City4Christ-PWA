import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";

test("members open a private notification and mark it read", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const notice = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    kind: "event.coordinator_assigned",
    title: "Event coordinator assigned",
    body: "You have been assigned to coordinate: Choir Anniversary",
    resourcePath: "/#/events",
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  let unread = 1;
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { data: { unreadCount: unread } } }),
  );
  await page.route("**/api/v1/notifications?**", (route) =>
    route.fulfill({ json: { data: [{ ...notice, readAt: unread ? null : new Date().toISOString() }], meta: { nextCursor: "" } } }),
  );
  await page.route("**/api/v1/notifications/*/read", async (route) => {
    unread = 0;
    await route.fulfill({ json: { data: { changed: true } } });
  });

  await page.goto("/#/home");
  const bell = page.getByRole("button", { name: "Notifications, 1 unread" });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText("Event coordinator assigned")).toBeVisible();
  await expect(page.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/#/events");
  await page.getByRole("button", { name: "Mark read" }).click();
  await expect(page.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});
