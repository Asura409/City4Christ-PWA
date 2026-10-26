import test from "node:test";
import assert from "node:assert/strict";
import { createRealtimeClient, mergeMessageHistory } from "../src/messages/realtimeClient.js";

class FakeWebSocket {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.readyState = 0;
    FakeWebSocket.instances.push(this);
  }
  send(frame) { this.sent.push(frame); }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

function setup(overrides = {}) {
  FakeWebSocket.instances = [];
  const statuses = [];
  const events = [];
  const readyCount = { value: 0 };
  const client = createRealtimeClient({
    baseURL: "https://api.example.test",
    getTicket: async () => "opaque-ticket-value",
    WebSocketImpl: FakeWebSocket,
    onStatus: (status) => statuses.push(status),
    onEvent: (event) => events.push(event),
    onReady: () => { readyCount.value++; },
    retryBaseMs: 10,
    ...overrides,
  });
  return { client, statuses, events, readyCount };
}

test("uses a single-use ticket in the first frame and delivers validated metadata", async () => {
  let ticketRequests = 0;
  const { client, statuses, events, readyCount } = setup({
    getTicket: async () => { ticketRequests++; return "opaque-ticket-value"; },
  });
  await client.start();
  const socket = FakeWebSocket.instances[0];
  assert.equal(socket.url, "wss://api.example.test/api/v1/realtime");
  assert.equal(new URL(socket.url).search, "");
  socket.open();
  assert.deepEqual(JSON.parse(socket.sent[0]), {
    type: "authenticate",
    ticket: "opaque-ticket-value",
  });
  socket.receive({ type: "ready" });
  socket.receive({
    type: "message.created",
    scope: "direct",
    conversationId: "conversation-id",
    messageId: "message-id",
    sequence: 4,
  });
  socket.receive({ type: "message.created", scope: "direct", body: "must be ignored" });

  assert.equal(ticketRequests, 1);
  assert.equal(readyCount.value, 1);
  assert.deepEqual(events, [{
    type: "message.created",
    scope: "direct",
    conversationId: "conversation-id",
    messageId: "message-id",
    sequence: 4,
  }]);
  assert.ok(statuses.includes("connected"));
  client.stop();
});

test("requests a fresh ticket and signals catch-up on transient reconnect", async () => {
  const timers = [];
  let ticketRequests = 0;
  const { client, readyCount } = setup({
    getTicket: async () => `ticket-${++ticketRequests}`,
    setTimeoutImpl: (callback, delay) => {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    clearTimeoutImpl: (timer) => {
      const index = timers.indexOf(timer);
      if (index >= 0) timers.splice(index, 1);
    },
  });
  await client.start();
  const first = FakeWebSocket.instances[0];
  first.open();
  first.receive({ type: "ready" });
  first.close(1006);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 10);
  timers.shift().callback();
  await new Promise((resolve) => setImmediate(resolve));

  const second = FakeWebSocket.instances[1];
  assert.ok(second);
  assert.equal(ticketRequests, 2);
  second.open();
  assert.equal(JSON.parse(second.sent[0]).ticket, "ticket-2");
  second.receive({ type: "ready" });
  assert.equal(readyCount.value, 2);
  client.stop();
});

test("stops reconnecting when the ticket request says the session is unauthorized", async () => {
  const timers = [];
  const unauthorized = Object.assign(new Error("Sign in again."), { status: 401 });
  const { client, statuses } = setup({
    getTicket: async () => { throw unauthorized; },
    setTimeoutImpl: (callback) => { timers.push(callback); return callback; },
    clearTimeoutImpl: () => {},
  });
  await client.start();
  assert.ok(statuses.includes("auth_required"));
  assert.equal(timers.length, 0);
  client.stop();
});

test("merges REST catch-up pages by message ID and sequence", () => {
  const result = mergeMessageHistory(
    [{ id: "one", sequence: 1, body: "first" }, { id: "two", sequence: 2, body: "old copy" }],
    [{ id: "two", sequence: 2, body: "updated copy" }, { id: "three", sequence: 3, body: "third" }],
  );
  assert.deepEqual(result, [
    { id: "one", sequence: 1, body: "first" },
    { id: "two", sequence: 2, body: "updated copy" },
    { id: "three", sequence: 3, body: "third" },
  ]);
});
