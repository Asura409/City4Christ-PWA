import test from "node:test";
import assert from "node:assert/strict";
import { parseTodayVerse, nextVerseRefresh } from "../src/dailyverse/model.js";
const result = () => ({
  date: "2026-10-31",
  timeZone: "UTC+01:00",
  serverTime: "2026-10-31T22:59:59Z",
  nextDayAt: "2026-10-31T23:00:00Z",
  verse: {
    id: "11111111-1111-4111-8111-111111111111",
    displayDate: "2026-10-31",
    text: "Synthetic test verse.",
    scriptureReference: "Test 1:1",
    translation: "",
  },
});
test("daily verse timing uses server timestamps and accounts for request time", () => {
  const r = parseTodayVerse(result());
  assert.equal(nextVerseRefresh(r, 250), 750);
  assert.equal(nextVerseRefresh(r, 2000), 0);
  assert.equal(parseTodayVerse({ ...result(), verse: null }).verse, null);
});
test("daily verse rejects date, timezone and publication mismatches", () => {
  for (const changed of [
    { date: "2026-11-01" },
    { timeZone: "UTC" },
    { serverTime: "bad" },
    { nextDayAt: "2026-11-01T00:00:00Z" },
    { verse: { ...result().verse, displayDate: "2026-11-01" } },
    { verse: { ...result().verse, text: { html: "unsafe" } } },
  ])
    assert.throws(() => parseTodayVerse({ ...result(), ...changed }));
});
