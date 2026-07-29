# Plan: Only Show Times Carlos Is Actually Available

## The UX we want

A visitor opening the booking page should **only ever see time slots where Carlos is genuinely free**. Right now the availability check consults just one Google calendar (`GOOGLE_CALENDAR_ID`, currently `primary`), but Carlos's real life lives on several calendars:

- **XFINITY Schedule** — work shifts
- **2026 Fall Schedule** — classes
- **primary** — where the booking system writes its own events (and where bookings currently appear)

Any event on any of those calendars must make its time slot disappear from the picker. Nobody should be able to book over a shift or a class.

## Why it's broken today

`booking-site/lib/google-calendar.ts` → `getBusyIntervals()` sends a freeBusy request with exactly one item:

```ts
items: [{ id: env.google.calendarId }],   // line ~70 — only ONE calendar
```

So events on XFINITY Schedule and 2026 Fall Schedule are invisible to `getOpenSlots()` in `booking-site/lib/open-slots.ts`, and those slots show as bookable.

The good news: the architecture is already right. `getOpenSlots()` is the single source of truth for both the picker (`GET /api/availability`) and the booking POST route, and it already merges Google busy intervals into the slot subtraction. **Only the freeBusy query needs to grow.**

---

## Phase 1 — Discover the calendar IDs

Google identifies calendars by opaque IDs (e.g. `abc123@group.calendar.google.com`), not display names. We need the real IDs for "XFINITY Schedule" and "2026 Fall Schedule".

**Create `booking-site/scripts/list-calendars.mjs`** (mirror the style of the existing `scripts/google-refresh-token.mjs`):

1. Parse `booking-site/.env.local` manually (no dotenv dependency — read the file, regex out `KEY=value` lines).
2. Exchange `GOOGLE_REFRESH_TOKEN` for an access token via `https://oauth2.googleapis.com/token` (same POST shape as `getAccessToken()` in `lib/google-calendar.ts`).
3. GET `https://www.googleapis.com/calendar/v3/users/me/calendarList`.
4. Print each calendar's `summary`, `id`, and whether it's `primary`.
5. End with a hint: paste the wanted IDs into `GOOGLE_BUSY_CALENDAR_IDS` (comma-separated).

Add an npm script to `booking-site/package.json`:

```json
"list-calendars": "node scripts/list-calendars.mjs"
```

**Checkpoint:** run `npm run list-calendars` from `booking-site/` and note the IDs for XFINITY Schedule and 2026 Fall Schedule.

## Phase 2 — New env var

**`booking-site/lib/env.ts`** — add to the `google` block:

```ts
/** Calendars whose events block booking slots. Always includes calendarId. */
busyCalendarIds: (str(process.env.GOOGLE_BUSY_CALENDAR_IDS) ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean),
```

Semantics (implement in Phase 3, not here — keep env.ts dumb):

- The effective busy list = `calendarId` **plus** everything in `busyCalendarIds`, de-duplicated. The booking calendar always counts as busy so the site can never double-book itself, even if the env var is misconfigured.
- Empty/missing env var → behaves exactly like today (only `calendarId`). No breaking change.

**`booking-site/.env.example`** — document it next to the other `GOOGLE_*` vars:

```
# Extra calendars whose events should block booking slots (comma-separated IDs).
# Find IDs with: npm run list-calendars
GOOGLE_BUSY_CALENDAR_IDS=
```

**`booking-site/.env.local`** — set it to the real IDs found in Phase 1.

## Phase 3 — Multi-calendar freeBusy

**`booking-site/lib/google-calendar.ts`** — rework `getBusyIntervals()`:

1. Build the ID list: `[env.google.calendarId, ...env.google.busyCalendarIds]`, de-duplicated (`new Set`).
2. Send them all in one freeBusy request: `items: ids.map((id) => ({ id }))`. One POST, same endpoint — freeBusy natively accepts multiple items; do **not** loop requests.
3. Merge results: iterate `json.calendars` for **every** requested ID and concatenate all `busy` arrays into the returned `Interval[]`.
4. Error handling — per-calendar, not all-or-nothing:
   - If a calendar entry has `errors` (typical cause: ID typo, or calendar not shared with the authorized account), `console.error` a warning naming that calendar ID and **continue with the others**. A misspelled extra calendar must not take down availability for the whole site.
   - Keep the existing behavior where a failed HTTP response throws (the caller in `open-slots.ts` already catches and degrades gracefully).
5. Leave `createCalendarEvent` / `deleteCalendarEvent` untouched — bookings still write to `env.google.calendarId` only.

No changes needed in `open-slots.ts` — it already consumes whatever `getBusyIntervals` returns.

## Phase 4 — Tests

Existing suite lives at `booking-site/lib/__tests__/` (Vitest-style, 23 passing). Add coverage for the new parsing + merging logic:

- `env` parsing: `"a, b ,,c"` → `["a","b","c"]`; unset → `[]`. (If env.ts is awkward to test directly, extract the parse into a tiny pure helper and test that.)
- Busy-merge: given a mocked freeBusy response with two calendars each returning intervals, `getBusyIntervals` returns the concatenation.
- Per-calendar error: one calendar returns `errors`, the other returns busy intervals → the good calendar's intervals still come back, and the failure is logged, not thrown.

If mocking `fetch` inside `google-calendar.ts` is more scaffolding than it's worth, extract the pure "merge calendars object → Interval[]" step into an exported helper and unit-test that instead. Prefer small pure functions over heavy fetch mocks.

**Checkpoint:** `npx vitest run` — all tests green. `npx tsc --noEmit` — zero errors.

## Phase 5 — Live verification

1. Start the dev server (`npm run dev` in `booking-site/`).
2. Hit `GET /api/availability` and confirm `calendarChecked: true` in the response.
3. Cross-check against the real calendar: pick a day with a known class on **2026 Fall Schedule** and a known shift on **XFINITY Schedule**; confirm those windows are absent from the returned slots while genuinely free windows still appear.
4. Load the booking page UI and eyeball the same day in the picker.

## Acceptance criteria

- [ ] Slots overlapping any event on XFINITY Schedule are not offered.
- [ ] Slots overlapping any event on 2026 Fall Schedule are not offered.
- [ ] Existing bookings (primary calendar + DB) still block their slots.
- [ ] With `GOOGLE_BUSY_CALENDAR_IDS` unset, behavior is identical to today.
- [ ] A bad calendar ID in the env var degrades gracefully (warning logged, other calendars still respected, site stays up).
- [ ] `npx tsc --noEmit` and the full test suite pass.

## Notes & gotchas for the implementer

- **freeBusy respects event transparency**: events marked "Free" in Google Calendar don't appear as busy. All-day events default to Free — if Carlos has all-day class entries, they may need to be switched to "Busy" in Google Calendar, or recreated as timed events. Surface this to Carlos during Phase 5 if a known all-day event fails to block slots.
- **Calendar sharing**: freeBusy only works for calendars the authorized Google account can read. Both schedule calendars appear to be on Carlos's own account, so this should be automatic — but if a calendar returns an `errors` entry, check sharing first.
- The token-refresh comment in `google-calendar.ts` warns about OAuth consent screens in "Testing" mode expiring refresh tokens after 7 days — if the token refresh fails during Phase 1, that's the likely cause, not this change.
