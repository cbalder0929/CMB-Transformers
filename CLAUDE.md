# CMB Bookings

Booking system for a personal training business. Prospects land on a mobile-first
page, pick a slot, and book a free session; the booking writes to Supabase, syncs
to Google Calendar, and sends a confirmation email with an `.ics` attachment.

The business is **CMB Bookings**. The repo folder is still named
`CMB Transformations` — that's a legacy name from before the rebrand. Don't
reintroduce "Transformations" into any user-facing copy.

## Layout

```
booking-site/                       the Next.js app — this is the product
cmb-site/                           standalone static-HTML version (no build, no API keys)
CMB-Booking-Architecture-Plan.md    stack, schema, layer-by-layer build plan
Multi-Calendar-Availability-Plan.md multi-calendar availability design
progress-photos/                    untracked screenshots
```

`booking-site/` and `cmb-site/` are two separate answers to the same problem.
Assume any request means `booking-site/` unless the user says otherwise —
`cmb-site/` is a fallback that embeds a Google Calendar scheduler and has no
server side at all.

## Commands

**All npm commands run from `booking-site/`.** There is no workspace root.

```bash
npm run dev            # next dev — http://localhost:3000
npm run build          # run before every push
npm run lint
npm run test           # node --test via tsx, over lib/__tests__/*.test.ts
npm run google-token   # one-time OAuth flow to mint GOOGLE_REFRESH_TOKEN
```

Tests use the built-in `node:test` runner — no Jest, no Vitest. New tests go in
`lib/__tests__/` and must stay pure (see below).

## Stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · Supabase (Postgres) ·
Google Calendar REST · Resend · Zod + React Hook Form · deployed on Vercel.
Path alias is `@/*` → `booking-site/*`.

Google Calendar is called over plain `fetch`, deliberately — do not add the
`googleapis` package for two endpoints.

## Invariants

These are load-bearing. Breaking one produces a double-booked Saturday morning,
a leaked service key, or a booking the prospect thinks failed.

**`lib/open-slots.ts` is the only authority on what is bookable.** Both the
picker (`GET /api/availability`) and the booking route call it. Never compute
availability anywhere else — if the two paths disagree, you learn about it from
a customer.

**`lib/availability.ts` is pure.** No database, no network, no hidden
`new Date()`. Everything arrives as an argument. That is what makes the DST and
timezone tests possible; keep it that way.

**Wall clock converts to UTC exactly once.** Weekly rules in `lib/config.ts`
store business-timezone wall clock ("7am Monday"). `generateSlots` converts to
UTC instants. Everything downstream is a UTC instant. Don't convert again.

**The partial unique index is the real concurrency guarantee.**
`bookings(starts_at) where status in ('booked','confirmed')`. The availability
re-check in `POST /api/bookings` only turns a Postgres error into a polite
message — it is not the defence. Never drop that index.

**The service role key never reaches the browser.** `lib/supabase.ts` is
imported only from `app/api/**` and server components. If you find yourself
importing it from a `"use client"` file, stop.

**Side effects are best-effort; the booking is not.** Calendar sync and email
failures are caught, logged, and never fail the POST. A booking that saved but
didn't sync is recoverable; a booking the prospect believes failed is not.

**No fire-and-forget on Vercel.** The serverless function freezes the moment the
response returns, so a dangling promise is killed mid-flight. `await` every side
effect before returning, even the ones whose result you ignore.

**`lib/env.ts` is the only place `process.env` is read**, and it never throws.
Missing config degrades to a friendly message via the `isXConfigured()` guards.
Add new variables there, to `.env.example`, and to the Vercel checklist in
`booking-site/SETUP.md`.

**Business details live in `lib/config.ts`.** Name, phone, address, session
length, booking windows, FAQ copy, form options. Never hardcode them in a
component or email template.

## Conventions

- Database columns are `snake_case`; TypeScript is `camelCase`. The mapping
  happens at the API boundary.
- The `Booking` type in `lib/supabase.ts` is hand-written, not generated. Any
  change to `supabase/schema.sql` needs a matching edit there.
- `lib/validation.ts` holds one Zod schema used on both sides — React Hook Form
  in the browser, and again in the route handler, because anything arriving over
  HTTP is a stranger's opinion.
- Booking mutations go through `lib/booking-actions.ts` (`confirmBooking`,
  `cancelBooking`), which are idempotent because people click email buttons
  twice. Twilio webhooks will call the same functions — don't duplicate the
  logic in a route.
- Every outbound message is recorded in `message_log`, via `lib/notifications.ts`.
- Cancelling must free the row *and* delete the calendar event. Leaving the event
  behind blocks the slot forever, since availability subtracts freeBusy too.

## Design

Mobile-first; desktop is the secondary case. Review changes at an iPhone-sized
viewport first.

The Tailwind palette in `tailwind.config.ts` is sampled pixel-by-pixel from
`public/bg.jpg` (amber → flame → ember → rose → plum → azure → cyan → aqua, over
a `night` indigo base), which is why accents never fight the background. Pick
from those tokens rather than introducing new hex values.

Reusable classes live in `app/globals.css`: `.glass` / `.glass-dark` (the
structural unit of the page), `.btn-primary` / `.btn-glass`, `.text-facet`,
`.rule-facet`, `.tap-target`.

## Environment & deploys

`.env.local` is gitignored and **never reaches Vercel**. Every variable must be
added by hand in Vercel → Settings → Environment Variables, then redeployed.
This has already caused one production outage where availability silently
returned "not configured". `booking-site/SETUP.md` has the full checklist;
`.env.example` documents each value.

Only Supabase is required. Google Calendar and Resend are optional by design —
bookings still save without them.

## Known rough edges

- The block comment above the Google section of `open-slots.ts` claims a
  freeBusy failure falls back to database-only availability. It doesn't — the
  error propagates and the request fails. Failing closed is the intended
  behaviour (never show a possibly-occupied slot); the outer comment is stale.
- The layer checklists in `README.md` and `booking-site/README.md` are behind
  the code. Layers 1–5 are implemented; Layer 6 (Twilio SMS + two-way confirm)
  and Layer 7 (reminder/follow-up crons) are not. Trust the source tree.
- `lib/config.ts` still carries placeholder gym name, address, and email marked
  with a TODO. Don't treat them as real.
