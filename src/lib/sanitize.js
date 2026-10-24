// Safe URL schemes for href/src attributes
const SAFE_SCHEMES = /^(https?|mailto|tel):/i;

/**
 * Allow only safe URL schemes — blocks javascript:, data:, vbscript: etc.
 * Use on any href/src value that comes from user input or an API.
 */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  return SAFE_SCHEMES.test(trimmed) ? trimmed : '#';
}

export function safeImageUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "images.unsplash.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !url.pathname.startsWith("/photo-")
    ) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function youtubeEmbedUrl(value) {
  if (!value || typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const id = url.searchParams.get("v");
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.youtube.com" ||
      url.pathname !== "/watch" ||
      url.hash ||
      url.username ||
      url.password ||
      url.port ||
      url.searchParams.getAll("v").length !== 1 ||
      !/^[A-Za-z0-9_-]{11}$/.test(id || "")
    ) return "";
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return "";
  }
}

/**
 * Strip non-digit/plus characters from a phone number before placing in tel: href.
 */
export function safeTel(tel) {
  if (!tel || typeof tel !== 'string') return '';
  return tel.replace(/[^+\d]/g, '');
}

/**
 * Truncate text to maxLen — prevents absurdly long user strings breaking layout.
 */
export function truncate(str, maxLen = 500) {
  if (!str || typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
