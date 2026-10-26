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
    assert.match(html, /img-src[^;]+https:\/\/images\.unsplash\.com/);
    assert.match(html, /frame-src https:\/\/www\.youtube-nocookie\.com/);
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

test("React release permits only the configured private media origin in CSP", async () => {
  const out = await mkdtemp(join(tmpdir(), "c4c-media-csp-"));
  try {
    await buildSite({ apiURL: "https://api.example", mediaOrigin: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com", outDir: out });
    const html = await readFile(join(out, "index.html"), "utf8");
    assert.match(html, /connect-src 'self' https:\/\/api\.example https:\/\/0123456789abcdef0123456789abcdef\.r2\.cloudflarestorage\.com/);
    assert.match(html, /img-src 'self' data: blob: https:\/\/images\.unsplash\.com https:\/\/0123456789abcdef0123456789abcdef\.r2\.cloudflarestorage\.com/);
    assert.match(html, /media-src 'self' blob: https:\/\/0123456789abcdef0123456789abcdef\.r2\.cloudflarestorage\.com/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
