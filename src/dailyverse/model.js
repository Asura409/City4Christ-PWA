import { UK_TIME_ZONE, ukDateKey, ukInputToInstant } from "../../js/time.js";
export function parseTodayVerse(data) {
  const invalid = () => {
    throw new Error("Daily verse response is invalid. Refresh to try again.");
  };
  if (
    !data ||
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    data.timeZone !== UK_TIME_ZONE ||
    typeof data.serverTime !== "string" ||
    typeof data.nextDayAt !== "string"
  )
    invalid();
  const now = Date.parse(data.serverTime),
    end = Date.parse(data.nextDayAt);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(end) ||
    end <= now ||
    ukDateKey(now) !== data.date ||
    end !== Date.parse(ukInputToInstant(new Date(Date.parse(data.date + "T12:00:00Z") + 86400000).toISOString().slice(0, 10) + "T00:00"))
  )
    invalid();
  if (data.verse !== null) {
    const v = data.verse;
    if (
      !v ||
      typeof v.id !== "string" ||
      v.displayDate !== data.date ||
      typeof v.text !== "string" ||
      !v.text.trim() ||
      typeof v.scriptureReference !== "string" ||
      !v.scriptureReference.trim() ||
      typeof v.translation !== "string"
    )
      invalid();
  }
  return data;
}
export function nextVerseRefresh(data, elapsed = 0) {
  return Math.max(
    0,
    Date.parse(data.nextDayAt) -
      Date.parse(data.serverTime) -
      Math.max(0, elapsed),
  );
}
