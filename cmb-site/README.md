# CMB Bookings — static site

The whole site. No Node, no build step, no database, no API keys. Six files.

```
index.html    the landing page + the Google Calendar scheduler embed
privacy.html  privacy policy
terms.html    terms of service
styles.css    the design system — palette, glass panels, facet gradients
bg.jpg        the low-poly gradient artwork
favicon.svg   the facet mark
```

## Preview it

Double-click `index.html`. That's it.

(If you'd rather serve it properly: `python -m http.server 8000` in this folder,
then open http://localhost:8000.)

## Put it online

Any static host works. The two easiest, both free:

- **Netlify Drop** — go to [app.netlify.com/drop](https://app.netlify.com/drop) and
  drag this folder onto the page. Live in about ten seconds.
- **Vercel** — [vercel.com/new](https://vercel.com/new), import the folder, deploy.

Then point your domain at it in that host's dashboard. There is nothing to
configure, no environment variables, and nothing that can fall out of sync.

## Booking

Google Calendar's appointment scheduling runs the entire booking flow: the open
slots, the intake questions, the confirmation email, the reschedule and cancel
links, and writing the event onto your calendar. The site just holds the frame.

It's wired in two ways at once, on purpose:

1. **The inline embed** in the "Pick a time" section — the scheduler sits right
   in the page inside a white card.
2. **The two "Book my free session" buttons** (hero and sticky bar) open
   Google's own booking overlay on top of the page. Google's script only knows
   how to draw its own orange button, so it's loaded into an offscreen host
   (`#gcalHost`) and our buttons forward their clicks to it.

If Google's script is blocked, those buttons quietly revert to scrolling down to
the inline embed. If the *embed* is blocked, it swaps itself for an "open in a
new tab" link. Nobody hits a dead end either way.

**To change anything about booking** — hours, session length, buffer, intake
questions, how far ahead people can book — edit the appointment schedule in
Google Calendar. The site picks up the change immediately; you don't redeploy.

**To swap in a different schedule**, replace the `iframe src` in `index.html`
(search for "Google Calendar Appointment Scheduling") with the embed code from
Google Calendar → your schedule → Share → Embed. Two spots use that URL: the
iframe and the "open in a new tab" fallback link. Update both.

## Things to change before launch

These are placeholders carried over from the old build:

- **Gym name and address** — `index.html` search for "Your Gym Name", and the
  footer address block. Also the Google Maps link.
- **Email** — `hello@cmbbookings.com` appears in the footer, privacy, and terms.
- **Your photo** — `index.html` has a placeholder block in the About section with
  the replacement `<img>` tag commented right above it. Drop a photo in this
  folder and swap it in.
- **Instagram** — not linked anywhere yet; add it to the footer if you want it.

## Design notes

Every accent color in `styles.css` is sampled from a real pixel in `bg.jpg` —
that's why the UI and the background never fight each other. If you replace the
artwork, resample the palette or the whole thing goes muddy.

The layout is mobile-first on purpose: the content column is capped at 512px and
desktop is the secondary case. Test in a phone viewport first.

The scheduler card is deliberately white. Google gives no theme control over the
embed, so it's framed as an intentional light panel rather than a broken dark one.
