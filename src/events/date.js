export function dateKeyInZone(value, timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${part.year}-${part.month}-${part.day}`;
}

export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatEventDateTime(event) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: event.timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(event.startsAt));
}

export function localDateTimeToInstant(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error("Choose a valid event date and time.");
  return date.toISOString();
}

export function instantToLocalDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
