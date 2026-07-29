import test from "node:test";
import assert from "node:assert/strict";

import { buildIcs, toIcsUtc } from "../ics";

const base = {
  uid: "booking-abc@cmbbookings",
  summary: "Free session",
  startsAt: "2026-07-29T23:00:00.000Z",
  endsAt: "2026-07-30T00:00:00.000Z",
  organizerName: "CMB Bookings",
  organizerEmail: "hello@cmbbookings.com",
};

test("timestamps are UTC basic-format, no punctuation, no milliseconds", () => {
  assert.equal(toIcsUtc("2026-07-29T23:00:00.000Z"), "20260729T230000Z");
  // A 6pm Central booking must serialise as the 23:00Z instant, not 18:00.
  assert.match(buildIcs(base), /DTSTART:20260729T230000Z/);
  assert.match(buildIcs(base), /DTEND:20260730T000000Z/);
});

test("rejects an unparseable date rather than emitting Invalid Date", () => {
  assert.throws(() => toIcsUtc("not a date"));
});

test("every line ends CRLF, including the last", () => {
  const ics = buildIcs(base);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  // A bare LF anywhere would be a lone \n not preceded by \r.
  assert.equal(/[^\r]\n/.test(ics), false);
});

test("escapes the four characters RFC 5545 reserves", () => {
  const ics = buildIcs({
    ...base,
    summary: "Session; with, punctuation\\ and",
    description: "line one\nline two",
  });
  assert.match(ics, /SUMMARY:Session\\; with\\, punctuation\\\\ and/);
  assert.match(ics, /DESCRIPTION:line one\\nline two/);
});

test("folds long lines at 75 octets with a leading-space continuation", () => {
  const ics = buildIcs({ ...base, summary: "x".repeat(200) });
  for (const line of ics.split("\r\n")) {
    assert.ok(
      Buffer.from(line, "utf8").length <= 75,
      `line exceeds 75 octets: ${line.length}`,
    );
  }
  assert.match(ics, /\r\n /);
});

test("folding never splits a multi-byte character", () => {
  // Every char is 4 bytes, so a naive 75-char split lands mid-character.
  const ics = buildIcs({ ...base, summary: "🏋".repeat(60) });
  for (const line of ics.split("\r\n")) {
    assert.equal(line.includes("�"), false, "replacement char = split mid-sequence");
  }
  // Unfolding puts it back exactly.
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes(`SUMMARY:${"🏋".repeat(60)}`));
});

test("carries the properties a calendar client needs to file the event", () => {
  const ics = buildIcs({ ...base, location: "The Gym, 1 Main St", description: "Bring water" });
  for (const prop of [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${base.uid}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]) {
    assert.ok(ics.includes(prop), `missing ${prop}`);
  }
  assert.match(ics, /DTSTAMP:\d{8}T\d{6}Z/);
  assert.match(ics, /ORGANIZER;CN=CMB Bookings:mailto:hello@cmbbookings\.com/);
});

test("optional fields are omitted rather than emitted empty", () => {
  const ics = buildIcs(base);
  assert.equal(ics.includes("LOCATION:"), false);
  assert.equal(ics.includes("URL:"), false);
});
