import test from "node:test";
import assert from "node:assert/strict";
import { createClient, validateAPIURL } from "../js/api.js";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("API_URL is public configuration and rejects unsafe/mistaken origins", () => {
  assert.equal(
    validateAPIURL("https://api.example/", "https://preview.example"),
    "https://api.example",
  );
  for (const url of [
    "http://api.example",
    "https://user:secret@api.example",
    "https://api.example/api/v1",
    "https://api.example?key=secret",
    "javascript:alert(1)",
  ])
    assert.throws(() => validateAPIURL(url, "https://preview.example"));
  assert.equal(
    validateAPIURL("/", "https://preview.example"),
    "https://preview.example",
  );
});
test("login uses cookies, access stays in memory and protected calls use Authorization", async () => {
  const calls = [];
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith("/login")
        ? json({ data: { accessToken: "private-access", expiresIn: 600 } })
        : json({ data: { id: "member", firstName: "Grace" } });
    },
  });
  await client.login("member@example.invalid", "private-password");
  await client.me();
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[1].options.headers.Authorization, "Bearer private-access");
  assert.equal(calls[1].options.cache, "no-store");
  await assert.rejects(() => client.request("https://evil.example/api/v1/me"));
});
test("concurrent protected requests share one refresh operation", async () => {
  let refreshes = 0;
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url) => {
      if (url.endsWith("/refresh")) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 5));
        return json({ data: { accessToken: "fresh", expiresIn: 600 } });
      }
      return json({ data: { id: "member" } });
    },
  });
  await Promise.all([client.me(), client.me(), client.me()]);
  assert.equal(refreshes, 1);
});
test("401 refreshes and retries once; validation/storage failures never auto-retry", async () => {
  let refreshes = 0,
    reads = 0;
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url) => {
      if (url.endsWith("/login"))
        return json({ data: { accessToken: "old", expiresIn: 600 } });
      if (url.endsWith("/refresh")) {
        refreshes++;
        return json({ data: { accessToken: "new", expiresIn: 600 } });
      }
      reads++;
      return json(
        {
          error: {
            code: "invalid_session",
            message: "Sign in again.",
            fields: {},
          },
        },
        401,
      );
    },
  });
  await client.login("x", "y");
  await assert.rejects(
    () => client.me(),
    (e) => e.status === 401,
  );
  assert.equal(refreshes, 1);
  assert.equal(reads, 2);
  let calls = 0;
  const errors = createClient({
    apiURL: "https://api.example",
    fetchImpl: async () => {
      calls++;
      return json(
        {
          error: {
            code: "validation_failed",
            message: "Check fields.",
            fields: { videoUrl: "Use YouTube." },
            requestId: "request-id",
          },
        },
        422,
      );
    },
  });
  await assert.rejects(
    () =>
      errors.request("/api/v1/auth/register", {
        public: true,
        method: "POST",
        body: {},
      }),
    (e) => e.fields.videoUrl === "Use YouTube.",
  );
  assert.equal(calls, 1);
});
test("logout confirms server success before clearing the local session", async () => {
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url) =>
      json({
        data: url.endsWith("/login")
          ? { accessToken: "token", expiresIn: 600 }
          : { status: "logged_out" },
      }),
  });
  await client.login("x", "y");
  assert.equal(client.isSignedIn(), true);
  await client.logout();
  assert.equal(client.isSignedIn(), false);
});
test("a pending session restoration finishes before a new sign-in changes the cookie", async () => {
  let finishRefresh, started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const calls = [];
  const client = createClient({
    apiURL: "https://api.example",
    fetchImpl: async (url) => {
      calls.push(url.split("/").pop());
      if (url.endsWith("/refresh")) {
        started();
        return new Promise((resolve) => {
          finishRefresh = () =>
            resolve(
              json(
                {
                  error: { code: "invalid_session", message: "Sign in again." },
                },
                401,
              ),
            );
        });
      }
      return json({ data: { accessToken: "new-login", expiresIn: 600 } });
    },
  });
  const restoration = client.refresh().catch(() => {});
  await ready;
  const login = client.login("member@example.invalid", "test password");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["refresh"]);
  finishRefresh();
  await Promise.all([restoration, login]);
  assert.equal(client.isSignedIn(), true);
});
