import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
test("service worker never caches authenticated, API or deployment-config requests", async () => {
  const listeners = {};
  const source = await readFile(
    new URL("../service-worker.js", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(source, {
    self: {
      location: {
        origin: "https://preview.example",
        href: "https://preview.example/service-worker.js",
      },
      addEventListener: (name, fn) => (listeners[name] = fn),
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
    URL,
    caches: {
      match: async () => undefined,
      open: async () => ({ put: async () => {} }),
    },
    fetch: async () => ({ clone: () => ({}) }),
  });
  for (const [url, authorized, cache] of [
    ["https://api.example/api/v1/me", true, "default"],
    ["https://preview.example/api/v1/members", false, "default"],
    ["https://preview.example/js/config.js", false, "default"],
    ["https://preview.example/profile.html", false, "no-store"],
  ]) {
    let intercepted = false;
    listeners.fetch({
      request: {
        url,
        method: "GET",
        headers: { has: () => authorized },
        cache,
      },
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(
      intercepted,
      false,
      `private/config request intercepted: ${url}`,
    );
  }
});

test("service worker can install every shell asset after a module refactor", async () => {
  const { access } = await import("node:fs/promises");
  let install,
    completion,
    activated = false;
  const source = await readFile(
    new URL("../service-worker.js", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(source, {
    URL,
    self: {
      location: { href: "https://preview.example/service-worker.js" },
      addEventListener: (name, handler) => {
        if (name === "install") install = handler;
      },
      skipWaiting: () => {
        activated = true;
      },
    },
    caches: {
      open: async () => ({
        addAll: async (urls) => {
          for (const url of urls)
            await access(
              new URL(".." + new URL(url).pathname, import.meta.url),
            );
        },
      }),
    },
  });
  install({
    waitUntil: (promise) => {
      completion = promise;
    },
  });
  await completion;
  assert.equal(activated, true);
});
