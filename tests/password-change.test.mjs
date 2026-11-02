import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "../js/api.js";
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("password change refreshes first, sends bearer and clears credentials only after success", async () => {
  const calls = [];
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith("/refresh")
        ? json({ data: { accessToken: "private-access", expiresIn: 600 } })
        : json({ data: { status: "password_changed" } });
    },
  });
  await client.changePassword(
    "synthetic current password",
    "synthetic replacement password",
  );
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.endsWith("/auth/password/change"));
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.headers.Authorization, "Bearer private-access");
  assert.equal(calls[1].options.credentials, "include");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    currentPassword: "synthetic current password",
    newPassword: "synthetic replacement password",
  });
  assert.equal(client.isSignedIn(), false);
});

test("incorrect current password preserves the active session and is not automatically retried", async () => {
  let changes = 0;
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url) => {
      if (url.endsWith("/refresh"))
        return json({
          data: { accessToken: "private-access", expiresIn: 600 },
        });
      changes++;
      return json(
        {
          error: {
            code: "current_password_invalid",
            message: "Check your current password.",
            fields: { currentPassword: "Incorrect password." },
          },
        },
        422,
      );
    },
  });
  await assert.rejects(
    client.changePassword(
      "wrong synthetic password",
      "synthetic replacement password",
    ),
    (error) =>
      error.code === "current_password_invalid" && error.status === 422,
  );
  assert.equal(changes, 1);
  assert.equal(client.isSignedIn(), true);
});
