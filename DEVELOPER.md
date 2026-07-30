# Developer guide — CMB Bookings

For when you come back to this in three months and can't remember how any of it
works. `CLAUDE.md` is the rules-for-an-AI version; this is the one for you.

- **Setting it up the first time?** → `booking-site/SETUP.md`
- **Getting it online?** → `booking-site/DEPLOY.md`
- **Why the stack is what it is?** → `CMB-Booking-Architecture-Plan.md`
- **Something is broken right now?** → jump to [Troubleshooting](#troubleshooting).

---

## The 60-second mental model

A prospect opens the page and sees times you're free. They pick one and fill in a
short form. That creates a row in a Postgres database, an event on your Google
Calendar, and an email with a calendar attachment. The email has confirm and
cancel links, so they can cancel without texting you.

The thing that makes it non-trivial is **"times you're free."** That is computed
fresh on every page load, from three sources:

```
   your weekly hours          (lib/config.ts — hardcoded, not in the database)
 – bookings already taken     (Supabase)
 – everything on your calendars (Google freeBusy: bookings + school + work)
 – anything inside 4 hours    (lib/config.ts → minNoticeHours)
 ─────────────────────────────
 = what the site offers
```

All of that lives in one function, `getOpenSlots()` in
`booking-site/lib/open-slots.ts`. The slot picker and the booking submission both
call it. That's deliberate — if they each had their own logic they'd eventually
disagree, and the way you'd find out is two people showing up at 6pm.

---

## Getting back in after time away

```powershell
cd "C:\Users\balde\Downloads\CMB Transformations\booking-site"
npm install        # in case dependencies moved
npm run dev
```

Open <http://localhost:3000> in a phone-sized viewport. Then check these three
things in order, because each one depends on the last:

1. **Real days and times appear** under "When works for you?"
   → Supabase is connected and your `.env.local` is intact.
2. **Put a test event on your Google Calendar during a bookable hour, reload.**
   That slot should vanish.
   → Google Calendar is connected and the refresh token is still alive.
3. **Book a test session.** Check for the row in Supabase, the event on your
   calendar, and the email in your inbox.
   → The whole pipeline works.

If step 1 fails, nothing else matters — fix that first.

If `.env.local` is missing entirely, it's gitignored on purpose and was never
committed. Rebuild it from `.env.example` plus the keys in your password manager,
or copy the values back out of Vercel → Settings → Environment Variables.

---

## What happens when

### Someone loads the page

`components/BookingSection.tsx` calls `GET /api/availability` →
`lib/open-slots.ts` → Supabase query + Google freeBusy → `lib/availability.ts`
generates and filters slots → only days with something open come back.

That endpoint answers `200 {configured: false}` rather than an error when
Supabase isn't set up, which is why a half-configured site shows "Online booking
opens shortly" instead of a broken page.

### Someone books

`POST /api/bookings` (`app/api/bookings/route.ts`) does, in order:

1. Validate the form again server-side (`lib/validation.ts`).
2. Silently accept-and-discard if the honeypot field is filled — that's a bot.
3. **Re-check the slot is still open.** They may have sat on the page ten
   minutes while someone else booked it.
4. `INSERT` into `bookings`.
5. Create the Google Calendar event, store its id on the row.
6. Send the confirmation email with the `.ics` attachment.

Steps 5 and 6 are best-effort — if they fail, the booking still succeeds and the
failure goes to the logs and to the `message_log` table. That's the right
trade-off: a booking that saved but didn't email is something you can fix with a
text message; a booking the prospect thinks failed is lost forever.

### Two people book the same slot at the same instant

Step 3 catches almost all of it. The last-resort guarantee is a unique index in
Postgres on `starts_at` for active bookings — the second `INSERT` fails, and the
route turns that into "Sorry, that time was just taken." Don't remove that index;
it's the only part of this that actually holds under a race.

### Someone cancels

The link in their email → `app/cancel/[token]/page.tsx` →
`lib/booking-actions.ts` → sets status to `cancelled`, deletes the calendar
event, sends an acknowledgement. The slot reopens the moment the status flips,
because availability only counts `booked` and `confirmed` rows.

The `action_token` in those links is 16 random bytes from Postgres. It's the only
credential — anyone with the link can cancel that booking. That's intentional
(no login for a free session), but it's why the links shouldn't be posted
anywhere public.

---

## Where to change what

Everything below is in `booking-site/`.

| You want to… | Edit |
|---|---|
| Change hours you're bookable | `lib/config.ts` → `availabilityRules` |
| Change the 4-hour minimum notice | `lib/config.ts` → `booking.minNoticeHours` |
| Change how far ahead people can book (14 days) | `lib/config.ts` → `booking.maxDaysAhead` |
| Add a gap between sessions | `lib/config.ts` → `booking.bufferMinutes` |
| Change session length (60 min) | `lib/config.ts` → `business.session` **and** `slot_minutes` in the rules |
| Phone, email, gym name and address | `lib/config.ts` → `business` |
| FAQ questions | `lib/config.ts` → `faqs` |
| "What's included" copy | `lib/config.ts` → `sessionIncludes` |
| Goal / experience dropdown options | `lib/config.ts` → `goalOptions`, `experienceOptions` |
| Headline and hero copy | `components/Hero.tsx` |
| Your bio and photo | `components/About.tsx`, `public/CMB-personalTraining-Headshot.png` |
| Order of sections on the page | `app/page.tsx` |
| Confirmation email wording | `emails/confirmation.ts` |
| Cancellation email wording | `emails/cancelled.ts` |
| Shared email header/footer | `emails/shell.ts` |
| Colours, gradients, shadows | `tailwind.config.ts` |
| Glass panels, buttons, dividers | `app/globals.css` |
| Block a vacation | Nothing here — add an all-day event to a configured Google Calendar |

**The rule: business facts go in `lib/config.ts`, never typed directly into a
component or an email.** If you change your phone number in one place it should
change everywhere — page, emails, calendar invites.

Changing `availabilityRules` takes effect on the next page load; there's no cache
to clear and nothing to migrate. Times are wall clock in America/Chicago
(`"07:00:00"` means 7am your time, and stays 7am across daylight saving).

---

## Routine maintenance

Things that rot on their own, roughly in order of how likely they are to bite:

**Google refresh token — the big one.** If your OAuth consent screen ever drops
back to "Testing" mode, Google expires the refresh token after 7 days and
calendar sync dies *silently* — the site keeps taking bookings, it just stops
respecting your real schedule. It should be **Published**; verify at
[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services →
OAuth consent screen. If the token dies, re-mint it with `npm run google-token`
and update it in both `.env.local` and Vercel.

**Supabase free tier goes to sleep.** Free projects pause after a stretch with no
activity, and the first request after that fails. If the site has been quiet for
a while and availability suddenly errors, open the Supabase dashboard and check
whether the project needs resuming.

**Domain renewal.** ~$12/year. If it lapses, the site and the email sender both
break at once.

**Resend sender address.** While `FROM_EMAIL` is blank you're on Resend's sandbox
sender, which **only delivers to the inbox that owns your Resend account**.
Everyone else silently gets nothing. Verify your domain in Resend and set
`FROM_EMAIL` before you send a real client an email.

**Dependency updates.** No urgency, but every few months:
`npm outdated`, update, `npm run build`, `npm run test`, push. Next.js and
Supabase are the two worth keeping current.

**A quick monthly look at `message_log`** tells you whether emails have been
quietly failing.

---

## Checking on the business

Supabase → SQL Editor. These are the ones worth keeping.

```sql
-- What's coming up
select first_name, last_name, phone, email,
       starts_at at time zone 'America/Chicago' as local_time, status
from bookings
where starts_at > now()
order by starts_at;

-- Did anyone book while I wasn't looking?
select * from bookings order by created_at desc limit 20;

-- Emails that failed or were skipped
select b.first_name, b.starts_at, m.kind, m.status, m.error, m.sent_at
from message_log m join bookings b on b.id = m.booking_id
where m.status <> 'sent'
order by m.sent_at desc;

-- Who cancelled, and how far in advance
select first_name, last_name,
       starts_at at time zone 'America/Chicago' as was_booked_for,
       cancelled_at at time zone 'America/Chicago' as cancelled
from bookings where status = 'cancelled' order by cancelled_at desc;
```

To free up a slot manually, set that row's `status` to `cancelled` — don't delete
it. Deleting loses the SMS-consent record, and if a Google event exists it'll
keep blocking the slot anyway. (Cancelling through the app deletes the event;
cancelling by hand in SQL does not — remove the calendar event yourself.)

---

## Troubleshooting

**"Online booking opens shortly" on the live site**
Supabase env vars aren't reaching the app. In Vercel, `.env.local` is not read —
every variable must be added by hand under Settings → Environment Variables, and
**they only apply to new deployments**, so redeploy afterwards. This has already
caused one outage. Locally, the same message means you need to restart
`npm run dev`; Next.js reads `.env.local` only at boot.

**"Could not load available times."**
The availability call threw. Nine times out of ten it's Google: an expired
refresh token, or a calendar ID that's wrong or unshared. Check the Vercel
function logs (Deployments → the deployment → Functions) or your dev terminal —
the full Google error is printed there. Note this fails closed on purpose: if the
calendar can't be read, no slots are offered, rather than risk offering one
you're busy for.

**Slots show up that should be blocked**
Either the event is on a calendar that isn't in your env vars (only
`BOOKING_CALENDAR_ID`, `SCHOOL_CALENDAR_ID`, `WORK_CALENDAR_ID`, and optionally
`PERSONAL_CALENDAR_ID` are consulted), or the calendar ID is the display name
instead of the real ID from Google Calendar → Settings → **Integrate calendar**,
or the event is marked "Free" rather than "Busy" — freeBusy ignores those.

**Bookings save but no email arrives**
Check `message_log` first; it records every attempt with the provider's error.
If it says a 403, you're still on the sandbox sender, which can only reach your
own address. If the row says `skipped`, `RESEND_API_KEY` isn't set in that
environment.

**Booking saved but nothing on my calendar**
Expected behaviour when Google is unconfigured or erroring — the code refuses to
fail a booking over a calendar problem. The reason is in the logs, prefixed
`[api/bookings] calendar sync failed`. The row will have a null `google_event_id`.

**Times are off by an hour**
Almost certainly `BUSINESS_TIMEZONE` differing between environments, or a rule in
`availabilityRules` edited into UTC. Those rules are wall clock in the business
timezone; the conversion happens once, in `lib/availability.ts`. Run
`npm run test` — the DST cases are covered there.

**The Vercel build failed**
Reproduce it with `npm run build` locally; it's the identical command. Worth
running before every push for that reason.

---

## Deploying

The git repo is the **parent folder** (`CMB Transformations/`), not
`booking-site/`. `booking-site/DEPLOY.md` says otherwise — that instruction is
stale, from before the repo moved up a level. Vercel's Root Directory is set to
`booking-site`.

```powershell
cd "C:\Users\balde\Downloads\CMB Transformations\booking-site"
npm run build          # catch it here, not in CI
npm run test
cd ..
git add .
git commit -m "what changed"
git push               # live in ~60 seconds
```

Every push also gets its own preview URL, so you can compare before and after on
your phone.

**The site is currently hidden from Google.** Set `NEXT_PUBLIC_ALLOW_INDEXING=true`
in Vercel and redeploy when you're ready to be found in search. Until then the
link works fine for anyone you send it to.

---

## Accounts this depends on

| Service | What it does | Cost | Dies if… |
|---|---|---|---|
| Vercel | Hosts the site | Free tier | — |
| Supabase | Stores bookings | Free tier | Project pauses when idle |
| Google Cloud | Calendar read/write | Free | Consent screen unpublished → token expires in 7 days |
| Resend | Sends email | Free tier | Domain unverified → only reaches you |
| Domain registrar | The address | ~$12/yr | Renewal lapses |

Keep every key in a password manager. The one that matters most is the Supabase
`service_role` key — it bypasses all database security. It belongs in
`.env.local` and Vercel and nowhere else, ever.

---

## Not built yet

- **Layer 6** — Twilio SMS confirmations, and replying "Y"/"C" to confirm or
  cancel by text. `lib/booking-actions.ts` already has the hooks; a Twilio
  webhook would call the same two functions. `/privacy` and `/terms` exist
  because Twilio's reviewer checks for them.
- **Layer 7** — 24-hour and 2-hour reminders, plus a post-session follow-up, on
  Vercel Cron. The `bookings` table already has `reminder_24h_sent_at`,
  `reminder_2h_sent_at`, and `followup_sent_at` columns so those jobs can be
  written to run safely more than once.

The layer checklists in `README.md` and `booking-site/README.md` are out of date
and under-report what's done. Layers 1–5 are all built. Trust the code.

Also still open: `lib/config.ts` has placeholder gym name, address, and email
marked `TODO`, and the background image needs a confirmed Adobe Stock license
before the site is public.

---

## Two things about the codebase that will surprise you

**`cmb-site/` is a completely separate, simpler version of this site** — plain
HTML with an embedded Google Calendar scheduler, no server, no keys, no build.
It exists as a fallback. It shares nothing with `booking-site/`, so a change in
one never appears in the other. Editing the wrong folder is the easiest mistake
to make here.

**Nothing throws when a service is missing.** `lib/env.ts` reads every
environment variable in one place and deliberately never errors out; each feature
asks `isSupabaseConfigured()` / `isGoogleConfigured()` / `isResendConfigured()`
and degrades to something friendly instead. That's why a misconfiguration shows
up as a quiet fallback message rather than a crash — good for customers, but it
means you have to actually check that things work rather than waiting to be told.
