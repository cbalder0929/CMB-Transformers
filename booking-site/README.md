# CMB Bookings — Booking Site

Mobile-first booking page for free personal training sessions.

## Run it

```bash
cd booking-site
npm install
npm run dev
```

Open http://localhost:3000 — then open DevTools and switch to a phone viewport
(iPhone 14 Pro is a good default). This is designed mobile-first; desktop is the
secondary case.

## Where things live

```
app/          routes and global styles
components/   UI sections
lib/config.ts business details — edit here, not in the components
public/bg.jpg the low-poly gradient background (61KB, downscaled from source)
```

## Design system

The palette is sampled directly from `public/bg.jpg`, so accents never clash
with the background:

| Token   | Hex       | Sampled from        |
|---------|-----------|---------------------|
| `amber` | `#EDA149` | upper-left warm     |
| `flame` | `#F56A29` | lower-left orange   |
| `ember` | `#D83627` | red facet           |
| `rose`  | `#A41B47` | magenta facet       |
| `plum`  | `#6E2576` | purple facet        |
| `azure` | `#6098D3` | upper blue          |
| `cyan`  | `#56D3D7` | upper-right cyan    |
| `aqua`  | `#7AF0E4` | top-right highlight |
| `night` | `#07041A`–`#3A2490` | extended from the darkest corner |

Reusable classes are defined in `app/globals.css`:

- `.glass` / `.glass-dark` — frosted panels, the structural unit of the page
- `.btn-primary` / `.btn-glass` — buttons
- `.text-facet` — gradient text
- `.rule-facet` — gradient hairline divider

## Layer status

- [x] **Layer 1** — scaffold, design system, landing page
- [ ] **Layer 2** — Supabase + availability engine + slot picker
- [ ] **Layer 3** — booking form → database row
- [ ] **Layer 4** — Google Calendar sync
- [ ] **Layer 5** — confirmation emails (Resend)
- [ ] **Layer 6** — SMS + two-way confirm webhook (Twilio)
- [ ] **Layer 7** — reminder + follow-up cron jobs

## Before launch

- [ ] Fill in real details in `lib/config.ts` (phone, email, gym address)
- [ ] Replace the About photo placeholder with a real photo
- [ ] Rewrite the About paragraph in your own voice
- [ ] Confirm you hold a license for the background image (see note below)

> The background came from an Adobe Stock file. Make sure you have a standard
> license before the site goes public — comp/preview downloads aren't licensed
> for a live commercial site. If you'd rather not deal with it, the same look can
> be generated as an SVG mesh with no licensing attached.
