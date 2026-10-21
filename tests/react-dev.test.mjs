import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
test("Vite development uses the same API_URL and CSP configuration as hosting", async () => {
  const previous = process.env.API_URL;
  process.env.API_URL = "https://development.example";
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "silent",
  });
  try {
    await server.listen();
    const address = server.httpServer.address();
    const origin = "http://127.0.0.1:" + address.port;
    assert.match(
      await (await fetch(origin + "/js/config.js")).text(),
      /https:\/\/development.example/,
    );
    assert.match(
      await (await fetch(origin + "/")).text(),
      /connect-src 'self' https:\/\/development.example/,
    );
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.API_URL;
    else process.env.API_URL = previous;
  }
});
