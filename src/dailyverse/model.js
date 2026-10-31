export function parseTodayVerse(data) {
  const invalid = () => {
    throw new Error("Daily verse response is invalid. Refresh to try again.");
  };
  if (
    !data ||
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    data.timeZone !== "UTC+01:00" ||
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
    end !== Date.parse(data.date + "T23:00:00Z") ||
    new Date(now + 3600000).toISOString().slice(0, 10) !== data.date
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
