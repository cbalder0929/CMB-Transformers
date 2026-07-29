# CMB Bookings

Booking system for CMB Bookings, a personal training business. Prospects
land on a mobile-first page, see the offer, and book a free session — which
(per the build plan) will eventually write to Google Calendar and send email/SMS
confirmations and reminders automatically.

## Repo layout

```
booking-site/                  the Next.js app — this is what you run
CMB-Booking-Architecture-Plan.md   full stack, database schema, and build plan
README.md                      this file
```

The site lives in its own git-ready subfolder (`booking-site/`) on purpose —
see `booking-site/DEPLOY.md` for why, and for deploy instructions.

**Layers 2–4 are written but need accounts before they do anything.**
Start at `booking-site/SETUP.md`.

## The build plan

`CMB-Booking-Architecture-Plan.md` is the full design doc: stack choices, cost
breakdown, database schema, and the layer-by-layer rollout. Current status
(also tracked in `booking-site/README.md`):

- [x] **Layer 1** — scaffold, design system, landing page
- [x] **Layer 2** — Supabase + availability engine + slot picker
- [x] **Layer 3** — booking form → database row
- [x] **Layer 4** — Google Calendar sync
- [ ] **Layer 5** — confirmation emails (Resend)
- [ ] **Layer 6** — SMS + two-way confirm webhook (Twilio)
- [ ] **Layer 7** — reminder + follow-up cron jobs

Stack: Next.js 15 (App Router) on Vercel, Supabase (Postgres), Google Calendar
API, Resend, Twilio, Vercel Cron, Tailwind CSS, Zod + React Hook Form.

## Run it locally

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
cd booking-site
npm install
npm run dev
```

Open http://localhost:3000. The site is designed mobile-first, so open
DevTools and switch to a phone viewport (iPhone 14 Pro is a good default) —
desktop is the secondary case.

Other useful commands, run from inside `booking-site/`:

```bash
npm run build   # production build — run this before every push
npm run start   # serve the production build locally
npm run lint    # lint
```

### Where things live (inside `booking-site/`)

```
app/          routes and global styles
components/   UI sections (Hero, Faq, BookingPlaceholder, etc.)
lib/config.ts business details — edit here, not in the components
public/bg.jpg the low-poly gradient background
```

Business details (phone, email, gym address) belong in `lib/config.ts`, not
scattered through components.

## Deploying

See `booking-site/DEPLOY.md` for the full one-time Vercel + GitHub setup.
Short version once that's done:

```bash
git add .
git commit -m "what changed"
git push
```
