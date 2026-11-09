import test from "node:test";
import assert from "node:assert/strict";
import { ukDateKey, ukDateTimeInput, ukInputToInstant } from "../js/time.js";
import { parseTodayVerse } from "../src/dailyverse/model.js";

test("UK dates and scheduling inputs observe GMT and BST", () => {
  assert.equal(ukDateTimeInput("2027-01-01T12:00:00Z"), "2027-01-01T12:00");
  assert.equal(ukDateTimeInput("2027-07-01T12:00:00Z"), "2027-07-01T13:00");
  assert.equal(ukDateKey("2027-07-01T23:30:00Z"), "2027-07-02");
  assert.equal(ukInputToInstant("2027-01-01T12:00"), "2027-01-01T12:00:00.000Z");
  assert.equal(ukInputToInstant("2027-07-01T12:00"), "2027-07-01T11:00:00.000Z");
});
test("scheduling rejects skipped and ambiguous UK clock-change hours", () => {
  assert.throws(() => ukInputToInstant("2027-03-28T01:30"), /clock change/);
  assert.throws(() => ukInputToInstant("2027-10-31T01:30"), /clock change/);
  assert.throws(() => ukInputToInstant("not a date"));
});
test("daily verse rollover supports 23 and 25 hour UK dates", () => {
  for (const [date, serverTime, nextDayAt] of [
    ["2027-03-28", "2027-03-28T00:00:00Z", "2027-03-28T23:00:00Z"],
    ["2027-10-31", "2027-10-30T23:00:00Z", "2027-11-01T00:00:00Z"],
  ]) assert.equal(parseTodayVerse({ date, timeZone: "Europe/London", serverTime, nextDayAt, verse: null }).date, date);
});
