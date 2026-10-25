import { test, expect } from "@playwright/test";
import { mocked, ID } from "./fixtures/api.mjs";

const CONVERSATION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function mockMessaging(page, { failFirstList = false, existing = false } = {}) {
  const calls = [];
  let listFailures = failFirstList ? 1 : 0;
  let conversations = existing ? [{ id: CONVERSATION, partnerId: PARTNER, partnerFirstName: "Daniel", partnerLastName: "James", unreadCount: 1, myLastReadSequence: 0, partnerReadSequence: 0, createdAt: new Date().toISOString() }] : [];
  let messages = existing ? [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", conversationId: CONVERSATION, senderId: PARTNER, clientMessageId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", body: "I am praying for you.", sequence: 1, createdAt: new Date().toISOString() }] : [];
  await page.route("**/api/v1/members**", async (route) => {
    const request = route.request();
    calls.push({ path: new URL(request.url()).pathname, method: request.method(), query: new URL(request.url()).searchParams });
    await route.fulfill({ json: { data: [{ id: PARTNER, firstName: "Daniel", lastName: "James" }], meta: { nextCursor: "" } } });
  });
  await page.route("**/api/v1/conversations**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let body;
    try { body = request.postDataJSON(); } catch {}
    calls.push({ path, method: request.method(), body });
    if (path === "/api/v1/conversations" && request.method() === "GET") {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (listFailures > 0) {
        listFailures--;
        return route.fulfill({ status: 503, json: { error: { code: "unavailable", message: "Try again." } } });
      }
      return route.fulfill({ json: { data: conversations } });
    }
    if (path === "/api/v1/conversations" && request.method() === "POST") {
      const partner = { id: body.recipientId, firstName: "Daniel", lastName: "James" };
      const conversation = { id: CONVERSATION, partnerId: partner.id, partnerFirstName: partner.firstName, partnerLastName: partner.lastName, unreadCount: 0, myLastReadSequence: 0, partnerReadSequence: 0, createdAt: new Date().toISOString() };
      conversations = [conversation, ...conversations];
      return route.fulfill({ status: 201, json: { data: conversation } });
    }
    if (path === `/api/v1/conversations/${CONVERSATION}/messages` && request.method() === "GET") {
      return route.fulfill({ json: { data: messages, meta: { nextBeforeSequence: 0 } } });
    }
    if (path === `/api/v1/conversations/${CONVERSATION}/messages` && request.method() === "POST") {
      const message = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", conversationId: CONVERSATION, senderId: ID, clientMessageId: body.clientMessageId, body: body.body, sequence: messages.length + 1, createdAt: new Date().toISOString() };
      messages = [...messages, message];
      return route.fulfill({ status: 201, json: { data: message } });
    }
    if (path === `/api/v1/conversations/${CONVERSATION}/read` && request.method() === "PUT") {
      return route.fulfill({ json: { data: { conversationId: CONVERSATION, lastReadSequence: messages.length, lastReadAt: new Date().toISOString() } } });
    }
    return route.fulfill({ status: 404, json: { error: { code: "not_found", message: "Not found." } } });
  });
  return { calls };
}

test("members discover directory-visible contacts and send durable direct messages", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page);
  await page.goto("/#/chat");

  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expect(page.getByText("Loading conversations…")).toBeVisible();
  await expect(page.getByText("No conversations yet")).toBeVisible();
  await page.getByRole("button", { name: "New conversation" }).click();
  await page.getByRole("searchbox", { name: "Search members" }).fill("Daniel");
  await expect(page.getByRole("button", { name: "Message Daniel James" })).toBeVisible();
  await page.getByRole("button", { name: "Message Daniel James" }).click();
  await expect(page.getByRole("heading", { name: "Daniel James" })).toBeVisible();
  const composer = page.getByRole("form", { name: "Send a message" });
  await composer.getByLabel("Message").fill("Hello Daniel");
  await composer.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("region", { name: "Conversation" }).getByText("Hello Daniel")).toBeVisible();
  const created = fixture.calls.find((call) => call.path === "/api/v1/conversations" && call.method === "POST");
  expect(created?.body).toEqual({ recipientId: PARTNER });
  const sent = fixture.calls.find((call) => call.path === `/api/v1/conversations/${CONVERSATION}/messages` && call.method === "POST");
  expect(sent?.body.body).toBe("Hello Daniel");
  expect(sent?.body.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
});

test("opening a direct conversation advances only the member's read receipt", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page, { existing: true });
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  await expect(page.getByText("I am praying for you.")).toBeVisible();
  const receipt = fixture.calls.find((call) => call.path === `/api/v1/conversations/${CONVERSATION}/read` && call.method === "PUT");
  expect(receipt?.body).toEqual({ throughMessageId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" });
});

test("messages shows a retryable conversation loading error", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await mockMessaging(page, { failFirstList: true });
  await page.goto("/#/chat");
  await expect(page.getByRole("alert")).toContainText("Try again");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No conversations yet")).toBeVisible();
});
