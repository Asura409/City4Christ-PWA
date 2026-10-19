import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Vercel publishes the canonical build without changing auth callback paths or caching configuration", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(config.framework, null);
  assert.equal(config.installCommand, "npm ci");
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, "dist");
  assert.equal(config.cleanUrls, false);
  assert.equal(pkg.engines.node, "22.x");
  for (const source of ["/service-worker.js", "/js/config.js"]) {
    const rule = config.headers.find((rule) => rule.source === source);
    assert.equal(
      rule?.headers.find(
        (header) => header.key.toLowerCase() === "cache-control",
      )?.value,
      "no-store",
    );
  }
  assert.equal(config.rewrites, undefined);
});
