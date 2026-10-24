import test from "node:test";
import assert from "node:assert/strict";
import { safeImageUrl, youtubeEmbedUrl } from "../src/lib/sanitize.js";

test("sermon images render only HTTPS Unsplash photo URLs", () => {
  assert.equal(
    safeImageUrl("https://images.unsplash.com/photo-123?fit=crop&w=800"),
    "https://images.unsplash.com/photo-123?fit=crop&w=800",
  );
  for (const value of [
    "http://images.unsplash.com/photo-123",
    "https://images.unsplash.com.evil.example/photo-123",
    "https://user@images.unsplash.com/photo-123",
    "data:image/svg+xml,<svg>",
    "https://images.unsplash.com/not-a-photo",
  ]) assert.equal(safeImageUrl(value), "", value);
});

test("video embeds are built only from canonical YouTube watch URLs", () => {
  assert.equal(
    youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  for (const value of [
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=abcdefghijk",
    "javascript:alert(1)",
  ]) assert.equal(youtubeEmbedUrl(value), "", value);
});
