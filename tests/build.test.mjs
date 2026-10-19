import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../scripts/build.mjs";
test("hosting API_URL becomes public config and only the canonical app is published", async () => {
  const out = await mkdtemp(join(tmpdir(), "c4c-site-"));
  try {
    await build({ apiURL: "https://api.example", outDir: out });
    const config = await readFile(join(out, "js/config.js"), "utf8");
    assert.match(config, /https:\/\/api\.example/);
    assert.match(
      await readFile(join(out, "profile.html"), "utf8"),
      /js\/connected.js/,
    );
    for (const hidden of [
      ".git",
      ".env",
      "tests",
      "node_modules",
      "city4christ-pwa",
      "City4Christ-PWA",
    ])
      await assert.rejects(() => access(join(out, hidden)));
    await assert.rejects(() =>
      build({ apiURL: "https://user:secret@api.example", outDir: out }),
    );
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
