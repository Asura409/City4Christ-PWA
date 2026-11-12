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
  await expect(page.getByRole("link", { name: /Event coordinator assigned/ })).toHaveAttribute("href", "/#/events");
  await page.getByRole("button", { name: "Mark Event coordinator assigned as read" }).click();
  await expect(page.getByRole("button", { name: "Mark Event coordinator assigned as read" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});
test("notifications fit a 320px phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mocked(page, { signedIn: true });
  const notice = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    kind: "event.coordinator_assigned",
    title: "A very long event coordinator assignment title that must wrap cleanly",
    body: "This longer notification body checks that the message wraps inside the row without pushing the page sideways on a small phone.",
    resourcePath: "/#/events",
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { data: { unreadCount: 1 } } }),
  );
  await page.route("**/api/v1/notifications?**", (route) =>
    route.fulfill({ json: { data: [notice], meta: { nextCursor: "" } } }),
  );
  await page.goto("/#/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  const overflow = await page.evaluate(() => {
    const screen = document.querySelector(".notif-screen");
    return Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      screen?.scrollWidth || 0,
    ) > window.innerWidth + 1;
  });
  expect(overflow).toBe(false);
});
test("unread notifications float on login and open their destination", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const notice = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    kind: "event.coordinator_assigned",
    title: "Event coordinator assigned",
    body: "You have been assigned to coordinate: Choir Anniversary",
    resourcePath: "/#/events",
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  let marked = 0;
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({ json: { data: { unreadCount: 1 } } }),
  );
  await page.route("**/api/v1/notifications?**", (route) =>
    route.fulfill({ json: { data: [notice], meta: { nextCursor: "" } } }),
  );
  await page.route("**/api/v1/notifications/*/read", (route) => {
    marked++;
    return route.fulfill({ json: { data: { changed: true } } });
  });
  await page.goto("/#/home");
  const toast = page.locator(".notification-toast");
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Event coordinator assigned");
  await toast.getByRole("button", { name: /Event coordinator assigned/ }).click();
  await expect.poll(() => marked).toBe(1);
  await expect(page).toHaveURL(/#\/events/);
});
