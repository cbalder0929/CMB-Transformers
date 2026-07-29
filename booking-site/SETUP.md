# Setup — Layers 2 to 4

The code for real bookings is written. It needs two accounts before it does
anything: **Supabase** (stores the bookings) and **Google Cloud** (reads and
writes your calendar).

Budget about 45 minutes. Supabase is 10 of those; Google Cloud is the fiddly one.

Until you finish Part A, the booking section shows a "text me instead" fallback
rather than an error. Nothing is broken in the meantime.

---

## Part 0 — Install the new packages (2 min)

```powershell
cd "C:\Users\balde\Downloads\CMB Transformations\booking-site"
npm install
```

This pulls in Supabase, Zod, React Hook Form, and the timezone library. Then:

```powershell
copy .env.example .env.local
```

You'll fill `.env.local` in as you go.

---

## Part A — Supabase (10 min)

### A1. Create the project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub
2. **New project**
   - Name: `cmb-booking`
   - Database password: click Generate, then **save it in your password manager**.
     You won't need it for this app, but you'll be locked out of the database
     without it.
   - Region: **East US (North Virginia)** — closest to Vercel's default
   - Plan: Free
3. Click Create. It takes about two minutes to provision.

### A2. Run the schema

1. Left sidebar → **SQL Editor** → **New query**
2. Open `booking-site/supabase/schema.sql`, copy the whole file, paste it in
3. Click **Run**

You should see "Success. No rows returned." Check **Table Editor** for the
`bookings` and `message_log` tables.

### A3. Business hours

Weekly hours are maintained in `lib/config.ts`, not Supabase. The current
schedule is 7 AM–6 PM Sunday, Friday, and Saturday, and 7 AM–9 PM Monday
through Thursday (America/Chicago). Google Calendar removes conflicts from
those windows.

### A4. Copy the keys

**Project Settings → API.** Three values:

| Supabase calls it | Put it in `.env.local` as |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses every security rule in the database. It goes
> in `.env.local` and Vercel — nowhere else. Never paste it into a component, a
> chat, or a screenshot.

### A5. Check it works

```powershell
npm run dev
```

Open <http://localhost:3000>, scroll to "When works for you?". You should see
real days and times. If you see "Online booking opens shortly", the env vars
aren't being read — stop the dev server and start it again, since Next.js only
loads `.env.local` at boot.

**At this point bookings save to the database.** Book yourself a test session,
then check Table Editor → `bookings`.

---

## Part B — Google Calendar (30 min)

Optional in the sense that bookings work without it. Not optional in practice:
without it the site will happily book you during your dentist appointment.

### B1. Create the project and turn on the API

1. <https://console.cloud.google.com> → sign in with the Google account whose
   calendar you use
2. Project dropdown (top-left) → **New Project** → name it `cmb-booking` → Create
3. Make sure the new project is selected in that dropdown
4. Search bar → "Google Calendar API" → **Enable**

### B2. Configure the consent screen

**APIs & Services → OAuth consent screen.**

1. User Type: **External** → Create
2. App name: `CMB Bookings`
   User support email: your email
   Developer contact: your email
   → Save and Continue
3. Scopes: **Add or Remove Scopes** → filter for `calendar` → tick
   `https://www.googleapis.com/auth/calendar` → Update → Save and Continue
4. Test users: **Add Users** → your own Gmail address → Save and Continue

5. **Then go back to the OAuth consent screen page and click `PUBLISH APP`.**

   Do not skip step 5. While the app sits in "Testing", Google expires the
   refresh token after **7 days** — your calendar sync silently dies a week
   after launch and you find out from a double-booking. Publishing shows a
   scary "unverified app" warning when *you* authorise it, which is fine and
   expected: you're the only user, and you click through it once.

### B3. Create credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID.**

- Application type: **Web application**
- Name: `cmb-booking-local`
- **Authorized redirect URIs → Add URI:**

  ```
  http://localhost:5555/callback
  ```

  Exactly that. Trailing slashes matter.

Create. Copy the **Client ID** and **Client secret** into `.env.local` as
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### B4. Get the refresh token

```powershell
npm run google-token
```

It asks for the client ID and secret, opens your browser, and you authorise it.
On the "Google hasn't verified this app" screen: **Advanced → Go to CMB
Bookings (unsafe)**. That warning is about *your own* app; it's
there because you haven't paid for Google's verification review, which you don't
need for a single user.

The terminal prints:

```
GOOGLE_REFRESH_TOKEN=1//0gWx...
```

Paste it into `.env.local`.

> **"No refresh_token returned"** means you've authorised this client before.
> Revoke it at <https://myaccount.google.com/permissions> and run the script
> again.

### B5. Set the calendars

```
BOOKING_CALENDAR_ID=your-cmb-bookings-calendar-id@group.calendar.google.com
SCHOOL_CALENDAR_ID=your-2026-fall-schedule-calendar-id@group.calendar.google.com
WORK_CALENDAR_ID=your-xfinity-schedule-calendar-id@group.calendar.google.com
```

Create three calendars: **CMB Bookings** (website appointments), **2026 Fall
Schedule** (classes), and **XFINITY Schedule** (work shifts). Copy each Calendar ID from Google Calendar Settings. Only `BOOKING_CALENDAR_ID` receives website-created events; the other two block availability. You can later add `PERSONAL_CALENDAR_ID` for personal events.

Calendar IDs use the calendar's **Integrate calendar** value, not its display name.

### B6. Test it

Restart `npm run dev`. Then:

1. Put a fake event on the school or work calendar during one of your bookable hours
2. Reload the booking page — **that slot should be gone**
3. Book a different slot from the site
4. Check Google Calendar — the event is there, titled "Free session — [name]"

If the slot doesn't disappear, open the terminal running `npm run dev`. Any
Google error is logged there in full.

---

## Part C — Deploy (5 min)

Vercel doesn't read `.env.local`. You have to add the variables by hand.

1. Vercel → your project → **Settings → Environment Variables**
2. Add each one from `.env.local`, ticked for **Production, Preview, and Development**:

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   GOOGLE_REFRESH_TOKEN
   BOOKING_CALENDAR_ID
   SCHOOL_CALENDAR_ID
   WORK_CALENDAR_ID
   BUSINESS_TIMEZONE
   NEXT_PUBLIC_SITE_URL
   ```

   `NEXT_PUBLIC_SITE_URL` should be your real URL, e.g.
   `https://cmb-booking.vercel.app`.

3. Push:

   ```powershell
   git add .
   git commit -m "Layers 2-4: real availability, bookings, calendar sync"
   git push
   ```

4. Environment variables only apply to **new** deployments. If you added them
   after pushing, go to Deployments → latest → ⋯ → **Redeploy**.

---

## Before you tell anyone about it

Test from a phone that isn't yours, on cell data rather than your wifi:

- [ ] Days and times load, and the times match what you expect
- [ ] An event on your Google Calendar removes that slot from the site
- [ ] Booking creates a row in Supabase **and** an event on your calendar
- [ ] Booking the same slot twice gives "that time was just taken", not a crash
      (open two browser tabs, pick the same slot in both, submit both)
- [ ] Nothing bookable inside the next 4 hours
- [ ] Phone field auto-formats and rejects `123`
- [ ] `/privacy` and `/terms` load — Twilio's reviewer will check these in Layer 6

---

## Things you'll want to do later

**Block a vacation** — add an all-day event to a configured Google Calendar.

**Change business hours or booking rules** — `lib/config.ts`. Edit
`availabilityRules`, `minNoticeHours` (default 4), or `maxDaysAhead` (default 14).

**See what's coming up**:

```sql
select first_name, last_name, phone,
       starts_at at time zone 'America/Chicago' as local_time, status
from bookings where starts_at > now() order by starts_at;
```

---

## Next up: Layer 5

Confirmation emails through Resend. That one needs your domain verified via DNS,
which takes a few hours to propagate — so if you haven't bought the domain yet,
now is the moment.
