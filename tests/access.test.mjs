import test from "node:test";
import assert from "node:assert/strict";
import { hasCapability, createAccessState } from "../js/access.js";
const empty = { roles: [], capabilities: [] };
const editor = {
  roles: [{ role: "content_editor", scope: "" }],
  capabilities: [{ permission: "sermons.manage", scope: "" }],
};

test("capability checks deny unknown permissions and require the exact scope", () => {
  const group = "11111111-1111-4111-8111-111111111111";
  const snapshot = {
    roles: [],
    capabilities: [
      ...editor.capabilities,
      { permission: "ministry.members.manage", scope: group },
      { permission: "finance.individual.read", scope: "" },
    ],
  };
  assert.equal(hasCapability(editor, "sermons.manage"), true);
  assert.equal(hasCapability(editor, "roles.manage"), false);
  assert.equal(hasCapability(snapshot, "ministry.members.manage", group), true);
  assert.equal(hasCapability(snapshot, "ministry.members.manage", ""), false);
  assert.equal(
    hasCapability(
      snapshot,
      "ministry.members.manage",
      "22222222-2222-4222-8222-222222222222",
    ),
    false,
  );
  assert.equal(hasCapability(snapshot, "finance.individual.read"), false);
  assert.equal(hasCapability(null, "sermons.manage"), false);
  assert.equal(
    hasCapability(
      { capabilities: [{ permission: "sermons.manage", scope: group }] },
      "sermons.manage",
      group,
    ),
    false,
  );
});
test("refresh coalesces requests and revocation replaces the prior snapshot", async () => {
  let resolve,
    calls = 0;
  const notices = [];
  const state = createAccessState(() => {
    calls++;
    return new Promise((r) => {
      resolve = r;
    });
  });
  state.subscribe((value) => notices.push(value));
  const one = state.refresh(),
    two = state.refresh();
  resolve({ data: editor });
  await Promise.all([one, two]);
  assert.equal(calls, 1);
  assert.equal(hasCapability(state.current(), "sermons.manage"), true);
  const revoked = state.refresh();
  assert.equal(state.current(), null);
  resolve({ data: empty });
  await revoked;
  assert.equal(calls, 2);
  assert.equal(hasCapability(state.current(), "sermons.manage"), false);
  assert.ok(notices.length >= 3);
});
test("failures and malformed access responses clear previously visible privileges", async () => {
  let response = { data: editor };
  const state = createAccessState(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  await state.refresh();
  response = new Error("network unavailable");
  await assert.rejects(state.refresh());
  assert.equal(state.current(), null);
  response = {
    data: {
      roles: [],
      capabilities: [{ permission: "sermons.manage", scope: null }],
    },
  };
  await assert.rejects(state.refresh());
  assert.equal(state.current(), null);
});
test("clearing access invalidates an in-flight response after logout", async () => {
  let resolve;
  const state = createAccessState(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const request = state.refresh();
  state.clear();
  resolve({ data: editor });
  await request;
  assert.equal(state.current(), null);
});

test("a late old-account response cannot overwrite a new account snapshot", async () => {
  const resolvers = [];
  const state = createAccessState(
    () => new Promise((resolve) => resolvers.push(resolve)),
  );
  const oldRequest = state.refresh();
  state.clear();
  const newRequest = state.refresh();
  resolvers[1]({ data: empty });
  await newRequest;
  resolvers[0]({ data: editor });
  await oldRequest;
  assert.deepEqual(state.current(), empty);
});

test("devotional authority uses the explicit global capability and supports refreshed snapshots", async () => {
  const snapshot = {
    roles: [{ role: "content_editor", scope: "" }],
    capabilities: [{ permission: "devotionals.manage", scope: "" }],
  };
  assert.equal(hasCapability(snapshot, "devotionals.manage"), true);
  assert.equal(
    hasCapability(
      snapshot,
      "devotionals.manage",
      "11111111-1111-4111-8111-111111111111",
    ),
    false,
  );
  const state = createAccessState(async () => ({ data: snapshot }));
  await state.refresh();
  assert.equal(hasCapability(state.current(), "devotionals.manage"), true);
});
