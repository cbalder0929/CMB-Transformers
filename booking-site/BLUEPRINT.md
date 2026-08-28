# Free Session Booking System — White-Label Blueprint

> **What this is:** A complete technical blueprint for building a mobile-first
> booking system for a service-based business (personal training, consulting,
> coaching, etc.). Prospects pick a time slot, fill a form, and the system writes
> the booking to a database, syncs it to Google Calendar, and sends a
> confirmation email with an `.ics` attachment.
>
> Everything below describes **structure and function** — swap in your own brand
> name, colours, copy, and images and the system works the same way.

---

## Table of Contents

1. [Stack & Cost](#1-stack--cost)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [File Structure](#4-file-structure)
5. [Environment Variables](#5-environment-variables)
6. [How Availability Works](#6-how-availability-works)
7. [Booking Lifecycle](#7-booking-lifecycle)
8. [Race Condition Safety](#8-race-condition-safety)
9. [Library Modules](#9-library-modules)
10. [Components](#10-components)
11. [API Routes](#11-api-routes)
12. [Email Templates](#12-email-templates)
13. [Cron Jobs](#13-cron-jobs)
14. [Validation](#14-validation)
15. [Calendar Integration](#15-calendar-integration)
16. [Customization Points](#16-customization-points)
17. [Setup Walkthrough](#17-setup-walkthrough)
18. [Build Order](#18-build-order)
19. [Key Design Decisions](#19-key-design-decisions)
20. [Things That Will Bite You](#20-things-that-will-bite-you)
21. [Future Additions](#21-future-additions)

---

## 1. Stack & Cost

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router)** on Vercel | Frontend and API in one project. Serverless functions keep secrets server-side. Free hobby tier. |
| Database | **Supabase** (Postgres) | Free tier, hosted, Row Level Security so the public form can insert but never read other bookings. |
| Calendar | **Google Calendar API** (OAuth refresh token) | Reads real availability via `freeBusy`, creates events, sends invites. Called over plain `fetch` — no `googleapis` package. |
| Email | **Resend** | 3,000 emails/month free. Clean API, HTML email templates. |
| Styling | **Tailwind CSS** | Mobile-first by default. |
| Validation | **Zod** + React Hook Form | Same schema validates on client and server. |
| Date handling | **date-fns** + **date-fns-tz** | Timezone-safe slot generation. |
| Testing | **Node.js built-in test runner** (`node:test`) | Zero-dependency, runs via `tsx`. |

### Monthly cost at low volume

| Item | Cost |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Resend Free (3,000/mo) | $0 |
| Domain | ~$12/yr |
| **Total** | **~$1/month** (domain amortised) |

Optional add-ons (Twilio SMS, extra calendars) increase cost but are not required for a working system.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│                                                         │
│  Landing Page → Date Picker → Time Slots → Form → Done │
│       ↓                                      ↓          │
│  GET /api/availability              POST /api/bookings  │
└────────────┬──────────────────────────────┬──────────────┘
             │                              │
             ▼                              ▼
┌────────────────────────────────────────────────────────┐
│                    SERVER (API Routes)                  │
│                                                        │
│  getOpenSlots()           validate → re-check slot →   │
│    ├─ config rules        INSERT → calendar event →    │
│    ├─ Google freeBusy     confirmation email            │
│    └─ existing bookings                                 │
└──────┬──────────────┬───────────────┬──────────────────┘
       │              │               │
       ▼              ▼               ▼
   Supabase     Google Calendar     Resend
   (Postgres)   (read/write)        (email)
```

### Core invariants

1. **One function computes availability.** Both the slot picker and the booking route call it. If two paths disagree, a customer discovers the bug.
2. **Slot generation is pure.** No database, no network, no hidden `new Date()`. Everything arrives as an argument. This is what makes timezone and DST tests possible.
3. **Wall clock converts to UTC exactly once.** Weekly rules store business-timezone times ("7am Monday"). The slot generator converts to UTC instants. Everything downstream is UTC.
4. **The database unique index is the real concurrency guarantee.** The availability re-check in the POST route only turns a Postgres error into a polite message.
5. **The service role key never reaches the browser.**
6. **Side effects are best-effort; the booking is not.** Calendar sync and email failures are caught, logged, and never fail the POST.
7. **No fire-and-forget on Vercel.** `await` every side effect before returning the response.
8. **Environment variables are read in one place**, with `isXConfigured()` guards. Missing config degrades gracefully instead of crashing.
9. **Business details live in one config file.** Name, phone, address, session length, booking windows, FAQ copy, form options — never hardcoded in a component or email.

---

## 3. Database Schema

Two tables. Run this in the Supabase SQL editor.

### `bookings`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `created_at` | `timestamptz` | `default now()` |
| `first_name` | `text` | required |
| `last_name` | `text` | required |
| `email` | `text` | required |
| `phone` | `text` | E.164 format: `+15551234567` |
| `goal` | `text` | optional — dropdown selection |
| `experience_level` | `text` | optional — dropdown selection |
| `notes` | `text` | optional free text |
| `sms_consent` | `boolean` | `default false` — for future SMS layer |
| `consent_ip` | `text` | stored for compliance |
| `consent_at` | `timestamptz` | stored for compliance |
| `starts_at` | `timestamptz` | UTC — session start |
| `ends_at` | `timestamptz` | UTC — session end |
| `timezone` | `text` | prospect's timezone for display |
| `status` | `text` | `booked` → `confirmed` → `completed` / `cancelled` / `no_show` |
| `google_event_id` | `text` | for calendar deletion on cancel |
| `confirmation_sent_at` | `timestamptz` | prevents double-send |
| `admin_notified_at` | `timestamptz` | prevents double-send |
| `reminder_24h_sent_at` | `timestamptz` | prevents double-send |
| `reminder_1h_sent_at` | `timestamptz` | prevents double-send |
| `reminder_2h_sent_at` | `timestamptz` | prevents double-send |
| `followup_sent_at` | `timestamptz` | prevents double-send |
| `confirmed_at` | `timestamptz` | when prospect confirmed |
| `cancelled_at` | `timestamptz` | when prospect cancelled |
| `action_token` | `text` UNIQUE | 16 random bytes hex-encoded — used in confirm/cancel links |

### `message_log`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `booking_id` | `uuid` FK → bookings | cascade delete |
| `channel` | `text` | `email` or `sms` |
| `kind` | `text` | `confirmation`, `admin_notification`, `reminder_24h`, etc. |
| `provider_id` | `text` | Resend/Twilio message ID |
| `status` | `text` | `sent`, `failed`, `skipped` |
| `error` | `text` | error message if failed |
| `sent_at` | `timestamptz` | |

### Indexes

```sql
-- THE critical one: prevents double-booking at the database level
CREATE UNIQUE INDEX one_booking_per_slot
  ON bookings (starts_at)
  WHERE status IN ('booked', 'confirmed');

-- For the cron queries
CREATE INDEX bookings_upcoming ON bookings (starts_at, status);

-- For confirm/cancel link lookups
CREATE INDEX bookings_action_token ON bookings (action_token);
```

### Row Level Security

Enable RLS on `bookings`. The anon key should have no policies (or insert-only). All reads and updates go through API routes using the service role key server-side.

---

## 4. File Structure

```
your-booking-site/
├── app/
│   ├── page.tsx                        # Landing page (composes all sections)
│   ├── layout.tsx                      # Root layout, fonts, metadata
│   ├── globals.css                     # Tailwind layers + reusable classes
│   ├── confirmed/[token]/page.tsx      # "You're confirmed" landing page
│   ├── cancel/[token]/page.tsx         # Self-serve cancel page
│   ├── privacy/page.tsx                # Privacy policy (needed for SMS compliance)
│   ├── terms/page.tsx                  # Terms of service
│   └── api/
│       ├── availability/route.ts       # GET → open slots for a date range
│       ├── bookings/route.ts           # POST → create booking + side effects
│       ├── bookings/[token]/
│       │   ├── confirm/route.ts        # POST → mark confirmed
│       │   └── cancel/route.ts         # POST → cancel + free slot
│       └── cron/
│           └── reminders/route.ts      # Hourly: 24h, 2h, 1h reminders
│
├── components/
│   ├── BookingSection.tsx              # Client-side booking flow orchestrator
│   ├── BookingForm.tsx                 # React Hook Form with Zod validation
│   ├── DatePicker.tsx                  # Date selection UI
│   ├── TimeSlots.tsx                   # Available time slot grid
│   ├── SuccessScreen.tsx               # Post-booking confirmation
│   ├── Hero.tsx                        # ← CUSTOMIZE: headline, CTA
│   ├── About.tsx                       # ← CUSTOMIZE: bio, photo
│   ├── Includes.tsx                    # What's included (reads from config)
│   ├── WhyFree.tsx                     # ← CUSTOMIZE: copy
│   ├── Faq.tsx                         # FAQ accordion (reads from config)
│   ├── Footer.tsx                      # ← CUSTOMIZE: links, copyright
│   ├── StickyCta.tsx                   # Sticky bottom CTA button
│   ├── CancelSession.tsx              # Cancellation flow UI
│   ├── StatusCard.tsx                  # Status display for confirm/cancel pages
│   └── FacetBackdrop.tsx              # ← CUSTOMIZE: background effect
│
├── lib/
│   ├── config.ts                       # ← CUSTOMIZE: all business details
│   ├── availability.ts                 # Pure slot generation (no I/O)
│   ├── open-slots.ts                   # Availability = rules − busy − booked
│   ├── validation.ts                   # Zod schemas (client + server)
│   ├── phone.ts                        # Phone normalization (E.164)
│   ├── email.ts                        # Resend API wrapper
│   ├── google-calendar.ts              # Google Calendar REST (no SDK)
│   ├── notifications.ts                # High-level email sends + message_log
│   ├── booking-actions.ts              # confirmBooking(), cancelBooking()
│   ├── ics.ts                          # .ics calendar file generator
│   ├── supabase.ts                     # Supabase client (server-only)
│   ├── env.ts                          # Environment variable parsing
│   └── __tests__/
│       ├── availability.test.ts        # Slot generation + DST tests
│       ├── ics.test.ts                 # ICS format tests
│       └── phone.test.ts              # Phone formatting tests
│
├── emails/
│   ├── shell.ts                        # ← CUSTOMIZE: email header/footer branding
│   ├── confirmation.ts                 # Booking confirmation (customer)
│   ├── admin-notification.ts           # New booking alert (business owner)
│   ├── reminder.ts                     # 24h and 1h reminders
│   └── cancelled.ts                    # Cancellation acknowledgement
│
├── supabase/
│   └── schema.sql                      # Database initialisation script
│
├── scripts/
│   └── google-refresh-token.mjs        # One-time OAuth token minting
│
├── public/
│   ├── bg.jpg                          # ← CUSTOMIZE: background image
│   └── headshot.png                    # ← CUSTOMIZE: provider headshot
│
├── tailwind.config.ts                  # ← CUSTOMIZE: colour palette
├── vercel.json                         # Cron job definitions
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 5. Environment Variables

Create `.env.local` from `.env.example`. These same values must be added manually in Vercel → Settings → Environment Variables for production.

```bash
# --- Required (nothing works without these) ---
NEXT_PUBLIC_SUPABASE_URL=               # Supabase dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # Same location
SUPABASE_SERVICE_ROLE_KEY=              # Same location — NEVER expose to browser

# --- Google Calendar (optional — bookings save without it) ---
GOOGLE_CLIENT_ID=                       # Google Cloud Console → Credentials
GOOGLE_CLIENT_SECRET=                   # Same location
GOOGLE_REFRESH_TOKEN=                   # Run: npm run google-token
BOOKING_CALENDAR_ID=                    # Calendar where events are created
SCHOOL_CALENDAR_ID=                     # Optional: blocks availability only
WORK_CALENDAR_ID=                       # Optional: blocks availability only

# --- Resend / Email (optional — bookings save without it) ---
RESEND_API_KEY=                         # resend.com → API Keys
FROM_EMAIL=                             # Leave blank for sandbox mode

# --- App ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BUSINESS_TIMEZONE=America/Chicago       # Your IANA timezone
TRAINER_PHONE=                          # For admin notifications
CRON_SECRET=                            # Random 16+ char string for cron auth
```

### Graceful degradation

The system is designed so only Supabase is required:

| Service | If missing |
|---|---|
| Supabase | Page shows "booking opens shortly" fallback |
| Google Calendar | Availability uses config rules only (no real-calendar subtraction) |
| Resend | Booking saves, no email sent, logged as `skipped` in `message_log` |

---

## 6. How Availability Works

This is the most important part of the system. A single function (`getOpenSlots`) is the only authority on what is bookable.

```
GET /api/availability?from=2026-07-25&days=14
```

### Computation pipeline

```
 1. Read weekly rules from config
    (e.g. "Monday 7am–9pm, 60-min slots")
         │
         ▼
 2. Generate every theoretical slot in the date range
    (pure function — no I/O, no Date.now())
         │
         ▼
 3. Remove slots overlapping Google Calendar busy intervals
    (calls freeBusy for configured calendars)
         │
         ▼
 4. Remove slots that already have a booked/confirmed row in Supabase
         │
         ▼
 5. Remove slots less than minNoticeHours from now (default: 4h)
         │
         ▼
 6. Return remaining slots grouped by date, with display labels
```

### Why the pure function matters

`availability.ts` does steps 1–2 and is completely pure: no database calls, no network, no `new Date()`. Everything comes in as arguments. This means:

- You can write fast unit tests including DST edge cases
- Timezone logic is testable without mocking
- The function works identically on the server and in tests

`open-slots.ts` does steps 3–5 and is the I/O layer that calls Supabase and Google.

**Both the availability endpoint and the booking endpoint call the same function.** This is deliberate — if they each computed availability differently, they would eventually disagree, and the customer would discover it.

---

## 7. Booking Lifecycle

```
Prospect submits form
  │
  ├─ 1. Server-side validation (Zod schema)
  ├─ 2. Honeypot check (if filled → accept silently, save nothing)
  ├─ 3. Normalise phone to E.164
  ├─ 4. RE-CHECK slot is still open ← critical for race conditions
  ├─ 5. INSERT into bookings (status: 'booked')
  │     └─ Unique index catches simultaneous inserts → 409 response
  ├─ 6. Create Google Calendar event, store google_event_id
  ├─ 7. Send confirmation email with .ics attachment
  └─ 8. Send admin notification email
  │
  ▼
 Steps 6–8 are best-effort. Failures are logged, never block the booking.
  │
  ▼
[24h before] cron sends reminder email with Confirm / Cancel links
  │
  ▼
[2h / 1h before] cron sends final reminder
  │
  ▼
[Prospect clicks cancel link] → status: cancelled, calendar event deleted,
                                 slot reopens automatically
```

### Idempotency

Confirm and cancel operations are idempotent — people click email buttons twice. Confirming an already-confirmed booking returns `{ alreadyDone: true }`. Cancelling an already-cancelled booking does the same.

---

## 8. Race Condition Safety

Two people on the page at the same time, same slot:

1. **Both see the slot** as available (it was, when they loaded the page).
2. **Both submit.** The API re-checks availability. Usually one of them wins here.
3. **If both INSERTs hit Postgres simultaneously**, the unique partial index on `starts_at` rejects the second one.
4. **The loser gets a 409** with "that time was just taken" and the UI refreshes slots.

The re-check (step 2) catches 99% of races. The database index (step 3) catches the 1% where two requests truly overlap. **Never remove the unique index** — it is the only defence that holds under concurrent load.

---

## 9. Library Modules

Each module has a single responsibility. Dependencies flow one way.

| Module | Responsibility | I/O? |
|---|---|---|
| `config.ts` | Business details, booking rules, availability windows, copy | No |
| `env.ts` | Read `process.env`, expose `isXConfigured()` guards | No (reads env once) |
| `availability.ts` | Generate time slots from rules + filter by busy periods | **No** (pure) |
| `open-slots.ts` | Orchestrate: rules + Google + Supabase → open slots | Yes |
| `validation.ts` | Zod schemas for booking form and availability query | No |
| `phone.ts` | `isValidUsPhone()`, `toE164()`, `formatAsYouType()` | No |
| `supabase.ts` | Supabase client factory (service role, server-only) | Yes |
| `google-calendar.ts` | Token refresh, `getBusyIntervals()`, create/delete event | Yes |
| `email.ts` | Resend API wrapper with error handling | Yes |
| `notifications.ts` | High-level sends (confirmation, reminder, etc.) + message_log | Yes |
| `booking-actions.ts` | `confirmBooking()`, `cancelBooking()` — idempotent | Yes |
| `ics.ts` | Generate `.ics` calendar file content | No |

### Dependency rules

- `config.ts` and `env.ts` are leaf modules — imported by everything, import nothing from the project.
- `availability.ts` is pure — it imports only `config.ts` and `date-fns`.
- `supabase.ts` must never be imported from a `"use client"` file.
- `process.env` is only read in `env.ts`.

---

## 10. Components

### Functional components (keep as-is, customise only content)

| Component | What it does |
|---|---|
| `BookingSection` | Client-side orchestrator: fetches availability, manages date/time/form state, handles slot-taken recovery |
| `BookingForm` | React Hook Form with Zod validation. Fields: name, email, phone (auto-format), goal, experience, notes, honeypot |
| `DatePicker` | Horizontal scroll of available dates |
| `TimeSlots` | Tappable grid of available time slots for selected date |
| `SuccessScreen` | Post-booking confirmation with next steps |
| `CancelSession` | Cancel flow with confirmation step |
| `StatusCard` | Status display for confirm/cancel pages |
| `StickyCta` | Sticky bottom CTA that scrolls to booking section |
| `Includes` | "What's included" — reads from `config.sessionIncludes` |
| `Faq` | Accordion — reads from `config.faqs` |

### Brand-specific components (replace content and styling)

| Component | What to customise |
|---|---|
| `Hero` | Headline, subheadline, CTA text |
| `About` | Bio copy, headshot image |
| `WhyFree` | Explanation copy for why the session is free |
| `Footer` | Links, copyright, social |
| `FacetBackdrop` | Background visual effect |

---

## 11. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/availability` | GET | Returns open slots. Query: `from` (YYYY-MM-DD), `days` (1–60). Returns `{ configured: false }` if Supabase not set up. |
| `/api/bookings` | POST | Creates booking. Body: form fields + `startsAt` (ISO UTC). Returns booking summary + `actionToken`. |
| `/api/bookings/[token]/confirm` | POST | Marks booking as confirmed. Idempotent. |
| `/api/bookings/[token]/cancel` | POST | Cancels booking, deletes calendar event. Idempotent. |
| `/api/cron/reminders` | POST | Protected by `CRON_SECRET`. Sends 24h, 2h, 1h reminders. Idempotent via timestamp columns. |

---

## 12. Email Templates

Emails are plain HTML strings built in TypeScript functions. No React Email — just template literals that receive booking data and return an HTML string.

| Template | Sent when | Contains |
|---|---|---|
| `shell.ts` | (wrapper) | Header with business name, footer with contact info. All other templates are wrapped in this. |
| `confirmation.ts` | Immediately on booking | Session details, location, what to bring, `.ics` attachment, confirm/cancel links |
| `admin-notification.ts` | Immediately on booking | Customer name, time, goal, experience, notes — sent to business owner |
| `reminder.ts` | 24h / 1h before | Booking details, confirm/cancel links (customer version) + heads-up (admin version) |
| `cancelled.ts` | On cancellation | Acknowledgement + invitation to rebook |

---

## 13. Cron Jobs

Defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" }
  ]
}
```

The reminders endpoint runs hourly and checks for bookings in three windows:

| Window | Condition | Action |
|---|---|---|
| 24h before | `starts_at` is 23–25h away AND `reminder_24h_sent_at IS NULL` | Send reminder email, stamp column |
| 2h before | `starts_at` is 1.5–2.5h away AND `reminder_2h_sent_at IS NULL` | Send reminder email, stamp column |
| 1h before | `starts_at` is 0.5–1.5h away AND `reminder_1h_sent_at IS NULL` | Send reminder email, stamp column |

**Idempotency:** The timestamp column (`reminder_Xh_sent_at`) is stamped before sending. If the cron runs twice, or fails and retries, nobody gets a duplicate message.

**Auth:** The route rejects any request without `Authorization: ******

---

## 14. Validation

One Zod schema in `validation.ts` is used on **both sides**:

- **Client:** React Hook Form uses it for instant field validation
- **Server:** The POST route re-validates because anything arriving over HTTP is untrusted

```
bookingSchema:
  firstName     - string, required, trimmed
  lastName      - string, required, trimmed
  email         - string, valid email
  phone         - string, valid US phone
  goal          - string, optional
  experienceLevel - string, optional
  notes         - string, optional
  smsConsent    - boolean
  startsAt      - string, valid ISO datetime
  honeypot      - string (hidden field — if filled, it's a bot)
```

---

## 15. Calendar Integration

Google Calendar is called over plain `fetch` — no `googleapis` package. This saves ~50MB of dependencies for two endpoints.

### Functions

| Function | What it does |
|---|---|
| `getAccessToken()` | Exchanges refresh token for short-lived access token |
| `getBusyIntervals(calendarIds, timeMin, timeMax)` | Calls `freeBusy.query` — returns busy time ranges across all configured calendars |
| `createCalendarEvent(booking)` | Creates an event on `BOOKING_CALENDAR_ID` with attendee, description, location |
| `deleteCalendarEvent(eventId)` | Deletes event when booking is cancelled |

### Multi-calendar setup

| Calendar | Used for |
|---|---|
| `BOOKING_CALENDAR_ID` | Events are **written here** and read from here |
| `SCHOOL_CALENDAR_ID` | **Read-only** — blocks availability |
| `WORK_CALENDAR_ID` | **Read-only** — blocks availability |
| `PERSONAL_CALENDAR_ID` | **Read-only** — blocks availability (optional) |

This means if you add a dentist appointment to your personal calendar, the site stops offering that slot automatically.

---

## 16. Customization Points

To adapt this system for a different brand, you only need to change these files:

### Must change

| File | What to change |
|---|---|
| `lib/config.ts` | Business name, owner name, phone, email, address, timezone, availability hours, session length, goal/experience options, FAQ content, "what's included" copy |
| `tailwind.config.ts` | Colour palette (replace the sampled-from-image colours with your brand colours) |
| `app/globals.css` | Gradient definitions in `.text-facet`, `.btn-primary`, `.rule-facet` — update to your palette |
| `public/bg.jpg` | Background image |
| `public/headshot.png` | Provider photo |
| `emails/shell.ts` | Email header/footer branding, colours |
| `.env.example` | Update comments/defaults for your business |
| `app/privacy/page.tsx` | Your privacy policy |
| `app/terms/page.tsx` | Your terms of service |

### Likely change

| File | What to change |
|---|---|
| `components/Hero.tsx` | Headline, subheadline, CTA copy |
| `components/About.tsx` | Bio copy |
| `components/WhyFree.tsx` | Explanation copy |
| `components/Footer.tsx` | Links, copyright |
| `components/FacetBackdrop.tsx` | Background visual treatment |
| `app/layout.tsx` | Page title, meta description, OG tags |

### Do not change (unless extending functionality)

| File | Why |
|---|---|
| `lib/availability.ts` | Pure slot generation — timezone math is correct and tested |
| `lib/open-slots.ts` | Availability orchestration — the single source of truth |
| `lib/validation.ts` | Shared validation — client and server must match |
| `lib/phone.ts` | Phone normalisation — standard E.164 logic |
| `lib/env.ts` | Environment variable parsing — add new vars here |
| `lib/booking-actions.ts` | Confirm/cancel logic — idempotent and correct |
| `lib/google-calendar.ts` | Calendar API — standard OAuth + REST |
| `lib/supabase.ts` | Client factory — nothing brand-specific |
| `lib/ics.ts` | .ics generation — calendar standard |
| `components/BookingSection.tsx` | Booking flow orchestration |
| `components/BookingForm.tsx` | Form logic (content comes from config) |
| `components/DatePicker.tsx` | Date selection UI |
| `components/TimeSlots.tsx` | Time slot UI |
| `supabase/schema.sql` | Database schema |

---

## 17. Setup Walkthrough

### Part 0: Project setup (2 minutes)

1. Clone the repo
2. `cd your-booking-site && npm install`
3. Copy `.env.example` → `.env.local`

### Part A: Supabase (10 minutes)

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste and run `supabase/schema.sql`
3. Go to Project Settings → API → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
4. `npm run dev` — page should load with "Online booking opens shortly" (no availability rules in DB yet, but no error)

### Part B: Google Calendar (30 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a new project
2. Enable the **Google Calendar API**
3. Configure the **OAuth consent screen**:
   - User type: External
   - Add scope: `https://www.googleapis.com/auth/calendar`
   - **Publish the app** (do not leave in Testing — tokens expire after 7 days)
4. Create **OAuth 2.0 credentials** (Web application):
   - Authorized redirect URI: `http://localhost:3000/oauth2callback`
   - Copy Client ID → `GOOGLE_CLIENT_ID`
   - Copy Client Secret → `GOOGLE_CLIENT_SECRET`
5. Run `npm run google-token` → follow browser flow → copy refresh token → `GOOGLE_REFRESH_TOKEN`
6. Create calendars in Google Calendar for your use case (e.g., Bookings, Work, School)
7. Copy each Calendar ID (Settings → Integrate calendar) → env vars

### Part C: Resend (5 minutes)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key → `RESEND_API_KEY`
3. Optionally verify your domain and set `FROM_EMAIL`

### Part D: Deploy to Vercel (5 minutes)

1. Push to GitHub
2. Import in Vercel, set Root Directory to your app folder
3. Add **every** env var from `.env.local` to Vercel → Settings → Environment Variables
4. Deploy. Test on your phone.

> ⚠️ Vercel does **not** read `.env.local`. Every variable must be added by hand. Forgetting one causes silent failures, not crashes.

---

## 18. Build Order

Each step is independently testable.

### Week 1 — Foundation

1. Create Next.js project, deploy empty page to Vercel
2. Create Supabase project, run schema, set RLS
3. Build the static landing page: hero, about, FAQ, what's included
4. Customise `lib/config.ts` with your business details

### Week 2 — Booking core

5. Google Cloud project → Calendar API → OAuth → refresh token
6. Build `lib/google-calendar.ts`, verify freeBusy returns real busy blocks
7. Build `/api/availability` using your actual hours
8. Build the date/time picker against live availability
9. Build the form + `POST /api/bookings` → row created + calendar event appears

### Week 3 — Communications

10. Verify domain in Resend, build email templates
11. Wire confirmation email + .ics into booking route
12. Build admin notification email
13. Build confirm/cancel pages and routes

### Week 4 — Automation and polish

14. Build the cron reminder route with `CRON_SECRET` guard
15. Test by inserting a booking 24h out and hitting the cron URL
16. Privacy policy + terms pages
17. Error states, timezone verification, end-to-end test from another phone

---

## 19. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Pure slot generation** | Testable timezone/DST logic without mocking or network calls |
| **Unique partial index** | Only concurrency defence that works under simultaneous database writes |
| **Re-check slot before INSERT** | Covers the 10-minute gap between page load and form submission |
| **No `googleapis` package** | Token refresh + 2 endpoints doesn't justify ~50MB of dependencies |
| **Email never throws** | A saved booking with a missing email is recoverable; a booking the user thinks failed is not |
| **Action tokens in links** | No login needed for a free session — anyone with the link can confirm/cancel their booking |
| **Message log table** | Prevents duplicate messages; provides audit trail for compliance |
| **Honeypot field** | Bot sees a 200 response and thinks it succeeded; no CAPTCHA friction for real users |
| **Idempotent operations** | Email buttons get clicked twice; the system handles it gracefully |
| **Config as single source** | Change your phone number once → updates landing page, emails, calendar events |
| **Environment variables in one file** | Graceful degradation via `isXConfigured()` guards instead of crashes |

---

## 20. Things That Will Bite You

1. **Double-booking race condition.** The unique index catches it — handle the constraint violation and tell the user to pick another time. Do not rely on the availability check alone.

2. **Timezones.** Store UTC, always. Weekly rules are in your local timezone. The conversion happens once in `availability.ts`. Test with a phone set to a different timezone before launch.

3. **Resend's 100/day sending cap on the free tier.** Fine at low volume; if you run a promo with 30+ bookings per day (each generating 2–3 emails), you'll hit it.

4. **Google refresh tokens expire if the OAuth app stays in "Testing" mode.** Publish the consent screen. If the token dies, re-mint with `npm run google-token`.

5. **Cancelled slots must free up.** Cancelling must update the booking status **and** delete the calendar event. Leaving the event blocks the slot forever because availability subtracts freeBusy.

6. **Supabase free tier pauses after 7 days of inactivity.** If you have a cron job that queries the DB hourly, this keeps it alive. Without it, the first visitor after a quiet week gets an error.

7. **Vercel `.env.local` is not read in production.** Every variable must be added manually in Vercel's dashboard and requires a redeploy to take effect.

8. **`FROM_EMAIL` blank = sandbox mode.** Emails only reach the inbox that owns your Resend account. Verify your domain and set `FROM_EMAIL` before going live.

---

## 21. Future Additions

These are designed into the schema but not yet built:

| Feature | Schema support | Implementation |
|---|---|---|
| **SMS confirmations (Twilio)** | `sms_consent`, `consent_ip`, `consent_at` columns exist | Add `lib/sms.ts`, Twilio webhook at `/api/webhooks/twilio`, A2P 10DLC registration |
| **2-way SMS confirm/cancel** | `booking-actions.ts` already has `confirmBooking()` / `cancelBooking()` | Webhook parses Y/C/STOP replies and calls existing functions |
| **Post-session follow-up** | `followup_sent_at` column exists | Daily cron job, follow-up email template |
| **Admin dashboard** | All data is in Supabase | Protected route at `/admin` with booking list, status updates, blackout management |
| **Rescheduling** | — | Cancel + rebook flow, or dedicated reschedule endpoint |
| **Waitlist** | — | New table, notification when slot opens |
| **Analytics** | — | Event tracking on booking funnel |

---

## npm Commands

```bash
npm run dev            # Start development server (http://localhost:3000)
npm run build          # Production build — run before every push
npm run lint           # ESLint
npm run test           # Node.js built-in test runner via tsx
npm run google-token   # One-time OAuth flow to get GOOGLE_REFRESH_TOKEN
```

---

## Dependencies

```
@hookform/resolvers    # Zod ↔ React Hook Form bridge
@supabase/supabase-js  # Supabase client
date-fns               # Date utilities
date-fns-tz            # Timezone support for date-fns
next                   # Next.js 14
react / react-dom      # React 18
react-hook-form        # Form state management
server-only            # Prevents server code from being imported in browser
zod                    # Schema validation
```

No other runtime dependencies. The Google Calendar API is called with plain `fetch`.

---

## License & Attribution

This blueprint is derived from a working production booking system. Adapt it to your brand, your schedule, and your service. The structure and logic are generic; only the content and styling are specific to any one business.
