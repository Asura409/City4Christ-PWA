import test from "node:test";
import assert from "node:assert/strict";
import { youtubeWatchUrl, youtubeThumbnailUrl } from "../src/media/youtube.js";

test("pasted YouTube video and broadcast links normalize to a safe watch URL", () => {
  const id = "M7lc1UVf-VE";
  for (const link of [
    `https://www.youtube.com/watch?v=${id}&t=30`,
    `https://youtu.be/${id}?si=example`,
    `https://youtube.com/live/${id}`,
    `https://m.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ]) assert.equal(youtubeWatchUrl(link), `https://www.youtube.com/watch?v=${id}`);
  for (const link of [
    `https://youtube.com.evil.test/watch?v=${id}`,
    `https://user@youtube.com/watch?v=${id}`,
    `http://youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&v=${id}`,
    `https://youtu.be/${id}/extra`,
    "https://youtube.com/@church/live", "javascript:alert(1)", "", null,
  ]) assert.equal(youtubeWatchUrl(link), "", String(link));
});


test("YouTube thumbnails use only a validated video ID and the fixed image host", () => {
  assert.equal(youtubeThumbnailUrl("https://youtu.be/M7lc1UVf-VE"), "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg");
  for (const value of ["https://evil.test/image.jpg", "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE", "javascript:alert(1)", null]) assert.equal(youtubeThumbnailUrl(value), "");
});
