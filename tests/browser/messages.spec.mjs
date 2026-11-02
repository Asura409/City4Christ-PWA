import { test, expect } from "@playwright/test";
import { mocked, ID, mockScannedUpload } from "./fixtures/api.mjs";

const CONVERSATION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function mockMessaging(page, { failFirstList = false, existing = false, ownMessage = false, ownMessageAge = 0 } = {}) {
  const calls = [];
  let listFailures = failFirstList ? 1 : 0;
  let conversations = existing ? [{ id: CONVERSATION, partnerId: PARTNER, partnerFirstName: "Daniel", partnerLastName: "James", unreadCount: 1, myLastReadSequence: 0, partnerReadSequence: 0, createdAt: new Date().toISOString() }] : [];
  let messages = existing ? [{ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", conversationId: CONVERSATION, senderId: PARTNER, clientMessageId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", body: "I am praying for you.", sequence: 1, createdAt: new Date().toISOString() }] : [];
  if (ownMessage) messages.push({ id: "12121212-1212-4212-8212-121212121212", conversationId: CONVERSATION, senderId: ID, clientMessageId: "34343434-3434-4434-8434-343434343434", body: "My recent message.", sequence: messages.length + 1, createdAt: new Date(Date.now() - ownMessageAge).toISOString(), attachments: [] });
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
    calls.push({ path, method: request.method(), body, query: url.searchParams.toString() });
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
      const message = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", conversationId: CONVERSATION, senderId: ID, clientMessageId: body.clientMessageId, body: body.body, attachmentCount: body.attachmentIds?.length || 0, attachments: body.attachmentIds?.map((id) => ({ id, contentType: "image/png", size: 128, url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/clean/photo.png?signature=test", expiresAt: new Date(Date.now() + 60_000).toISOString() })) || [], sequence: messages.length + 1, createdAt: new Date().toISOString() };
      messages = [...messages, message];
      return route.fulfill({ status: 201, json: { data: message } });
    }
    const directMessage = path.match(new RegExp(`^/api/v1/conversations/${CONVERSATION}/messages/([^/]+)$`));
    if (directMessage && request.method() === "PATCH") {
      messages = messages.map((item) => item.id === directMessage[1] ? { ...item, body: body.body, editedAt: new Date().toISOString() } : item);
      return route.fulfill({ json: { data: messages.find((item) => item.id === directMessage[1]) } });
    }
    if (directMessage && request.method() === "DELETE") {
      messages = messages.map((item) => item.id === directMessage[1] ? { ...item, body: "", attachments: [], attachmentCount: 0, deleted: true } : item);
      return route.fulfill({ status: 204 });
    }
    if (path === `/api/v1/conversations/${CONVERSATION}/read` && request.method() === "PUT") {
      return route.fulfill({ json: { data: { conversationId: CONVERSATION, lastReadSequence: messages.length, lastReadAt: new Date().toISOString() } } });
    }
    return route.fulfill({ status: 404, json: { error: { code: "not_found", message: "Not found." } } });
  });
  return {
    calls,
    addMessage(message) { messages = [...messages, message]; },
  };
}

async function mockRealtime(page) {
  await page.addInitScript(() => {
    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      constructor(url) {
        this.url = url;
        this.readyState = FakeWebSocket.CONNECTING;
        this.sent = [];
        (window.__realtimeSockets ||= []).push(this);
      }
      send(frame) { this.sent.push(frame); }
      open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
      receive(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
      drop() { this.readyState = FakeWebSocket.CLOSED; this.onclose?.({ code: 1006 }); }
      close() { this.readyState = FakeWebSocket.CLOSED; }
    }
    window.WebSocket = FakeWebSocket;
  });
  let tickets = 0;
  await page.route("**/api/v1/realtime/tickets", async (route) => {
    tickets++;
    await route.fulfill({ json: { data: { ticket: `fixture-ticket-${tickets}` } } });
  });
  return { ticketCount: () => tickets };
}

test("members discover directory-visible contacts and send durable direct messages", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page);
  await page.goto("/#/chat");

  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
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

test("direct messages upload, scan, send, and render private image attachments", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page);
  const upload = await mockScannedUpload(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "New conversation" }).click();
  await page.getByRole("searchbox", { name: "Search members" }).fill("Daniel");
  await page.getByRole("button", { name: "Message Daniel James" }).click();
  const composer = page.getByRole("form", { name: "Send a message" });
  await composer.getByLabel("Message").fill("Here is the picture");
  await composer.getByLabel("Attach images, audio, or video").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("test image") });
  await composer.getByRole("button", { name: "Send" }).click();
  const thread = page.getByRole("region", { name: "Conversation" });
  await expect(thread.getByText("Here is the picture")).toBeVisible();
  await expect(thread.locator("img[alt='Message attachment']")).toHaveCount(1);
  const sent = fixture.calls.find((call) => call.path === `/api/v1/conversations/${CONVERSATION}/messages` && call.method === "POST");
  expect(sent?.body.attachmentIds).toEqual([upload.uploadId]);
  expect(upload.calls.map((call) => call.path)).toEqual([
    "/api/v1/uploads/presign", `/api/v1/uploads/${upload.uploadId}/complete`, `/api/v1/uploads/${upload.uploadId}`,
  ]);
  expect(upload.calls[0].body.purpose).toBe("message_attachment");
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

test("senders can edit or delete their own messages inside the 10-minute window", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page, { existing: true, ownMessage: true });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  const thread = page.getByRole("region", { name: "Conversation" });
  await thread.getByRole("button", { name: "Edit message" }).click();
  await thread.getByRole("textbox", { name: "Edit message" }).fill("Corrected message.");
  await thread.getByRole("button", { name: "Save edit" }).click();
  await expect(thread.getByText("Corrected message.")).toBeVisible();
  await expect(thread.getByText("Edited", { exact: true })).toBeVisible();
  expect(fixture.calls.some((call) => call.method === "PATCH" && call.path.endsWith("/12121212-1212-4212-8212-121212121212"))).toBe(true);
  await thread.getByRole("button", { name: "Delete message" }).click();
  await expect(thread.getByText("This message was deleted.")).toBeVisible();
  expect(fixture.calls.some((call) => call.method === "DELETE" && call.path.endsWith("/12121212-1212-4212-8212-121212121212"))).toBe(true);
});

test("direct messages become immutable after 10 minutes", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await mockMessaging(page, { existing: true, ownMessage: true, ownMessageAge: 11 * 60 * 1000 });
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  const ownMessage = page.getByRole("region", { name: "Conversation" }).locator(".message-bubble.sent").filter({ hasText: "My recent message." });
  await expect(ownMessage.getByRole("button", { name: "Edit message" })).toHaveCount(0);
  await expect(ownMessage.getByRole("button", { name: "Delete message" })).toHaveCount(0);
});

test("members can search messages inside their private conversation", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page, { existing: true });
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  await page.getByRole("searchbox", { name: "Search messages" }).fill("praying");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Search results for “praying”")).toBeVisible();
  const search = fixture.calls.find((call) => call.method === "GET" && call.path === `/api/v1/conversations/${CONVERSATION}/messages` && call.query.includes("query=praying"));
  expect(search).toBeTruthy();
});

test("messages shows a retryable conversation loading error", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await mockMessaging(page, { failFirstList: true });
  await page.goto("/#/chat");
  await expect(page.getByRole("alert")).toContainText("Try again");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No conversations yet")).toBeVisible();
});

test("direct chat refreshes REST history after a realtime event and reconnect", async ({ page }) => {
  await mocked(page, { signedIn: true });
  const fixture = await mockMessaging(page, { existing: true });
  const realtime = await mockRealtime(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  const thread = page.getByRole("region", { name: "Conversation" });
  await expect(thread.getByText("I am praying for you.")).toBeVisible();
  await page.waitForFunction(() => window.__realtimeSockets?.length === 1);
  await page.evaluate(() => {
    const socket = window.__realtimeSockets[0];
    socket.open();
    socket.receive({ type: "ready" });
  });
  await expect(page.getByText("Live", { exact: true })).toHaveClass(/realtime-status-connected/);
  await expect.poll(() => page.evaluate(() => window.__realtimeSockets[0].sent.map((frame) => JSON.parse(frame)))).toContainEqual({
    type: "presence.subscribe", scope: "direct", conversationId: CONVERSATION,
  });
  await page.evaluate((senderId) => window.__realtimeSockets[0].receive({ type: "presence.snapshot", scope: "direct", conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", senderId, online: false }), PARTNER);
  await expect(thread.getByText("Not online")).toBeVisible();
  await page.evaluate((senderId) => window.__realtimeSockets[0].receive({ type: "presence.online", scope: "direct", conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", senderId, online: true }), PARTNER);
  await expect(thread.getByText("Online", { exact: true })).toBeVisible();
  const sentFrame = await page.evaluate(() => ({
    url: window.__realtimeSockets[0].url,
    frame: JSON.parse(window.__realtimeSockets[0].sent[0]),
  }));
  expect(new URL(sentFrame.url).search).toBe("");
  expect(sentFrame.frame).toEqual({ type: "authenticate", ticket: "fixture-ticket-1" });

  fixture.addMessage({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff", conversationId: CONVERSATION, senderId: PARTNER, clientMessageId: "11111111-1111-4111-8111-111111111112", body: "Live update from REST history.", sequence: 2, createdAt: new Date().toISOString() });
  await page.evaluate(() => window.__realtimeSockets[0].receive({ type: "message.created", scope: "direct", conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", messageId: "ffffffff-ffff-4fff-8fff-ffffffffffff", sequence: 2 }));
  await expect(thread.getByText("Live update from REST history.")).toBeVisible();

  await page.evaluate(() => window.__realtimeSockets[0].drop());
  fixture.addMessage({ id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", conversationId: CONVERSATION, senderId: PARTNER, clientMessageId: "11111111-1111-4111-8111-111111111113", body: "Sent while offline.", sequence: 3, createdAt: new Date().toISOString() });
  await page.waitForFunction(() => window.__realtimeSockets?.length === 2);
  expect(realtime.ticketCount()).toBe(2);
  await page.evaluate(() => {
    const socket = window.__realtimeSockets[1];
    socket.open();
    socket.receive({ type: "ready" });
  });
  await expect(thread.getByText("Sent while offline.")).toBeVisible();
});

test("direct chat sends scoped typing signals and shows the other participant typing", async ({ page }) => {
  await mocked(page, { signedIn: true });
  await mockMessaging(page, { existing: true });
  await mockRealtime(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "Open conversation with Daniel James" }).click();
  await page.waitForFunction(() => window.__realtimeSockets?.length === 1);
  await page.evaluate(() => { window.__realtimeSockets[0].open(); window.__realtimeSockets[0].receive({ type: "ready" }); });
  const input = page.getByRole("textbox", { name: "Message" });
  await input.fill("Hello");
  await expect.poll(() => page.evaluate(() => window.__realtimeSockets[0].sent.map((frame) => JSON.parse(frame)))).toContainEqual({
    type: "typing.start", scope: "direct", conversationId: CONVERSATION,
  });
  await page.evaluate((senderId) => window.__realtimeSockets[0].receive({ type: "typing.start", scope: "direct", conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", senderId }), PARTNER);
  await expect(page.getByRole("status").filter({ hasText: "Daniel James is typing" })).toBeVisible();
  await page.evaluate((senderId) => window.__realtimeSockets[0].receive({ type: "typing.stop", scope: "direct", conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", senderId }), PARTNER);
  await expect(page.getByRole("status").filter({ hasText: "Daniel James is typing" })).toBeHidden();
});
