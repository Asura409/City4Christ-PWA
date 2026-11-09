import { UK_TIME_ZONE, ukDateTimeInput, ukInputToInstant } from "../../js/time.js";
export function dateKeyInZone(value, timeZone = UK_TIME_ZONE) {
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
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(event.startsAt));
}

export function localDateTimeToInstant(value) {
  return ukInputToInstant(value);
}

export function instantToLocalDateTime(value) {
  return ukDateTimeInput(value);
}
