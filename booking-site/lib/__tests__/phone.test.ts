import test from "node:test";
import assert from "node:assert/strict";

import { toE164, isValidUsPhone, formatForDisplay, formatAsYouType } from "../phone";

test("accepts the formats people actually type", () => {
  for (const input of [
    "5551234567",
    "555 123 4567",
    "(555) 123-4567",
    "555-123-4567",
    "+1 555 123 4567",
    "1 (555) 123-4567",
    "  555.123.4567  ",
  ]) {
    assert.equal(toE164(input), "+15551234567", `failed on: ${input}`);
  }
});

test("rejects numbers that can't exist", () => {
  assert.equal(toE164("123456"), null); // too short
  assert.equal(toE164("55512345678901"), null); // too long
  assert.equal(toE164("0551234567"), null); // area code can't start 0
  assert.equal(toE164("1551234567"), null); // area code can't start 1
  assert.equal(toE164(""), null);
  assert.equal(toE164("not a phone"), null);
});

test("passes through non-US international numbers", () => {
  assert.equal(toE164("+44 20 7946 0958"), "+442079460958");
});

test("isValidUsPhone mirrors toE164", () => {
  assert.equal(isValidUsPhone("(555) 123-4567"), true);
  assert.equal(isValidUsPhone("nope"), false);
});

test("display formatting round-trips", () => {
  assert.equal(formatForDisplay("+15551234567"), "(555) 123-4567");
  assert.equal(toE164(formatForDisplay("+15551234567")), "+15551234567");
});

test("as-you-type formatting handles every partial length", () => {
  assert.equal(formatAsYouType(""), "");
  assert.equal(formatAsYouType("5"), "(5");
  assert.equal(formatAsYouType("555"), "(555");
  assert.equal(formatAsYouType("5551"), "(555) 1");
  assert.equal(formatAsYouType("555123"), "(555) 123");
  assert.equal(formatAsYouType("5551234567"), "(555) 123-4567");
  // Typing past 10 digits shouldn't run off the end.
  assert.equal(formatAsYouType("55512345679999"), "(555) 123-4567");
  // Re-formatting already-formatted text must be stable, or every keystroke
  // would fight the previous one.
  assert.equal(formatAsYouType("(555) 123-4567"), "(555) 123-4567");
});
