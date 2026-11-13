import { youtubeEmbedUrl } from "../lib/sanitize.js";

// Normalize pasted share/live links; never use arbitrary input as an iframe src.
export function youtubeWatchUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    let id = "";
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v");
      else id = url.pathname.match(/^\/(?:live|shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return "";
    const watch = `https://www.youtube.com/watch?v=${id}`;
    return youtubeEmbedUrl(watch) ? watch : "";
  } catch {
    return "";
  }
}

export function youtubeThumbnailUrl(value) {
  const watch = youtubeWatchUrl(value);
  if (!watch) return "";
  const id = new URL(watch).searchParams.get("v");
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
