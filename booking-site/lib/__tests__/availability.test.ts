import test from "node:test";
import assert from "node:assert/strict";

import {
  calendarDates,
  dayOfWeek,
  generateSlots,
  isSlotOpen,
  overlaps,
  subtractBusy,
  withOpenSlots,
} from "../availability";
import type { AvailabilityRule } from "../availability";

const TZ = "America/Chicago";

const rule = (
  day: number,
  start: string,
  end: string,
  slot = 60,
): AvailabilityRule => ({
  day_of_week: day,
  start_time: start,
  end_time: end,
  slot_minutes: slot,
  active: true,
});

/** No minimum-notice filtering — useful when asserting on raw generation. */
const longAgo = new Date("2000-01-01T00:00:00Z");

test("calendarDates walks forward and does not skip", () => {
  assert.deepEqual(calendarDates("2026-07-30", 4), [
    "2026-07-30",
    "2026-07-31",
    "2026-08-01",
    "2026-08-02",
  ]);
});

test("calendarDates crosses a DST boundary without losing or repeating a day", () => {
  // US DST starts Sunday 2026-03-08.
  assert.deepEqual(calendarDates("2026-03-06", 5), [
    "2026-03-06",
    "2026-03-07",
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
  ]);
});

test("dayOfWeek is 0=Sunday in the business timezone", () => {
  assert.equal(dayOfWeek("2026-03-08", TZ), 0); // Sunday
  assert.equal(dayOfWeek("2026-03-09", TZ), 1); // Monday
  assert.equal(dayOfWeek("2026-08-01", TZ), 6); // Saturday
});

test("a 3-hour window at 60 minutes yields exactly 3 slots", () => {
  const [day] = generateSlots({
    rules: [rule(1, "06:00:00", "09:00:00")],
    dates: ["2026-08-03"], // a Monday
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });

  assert.equal(day.slots.length, 3);
  assert.deepEqual(
    day.slots.map((s) => s.label),
    ["6:00 AM", "7:00 AM", "8:00 AM"],
  );
});

test("a partial trailing slot is never offered", () => {
  // 06:00–08:30 at 60 minutes = two slots, not two and a half.
  const [day] = generateSlots({
    rules: [rule(1, "06:00:00", "08:30:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });
  assert.equal(day.slots.length, 2);
});

test("rules only fire on their own day of the week", () => {
  const days = generateSlots({
    rules: [rule(6, "08:00:00", "10:00:00")], // Saturday only
    dates: ["2026-08-03", "2026-08-08"], // Mon, Sat
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });
  assert.equal(days[0].slots.length, 0);
  assert.equal(days[1].slots.length, 2);
});

test("overlapping rules on one day are deduped and sorted", () => {
  const [day] = generateSlots({
    rules: [rule(1, "06:00:00", "09:00:00"), rule(1, "08:00:00", "11:00:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });

  // 6,7,8 and 8,9,10 -> five distinct starts, in order.
  assert.deepEqual(
    day.slots.map((s) => s.label),
    ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM"],
  );
});

// ---------------------------------------------------------------------------
// The bit that actually breaks booking systems
// ---------------------------------------------------------------------------

test("6am Central is 11:00 UTC during daylight time", () => {
  const [day] = generateSlots({
    rules: [rule(1, "06:00:00", "07:00:00")],
    dates: ["2026-08-03"], // August, CDT = UTC-5
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });
  assert.equal(day.slots[0].startsAt, "2026-08-03T11:00:00.000Z");
});

test("6am Central is 12:00 UTC during standard time", () => {
  const [day] = generateSlots({
    rules: [rule(5, "06:00:00", "07:00:00")],
    dates: ["2026-03-06"], // Friday before spring-forward, CST = UTC-6
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });
  assert.equal(day.slots[0].startsAt, "2026-03-06T12:00:00.000Z");
});

test("the same wall-clock rule shifts UTC across spring-forward", () => {
  const before = generateSlots({
    rules: [rule(5, "06:00:00", "07:00:00")],
    dates: ["2026-03-06"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  })[0];

  const after = generateSlots({
    rules: [rule(1, "06:00:00", "07:00:00")],
    dates: ["2026-03-09"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  })[0];

  assert.equal(before.slots[0].startsAt, "2026-03-06T12:00:00.000Z");
  assert.equal(after.slots[0].startsAt, "2026-03-09T11:00:00.000Z");
  // Both still read as 6:00 AM to the person booking. That's the whole point.
  assert.equal(before.slots[0].label, "6:00 AM");
  assert.equal(after.slots[0].label, "6:00 AM");
});

test("the same wall-clock rule shifts UTC across fall-back", () => {
  // DST ends Sunday 2026-11-01.
  const before = generateSlots({
    rules: [rule(5, "06:00:00", "07:00:00")],
    dates: ["2026-10-30"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  })[0];

  const after = generateSlots({
    rules: [rule(1, "06:00:00", "07:00:00")],
    dates: ["2026-11-02"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  })[0];

  assert.equal(before.slots[0].startsAt, "2026-10-30T11:00:00.000Z");
  assert.equal(after.slots[0].startsAt, "2026-11-02T12:00:00.000Z");
});

test("an evening slot doesn't roll onto the wrong calendar date", () => {
  // 7pm Central is 00:00 UTC the NEXT day. The label must still say 7 PM,
  // and the day must still be Monday.
  const [day] = generateSlots({
    rules: [rule(1, "19:00:00", "20:00:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });
  assert.equal(day.slots[0].startsAt, "2026-08-04T00:00:00.000Z");
  assert.equal(day.slots[0].label, "7:00 PM");
  assert.equal(day.date, "2026-08-03");
  assert.equal(day.weekday, "Mon");
});

// ---------------------------------------------------------------------------
// Notice window and subtraction
// ---------------------------------------------------------------------------

test("minNoticeHours removes slots that are too soon", () => {
  // 10:00 UTC = 5:00 AM Central. With a 4-hour buffer, 6am and 7am are out,
  // 9am survives (9am CDT = 14:00 UTC, which is > 14:00... just).
  const now = new Date("2026-08-03T10:00:00Z"); // 5:00 AM Central
  const [day] = generateSlots({
    rules: [rule(1, "06:00:00", "12:00:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now,
    minNoticeHours: 4,
  });

  // Earliest allowed instant is 14:00Z = 9:00 AM Central.
  assert.deepEqual(
    day.slots.map((s) => s.label),
    ["9:00 AM", "10:00 AM", "11:00 AM"],
  );
});

test("overlaps is exclusive at the boundaries — back-to-back sessions are fine", () => {
  const a = { start: new Date("2026-08-03T11:00:00Z"), end: new Date("2026-08-03T12:00:00Z") };
  const b = { start: new Date("2026-08-03T12:00:00Z"), end: new Date("2026-08-03T13:00:00Z") };
  assert.equal(overlaps(a, b), false);

  const c = { start: new Date("2026-08-03T11:30:00Z"), end: new Date("2026-08-03T12:30:00Z") };
  assert.equal(overlaps(a, c), true);
});

test("subtractBusy removes only the colliding slot", () => {
  const days = generateSlots({
    rules: [rule(1, "06:00:00", "09:00:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });

  // A dentist appointment 7:30–8:15 Central kills the 7am and 8am slots.
  const busy = [
    { start: new Date("2026-08-03T12:30:00Z"), end: new Date("2026-08-03T13:15:00Z") },
  ];

  const result = subtractBusy(days, busy);
  assert.deepEqual(
    result[0].slots.map((s) => s.label),
    ["6:00 AM"],
  );
});

test("a day with everything taken drops out of the picker", () => {
  const days = generateSlots({
    rules: [rule(1, "06:00:00", "08:00:00")],
    dates: ["2026-08-03", "2026-08-10"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });

  const busy = [
    { start: new Date("2026-08-03T00:00:00Z"), end: new Date("2026-08-04T00:00:00Z") },
  ];

  const open = withOpenSlots(subtractBusy(days, busy));
  assert.equal(open.length, 1);
  assert.equal(open[0].date, "2026-08-10");
});

test("isSlotOpen matches on the instant, not the string", () => {
  const days = generateSlots({
    rules: [rule(1, "06:00:00", "08:00:00")],
    dates: ["2026-08-03"],
    timezone: TZ,
    now: longAgo,
    minNoticeHours: 0,
  });

  // Same moment, different serialisation — must still be recognised.
  assert.ok(isSlotOpen(days, "2026-08-03T11:00:00.000Z"));
  assert.ok(isSlotOpen(days, "2026-08-03T06:00:00-05:00"));
  assert.equal(isSlotOpen(days, "2026-08-03T15:00:00.000Z"), null);
});
