import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../js/api.js";
import { hasCapability } from "../js/access.js";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("account deletion is one authenticated explicit request and clears credentials on receipt", async () => {
  const calls = [];
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith("/refresh")
        ? json({ data: { accessToken: "private-access", expiresIn: 600 } })
        : json({ data: { status: "requested" } }, 202);
    },
  });
  await client.requestAccountDeletion({
    confirm: true,
    policyVersion: "account-deletion-request-v1",
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://api.example/api/v1/me");
  assert.equal(calls[1].options.method, "DELETE");
  assert.equal(calls[1].options.headers.Authorization, "Bearer private-access");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    confirm: true,
    policyVersion: "account-deletion-request-v1",
  });
  assert.equal(client.isSignedIn(), false);
});
test("account deletion never auto-replays expired-session or transient failures", async () => {
  for (const status of [401, 409, 429, 503]) {
    let changes = 0,
      refreshes = 0;
    const client = createClient({
      apiURL: "https://api.example",
      fetchImpl: async (url) => {
        if (url.endsWith("/refresh")) {
          refreshes++;
          return json({
            data: { accessToken: "private-access", expiresIn: 600 },
          });
        }
        changes++;
        return json(
          {
            error: {
              code: status === 401 ? "invalid_session" : "unavailable",
              message: "Cannot submit now.",
            },
          },
          status,
        );
      },
    });
    await assert.rejects(
      client.requestAccountDeletion({
        confirm: true,
        policyVersion: "account-deletion-request-v1",
      }),
    );
    assert.equal(changes, 1);
    assert.equal(refreshes, 1);
    assert.equal(client.isSignedIn(), true);
  }
});
test("deletion review display capability is global and cannot be widened from a group", () => {
  const snapshot = {
    capabilities: [{ permission: "accounts.deletion.review", scope: "" }],
  };
  assert.equal(hasCapability(snapshot, "accounts.deletion.review"), true);
  assert.equal(
    hasCapability(
      snapshot,
      "accounts.deletion.review",
      "11111111-1111-4111-8111-111111111111",
    ),
    false,
  );
});
