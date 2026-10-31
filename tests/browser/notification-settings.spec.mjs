import { test, expect } from "@playwright/test";
import { mocked } from "./fixtures/api.mjs";
const prefs = {
  pushEnabled: false,
  groups: true,
  events: true,
  pastoral: true,
  messages: true,
  announcements: true,
};
async function settings(page, { staff = false } = {}) {
  await mocked(page, {
    signedIn: true,
    access: staff
      ? {
          roles: [{ role: "staff", scope: "" }],
          capabilities: [{ permission: "broadcasts.send", scope: "" }],
        }
      : { roles: [], capabilities: [] },
  });
  let saved,
    all = 0;
  await page.route("**/api/v1/notifications/preferences", (r) => {
    if (r.request().method() === "PUT") saved = r.request().postDataJSON();
    return r.fulfill({ json: { data: saved || prefs } });
  });
  await page.route("**/api/v1/notifications/push/config", (r) =>
    r.fulfill({ json: { data: { enabled: false, publicKey: "" } } }),
  );
  await page.route("**/api/v1/notifications/read-all", (r) => {
    all++;
    return r.fulfill({ json: { data: { changedCount: 1 } } });
  });
  return { saved: () => saved, all: () => all };
}
test("member saves push categories and marks the inbox read without enabling device permission", async ({
  page,
}) => {
  const state = await settings(page);
  await page.goto("/#/notifications");
  const form = page.getByRole("form", { name: "Notification preferences" });
  await form.getByLabel("Group updates", { exact: true }).uncheck();
  await form
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect.poll(() => state.saved()?.groups).toBe(false);
  await page
    .getByRole("button", { name: "Mark all read", exact: true })
    .click();
  await expect.poll(state.all).toBe(1);
  await expect(
    page.getByText("Browser push is not configured yet.", { exact: true }),
  ).toBeVisible();
});
test("staff reviews a draft audience and explicitly confirms sending a broadcast", async ({
  page,
}) => {
  await settings(page, { staff: true });
  let sent = 0;
  const draft = {
    id: "99999999-9999-4999-8999-999999999999",
    title: "Service update",
    body: "Synthetic church announcement",
    audience: "church",
    status: "draft",
    version: 1,
    recipientCount: 2,
  };
  await page.route("**/api/v1/admin/broadcasts**", (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith("/send")) {
      sent++;
      return r.fulfill({ json: { data: { ...draft, status: "sent" } } });
    }
    if (r.request().method() === "POST")
      return r.fulfill({ status: 201, json: { data: draft } });
    return r.fulfill({
      json: { data: u.pathname.endsWith(draft.id) ? draft : [] },
    });
  });
  await page.goto("/#/notifications");
  const form = page.getByRole("form", { name: "Broadcast draft" });
  await form.getByLabel("Announcement title").fill(draft.title);
  await form.getByLabel("Announcement message").fill(draft.body);
  await form
    .getByRole("button", { name: "Create broadcast draft", exact: true })
    .click();
  expect(sent).toBe(0);
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await expect(page.getByText("Recipients: 2", { exact: true })).toBeVisible();
  const send = page.getByRole("button", {
    name: "Send broadcast",
    exact: true,
  });
  await expect(send).toBeDisabled();
  await page.getByLabel("I confirm this audience and message").check();
  await send.click();
  await expect.poll(() => sent).toBe(1);
  await expect(
    page.getByText("Broadcast sent to 2 inboxes.", { exact: true }),
  ).toBeVisible();
});

test("device opt-in requests permission after a click and registers through the API", async ({
  page,
}) => {
  await settings(page);
  await page.addInitScript(() => {
    window.__pushPrompts = 0;
    const subscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/synthetic",
      toJSON() {
        return {
          endpoint: this.endpoint,
          keys: { p256dh: "synthetic", auth: "synthetic" },
        };
      },
      unsubscribe: async () => true,
    };
    const registration = {
      pushManager: {
        getSubscription: async () => null,
        subscribe: async () => subscription,
      },
    };
    Object.defineProperty(window, "PushManager", {
      value: function () {},
      configurable: true,
    });
    Object.defineProperty(window, "Notification", {
      value: {
        permission: "default",
        requestPermission: async () => {
          window.__pushPrompts++;
          return "granted";
        },
      },
      configurable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: async () => registration,
        ready: Promise.resolve(registration),
        getRegistration: async () => registration,
      },
      configurable: true,
    });
  });
  await page.route("**/api/v1/notifications/push/config", (r) =>
    r.fulfill({ json: { data: { enabled: true, publicKey: "BABA" } } }),
  );
  let subscribed = 0;
  await page.route("**/api/v1/notifications/push/subscriptions", (r) => {
    subscribed++;
    return r.fulfill({
      status: 201,
      json: { data: { id: "synthetic-device" } },
    });
  });
  await page.goto("/#/notifications");
  const enable = page.getByRole("button", {
    name: "Enable notifications on this device",
    exact: true,
  });
  await expect(enable).toBeEnabled();
  expect(await page.evaluate(() => window.__pushPrompts)).toBe(0);
  await enable.click();
  await expect.poll(() => subscribed).toBe(1);
  expect(await page.evaluate(() => window.__pushPrompts)).toBe(1);
  await expect(
    page.getByText("Notifications enabled on this device.", { exact: true }),
  ).toBeVisible();
});
