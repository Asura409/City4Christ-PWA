import { test, expect } from "@playwright/test";
import { mocked, ID } from "./fixtures/api.mjs";

const GROUP = "33333333-3333-4333-8333-333333333333";
const MESSAGE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function groupMocks(page) {
  const calls = [];
  let messages = [{ id: MESSAGE, groupId: GROUP, senderId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", clientMessageId: CLIENT, body: "Welcome to choir practice.", sequence: 1, createdAt: new Date().toISOString(), deleted: false }];
  await page.route("**/api/v1/group-conversations", (route) => route.fulfill({ json: { data: [{ groupId: GROUP, groupName: "Choir", audience: "church", unreadCount: 1, myLastReadSequence: 0, canModerate: true, lastMessage: messages.at(-1) }] } }));
  await page.route(`**/api/v1/groups/${GROUP}/read`, async (route) => {
    calls.push({ method: route.request().method(), path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() });
    await route.fulfill({ json: { data: { groupId: GROUP, lastReadSequence: 1 } } });
  });
  await page.route(`**/api/v1/groups/${GROUP}/messages**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body;
    try { body = request.postDataJSON(); } catch {}
    calls.push({ method: request.method(), path, body });
    if (request.method() === "GET") return route.fulfill({ json: { data: messages, meta: { nextBeforeSequence: 0 } } });
    if (request.method() === "POST") {
      const created = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", groupId: GROUP, senderId: ID, clientMessageId: body.clientMessageId, body: body.body, sequence: 2, createdAt: new Date().toISOString(), deleted: false };
      messages = [...messages, created];
      return route.fulfill({ status: 201, json: { data: created } });
    }
    if (request.method() === "DELETE") {
      const id = path.split("/").at(-1);
      messages = messages.map((item) => item.id === id ? { ...item, body: "", deleted: true } : item);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 405 });
  });
  return { calls };
}

test("active group members read, send, and mark messages read", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await groupMocks(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Group chats", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Group chats" })).toBeVisible();
  await page.getByRole("button", { name: "Open group conversation Choir" }).click();
  const thread = page.getByRole("region", { name: "Group conversation" });
  await expect(thread.getByText("Welcome to choir practice.")).toBeVisible();
  const composer = page.getByRole("form", { name: "Send a group message" });
  await composer.getByLabel("Group message").fill("I will be there.");
  await composer.getByRole("button", { name: "Send" }).click();
  await expect(thread.getByText("I will be there.")).toBeVisible();
  expect(fixture.calls.some((call) => call.method === "PUT" && call.path === `/api/v1/groups/${GROUP}/read`)).toBe(true);
  const sent = fixture.calls.find((call) => call.method === "POST" && call.path === `/api/v1/groups/${GROUP}/messages`);
  expect(sent?.body.body).toBe("I will be there.");
  expect(sent?.body.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
});

test("authorized group moderators can remove content and the body is redacted", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await groupMocks(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Group chats", exact: true }).click();
  await page.getByRole("button", { name: "Open group conversation Choir" }).click();
  const thread = page.getByRole("region", { name: "Group conversation" });
  await expect(thread.getByText("Welcome to choir practice.")).toBeVisible();
  await page.getByRole("button", { name: "Delete message" }).click();
  await expect(thread.getByText("This message was removed by a group moderator.")).toBeVisible();
  expect(fixture.calls.some((call) => call.method === "DELETE" && call.path === `/api/v1/groups/${GROUP}/messages/${MESSAGE}`)).toBe(true);
  await expect(thread.getByText("Welcome to choir practice.")).toHaveCount(0);
  const back = page.getByRole("button", { name: "Back to group chats" });
  if (await back.isVisible()) await back.click();
  await expect(page.getByRole("button", { name: "Open group conversation Choir" })).toContainText("Message removed");
});
