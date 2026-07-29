# CMB Bookings — Free Session Booking System
## Full Architecture & Build Plan

**Goal:** A mobile-first page where prospects book a free personal training session. It writes to your Google Calendar, sends confirmation emails and SMS reminders, and asks people to confirm before the session so you don't waste your time on no-shows.

**Verified:** July 2026 pricing and compliance requirements.

---

## 1. The Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** on Vercel | Frontend and backend in one project. API routes handle the calendar/email/SMS calls server-side so your keys are never exposed. Free hobby tier. |
| Database | **Supabase** (Postgres) | Free tier, hosted, generous limits. Row Level Security so the public form can insert but never read other people's bookings. |
| Calendar | **Google Calendar API** (service account + domain delegation, or OAuth refresh token) | Reads your real availability, creates events, sends invites. |
| Email | **Resend** | 3,000 emails/month free. Clean API, React Email templates. |
| SMS | **Twilio** | The only realistic option for two-way SMS (reply YES/CANCEL) in the US. |
| Scheduled jobs | **Vercel Cron** | Free, built in. This is what fires reminders. |
| Styling | **Tailwind CSS** | Mobile-first by default. |
| Validation | **Zod** + React Hook Form | Same schema validates on client and server. |

### Real monthly cost

| Item | Cost |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Resend Free (3,000/mo, 100/day cap) | $0 |
| Twilio phone number | ~$1.15/mo |
| A2P 10DLC brand registration (one-time) | $4 |
| A2P campaign vetting (one-time) | $15 |
| A2P campaign (monthly) | $2/mo |
| SMS: ~$0.0083 + $0.005 carrier fee ≈ **$0.013/msg** | ~$4/mo at 100 bookings × 3 msgs |
| Domain | ~$12/yr |

**Realistic: ~$19 to start, then ~$7–10/month** at low volume.

> ⚠️ **Supabase free-tier gotcha:** projects pause after 7 days with zero database activity, and take ~30 seconds to wake. Your hourly reminder cron queries the DB, which keeps it alive permanently. Not a problem for you — but don't remove that cron.

---

## 2. Database Schema

Three tables. Run this in the Supabase SQL editor.

```sql
-- Your bookable windows. You control these; the site reads them.
create table availability_rules (
  id            uuid primary key default gen_random_uuid(),
  day_of_week   int not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time    time not null,
  end_time      time not null,
  slot_minutes  int not null default 60,
  active        boolean not null default true
);

-- One-off blocks: vacation, a busy Saturday, etc.
create table blackout_dates (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text
);

-- The core table.
create table bookings (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- Prospect info
  first_name          text not null,
  last_name           text not null,
  email               text not null,
  phone               text not null,          -- store E.164: +15551234567
  goal                text,                   -- "lose weight" / "build muscle" / etc.
  experience_level    text,
  notes               text,

  -- Consent (legally required to keep)
  sms_consent         boolean not null default false,
  consent_ip          text,
  consent_at          timestamptz,

  -- Scheduling
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  timezone            text not null default 'America/Chicago',

  -- Lifecycle
  status              text not null default 'booked',
    -- booked | confirmed | cancelled | completed | no_show
  google_event_id     text,

  -- Reminder tracking (prevents double-sends)
  confirmation_sent_at  timestamptz,
  reminder_24h_sent_at  timestamptz,
  reminder_2h_sent_at   timestamptz,
  followup_sent_at      timestamptz,
  confirmed_at          timestamptz,
  cancelled_at          timestamptz,

  -- Short token used in confirm/cancel links
  action_token        text not null unique default encode(gen_random_bytes(16), 'hex')
);

-- Prevents two people booking the same slot at the DB level.
create unique index one_booking_per_slot
  on bookings (starts_at)
  where status in ('booked', 'confirmed');

create index bookings_upcoming on bookings (starts_at, status);

-- Log every message for debugging and compliance proof.
create table message_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete cascade,
  channel     text not null,      -- email | sms
  kind        text not null,      -- confirmation | reminder_24h | reminder_2h | followup
  provider_id text,
  status      text,
  sent_at     timestamptz not null default now()
);
```

**Row Level Security:** enable RLS on `bookings`. Allow `INSERT` from the anon key, allow nothing else. All reads and updates go through your API routes using the service role key, which stays server-side.

---

## 3. File Structure

```
cmb-booking/
├── app/
│   ├── page.tsx                        # Landing + booking form
│   ├── layout.tsx
│   ├── confirmed/[token]/page.tsx      # "You're confirmed" landing
│   ├── cancel/[token]/page.tsx         # Self-serve cancel
│   ├── privacy/page.tsx                # Required for SMS compliance
│   ├── terms/page.tsx
│   └── api/
│       ├── availability/route.ts       # GET  → open slots for a date range
│       ├── bookings/route.ts           # POST → create booking, fire confirmations
│       ├── bookings/[token]/
│       │   ├── confirm/route.ts        # GET  → mark confirmed
│       │   └── cancel/route.ts         # GET  → cancel + free the slot
│       ├── webhooks/twilio/route.ts    # POST → inbound SMS replies (Y / C / STOP)
│       └── cron/
│           ├── reminders/route.ts      # hourly
│           └── followups/route.ts      # daily
├── components/
│   ├── Hero.tsx
│   ├── DatePicker.tsx                  # horizontal scroll of next 14 days
│   ├── TimeSlots.tsx                   # tappable slot grid
│   ├── BookingForm.tsx
│   ├── ConsentCheckbox.tsx
│   └── SuccessScreen.tsx
├── lib/
│   ├── supabase.ts                     # server + browser clients
│   ├── google-calendar.ts              # auth, freeBusy, create/delete event
│   ├── availability.ts                 # slot generation logic
│   ├── email.ts                        # Resend wrappers
│   ├── sms.ts                          # Twilio wrappers
│   ├── phone.ts                        # normalize to E.164
│   └── validation.ts                   # Zod schemas
├── emails/
│   ├── Confirmation.tsx
│   ├── Reminder.tsx
│   └── Followup.tsx
├── vercel.json                         # cron definitions
└── .env.local
```

---

## 4. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only — never expose

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=               # usually your gmail address

# Resend
RESEND_API_KEY=
FROM_EMAIL=hello@cmbbookings.com

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...

# App
NEXT_PUBLIC_SITE_URL=https://cmbbookings.com
CRON_SECRET=                      # random string; guards cron endpoints
BUSINESS_TIMEZONE=America/Chicago
TRAINER_NAME=Charles
TRAINER_PHONE=+1...
```

---

## 5. How Availability Works

This is the part that separates a real booking site from a form.

```
GET /api/availability?from=2026-07-25&to=2026-08-08
```

1. Pull `availability_rules` → generate every theoretical slot in the range
2. Drop slots inside any `blackout_dates` window
3. Drop slots that already have a `booked` or `confirmed` row
4. Call **Google Calendar `freeBusy`** → drop slots overlapping anything already on your calendar
5. Drop slots less than **4 hours** from now (your buffer — tune it)
6. Return grouped by date

Step 4 matters. It means if you add a dentist appointment to your personal calendar, the site stops offering that slot automatically. Without it, you'll double-book yourself within a week.

**Timezone rule:** store everything in `timestamptz` (UTC). Convert to `America/Chicago` for display and to the prospect's local zone in the confirmation email. Getting this wrong is the single most common bug in booking systems — someone books "6pm," gets a reminder for "4pm," and doesn't show.

---

## 6. The Booking Lifecycle

```
Prospect submits form
  │
  ├─ Validate (Zod) → normalize phone to E.164
  ├─ Re-check slot is still open  ← critical, prevents race conditions
  ├─ INSERT booking (status: booked)
  ├─ Create Google Calendar event, save google_event_id
  ├─ Send confirmation EMAIL (with .ics attachment)
  └─ Send confirmation SMS (if consented)
  │
  ▼
[24h before] hourly cron fires
  └─ SMS: "Hey {name}, still on for your free session tomorrow
           at 6:00 PM? Reply Y to confirm or C to cancel."
  └─ Email with big Confirm / Cancel buttons (for non-SMS folks)
  │
  ▼
Reply arrives at /api/webhooks/twilio
  ├─ "Y"/"YES"  → status: confirmed → you get a text
  ├─ "C"/"CANCEL" → status: cancelled, delete calendar event,
  │                  slot reopens automatically
  ├─ "STOP"     → set sms_consent = false, stop all texts
  └─ anything else → forward the message to your phone
  │
  ▼
[2h before] cron
  └─ SMS: "See you at 6:00 PM today at {location}. — Charles"
  │
  ▼
[Session happens]
  │
  ▼
[Next morning] daily cron
  └─ Follow-up email → this is where free becomes paid
```

### Why the confirm step earns its keep

No-show rates on free consultations run high. A 24-hour "still coming?" text does two things: it recovers slots from people who quietly bailed (so you can rebook them), and the act of replying "Y" is a small commitment that measurably increases show-up rate.

---

## 7. Cron Setup

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/followups", "schedule": "0 14 * * *" }
  ]
}
```

The reminders job, each hour:

```
A) Find bookings where starts_at is 23–25h away
   AND reminder_24h_sent_at IS NULL
   AND status = 'booked'
   → send confirm-request SMS + email, stamp reminder_24h_sent_at

B) Find bookings where starts_at is 1.5–2.5h away
   AND reminder_2h_sent_at IS NULL
   AND status IN ('booked','confirmed')
   → send reminder SMS, stamp reminder_2h_sent_at
```

Stamping the timestamp is what makes this idempotent. If a cron run fails halfway or runs twice, nobody gets texted twice.

Guard both routes: reject any request whose `Authorization` header isn't `Bearer ${CRON_SECRET}`.

---

## 8. SMS Compliance — Do Not Skip This

US carriers block unregistered A2P traffic. This is not optional and it's the step most likely to derail your launch, so do it first — registration takes days, not minutes.

**A2P 10DLC registration (via Twilio console):**

- No EIN? Register as a **Sole Proprietor** brand — $4 one-time
- Campaign vetting — $15 one-time
- Campaign — $2/month
- Sole Proprietor is throughput-limited but fine for your volume

**Required on the booking form**, next to an *unchecked* checkbox:

> ☐ I agree to receive appointment reminders and confirmations by text message from CMB Bookings at the number provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. See our [Privacy Policy](/privacy) and [Terms](/terms).

**Required elsewhere:**

- Privacy policy page stating you never sell or share phone numbers for marketing
- Terms page
- `STOP` / `UNSUBSCRIBE` / `HELP` handled in the webhook (Twilio auto-handles STOP but store it too)
- Every message identifies your business by name

Store `consent_ip` and `consent_at` on every booking. If a complaint ever lands, that record is your defense.

---

## 9. Message Templates

**Confirmation SMS** (immediately on booking)
> CMB Bookings: You're booked! Free session {day}, {date} at {time} with Charles. Location: {address}. Reply C to cancel. Reply STOP to opt out.

**24-hour confirm request**
> CMB Bookings: Hey {first_name} — still on for your free session tomorrow at {time}? Reply Y to confirm or C to cancel. Reply STOP to opt out.

**2-hour reminder**
> CMB Bookings: See you in 2 hours at {time}, {address}. Bring water and comfortable shoes. — Charles

**Confirmation email** — sender name, session details, .ics attachment, what to bring, what to expect, address with a map link, your phone number, big Confirm and Cancel buttons.

**Follow-up email** (morning after) — thank them, one specific thing you noticed about their session, and a clear next step with your packages. This email is the entire point of the free session; write it carefully.

---

## 10. The Form Itself

Keep it to one screen with a thumb-reachable submit button.

| Field | Type | Notes |
|---|---|---|
| First name | text | required |
| Last name | text | required |
| Email | email | required, validated |
| Phone | tel | required, `inputMode="tel"`, auto-format as they type |
| Primary goal | select | Lose fat / Build muscle / Get stronger / General health / Sport-specific |
| Training experience | select | Never trained / Some experience / Experienced |
| Anything I should know? | textarea | injuries, limitations — optional |
| SMS consent | checkbox | unchecked by default |

**Mobile-first details that matter:** minimum 44px tap targets, `font-size: 16px` on inputs (anything smaller makes iOS zoom), correct `inputMode` and `autocomplete` attributes, date picker as a horizontal scroll strip rather than a calendar grid, time slots as a 2-column button grid, sticky submit button, and a spinner with disabled state so nobody double-taps and double-books.

---

## 11. Build Order

Do it in this sequence. Each step is testable before the next.

**Week 1 — Foundation**
1. Register the A2P 10DLC campaign **now** — approval takes days and everything else can proceed while you wait
2. Buy the domain, create Next.js project, deploy an empty page to Vercel
3. Create Supabase project, run the schema, set RLS policies
4. Build the static mobile page: hero, your story, what the free session includes, testimonials placeholder

**Week 2 — Booking core**
5. Google Cloud project → enable Calendar API → OAuth consent → get a refresh token
6. Build `lib/google-calendar.ts`, verify `freeBusy` returns your real busy blocks
7. Build `/api/availability`, seed `availability_rules` with your actual training hours
8. Build the date/time picker against live availability
9. Build the form + `POST /api/bookings` → row created + calendar event appears

**Week 3 — Communications**
10. Verify your domain in Resend (DNS records), build the three email templates
11. Wire confirmation email + .ics into the booking route
12. Wire Twilio confirmation SMS
13. Build `/api/webhooks/twilio`, point the Twilio number's webhook at it, test Y/C/STOP from your own phone

**Week 4 — Automation and polish**
14. Build both cron routes with the `CRON_SECRET` guard
15. Test by inserting a booking 24h out and manually hitting the cron URL
16. Confirm/cancel landing pages
17. Privacy policy + terms
18. Error states, timezone verification, full end-to-end test from a phone that isn't yours

---

## 12. Things That Will Bite You

- **Double-booking race condition.** Two people on the page at once, same slot. The unique index on `starts_at` catches it at the DB level — handle the constraint violation gracefully and tell the second person to pick another time. Do not rely on the availability check alone.
- **Timezones.** Store UTC, always. Test with a phone set to a different timezone before you launch.
- **Resend's 100/day cap.** Fine now, but if you run a promo and get 60 bookings in a day, each generating 3 emails, you'll hit it. Watch for it.
- **Google refresh tokens** can expire if the OAuth app stays in "testing" mode. Publish the consent screen even though you're the only user.
- **Cancelled slots must free up.** When someone cancels, delete the calendar event *and* set status to `cancelled`, or the slot stays blocked forever.
- **Your own calendar is the source of truth.** Always check `freeBusy`, never just the bookings table.

---

## 13. Worth Adding Later

- Admin dashboard at `/admin` — see upcoming bookings, mark completed/no-show, block dates without touching SQL
- No-show tracking, so you can see whether reminders are actually working
- Reschedule link instead of only cancel — recovers bookings you'd otherwise lose
- Google Analytics or Plausible on the funnel: how many land vs. how many book
- Waitlist for full slots
- Post-session automated review request once someone converts

---

## Sources

- [Twilio A2P 10DLC Sole Proprietor Registration](https://www.twilio.com/en-us/changelog/a2p-sole-proprietor-registration)
- [Twilio A2P 10DLC overview](https://www.twilio.com/en-us/phone-numbers/a2p-10dlc)
- [Twilio pricing 2026](https://costbench.com/software/sms-api/twilio-sms/)
- [Resend pricing 2026](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
- [Supabase free tier limits 2026](https://uibakery.io/blog/supabase-pricing)
