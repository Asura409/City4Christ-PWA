export const UK_TIME_ZONE = "Europe/London";

export function ukDateKey(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function ukDateTimeInput(value = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${ukDateKey(date)}T${parts.hour}:${parts.minute}`;
}

// datetime-local carries no timezone. Resolve its UK wall time explicitly,
// rejecting nonexistent or repeated clock-change times rather than guessing.
export function ukInputToInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) throw new Error("Choose a valid UK date and time.");
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) throw new Error("Choose a valid UK date and time.");
  const candidates = new Set();
  for (const shift of [-86400000, 0, 86400000]) {
    const sample = wall + shift;
    const offset = Date.parse(`${ukDateTimeInput(sample)}:00Z`) - sample;
    const candidate = wall - offset;
    if (ukDateTimeInput(candidate) === value) candidates.add(new Date(candidate).toISOString());
  }
  if (candidates.size !== 1) throw new Error("This UK time falls within a clock change. Choose a time outside the repeated or skipped hour.");
  return [...candidates][0];
}
