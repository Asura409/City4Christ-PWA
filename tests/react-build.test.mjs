import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite } from "../scripts/build-site.mjs";
test("React release includes configured API origin and every existing connected page", async () => {
  const out = await mkdtemp(join(tmpdir(), "c4c-react-"));
  try {
    await buildSite({ apiURL: "https://alternate.example", outDir: out });
    const html = await readFile(join(out, "index.html"), "utf8");
    assert.match(html, /app-assets/);
    assert.match(html, /connect-src 'self' https:\/\/alternate.example/);
    assert.match(html, /js\/config.js/);
    const worker = await readFile(join(out, "service-worker.js"), "utf8");
    assert.match(worker, /app-assets\//);
    assert.doesNotMatch(worker, /__BUILD_ID__/);
    assert.doesNotMatch(html, /onrender.com|\/src\/main/);
    for (const file of [
      "auth.html",
      "profile.html",
      "word.html",
      "members.html",
      "staff.html",
      "service-worker.js",
    ])
      await access(join(out, file));
    assert.match(
      await readFile(join(out, "js/config.js"), "utf8"),
      /alternate.example/,
    );
    await assert.rejects(() => access(join(out, ".env")));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
