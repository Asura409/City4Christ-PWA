import React from "react";

function safeMediaURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export default function MessageAttachments({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return <div className="message-attachments" aria-label="Message attachments">
    {items.map((item) => {
      const url = safeMediaURL(item?.url);
      if (!url) return null;
      if (item.contentType?.startsWith("image/")) {
        return <a key={item.id} href={url} target="_blank" rel="noreferrer" aria-label="Open image attachment">
          <img src={url} alt="Message attachment" loading="lazy" />
        </a>;
      }
      if (item.contentType?.startsWith("audio/")) return <audio key={item.id} controls preload="none" src={url}>Audio attachment</audio>;
      if (item.contentType?.startsWith("video/")) return <video key={item.id} controls preload="none" src={url}>Video attachment</video>;
      return null;
    })}
  </div>;
}
