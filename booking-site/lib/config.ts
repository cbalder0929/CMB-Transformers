/**
 * Single source of truth for business details.
 * Change these here and they update everywhere: page copy, emails, SMS.
 */

export const business = {
  name: "CMB Bookings",
  trainerName: "Charles",
  timezone: "America/Chicago",

  phone: "(404) 247-5627",
  phoneE164: "+14042475627",

  // TODO: replace with your real details before launch
  email: "hello@cmbbookings.com",

  location: {
    name: "Your Gym Name",
    address: "123 Main St",
    cityState: "Chicago, IL 60601",
    mapsUrl: "https://maps.google.com/?q=123+Main+St+Chicago+IL",
  },

  session: {
    lengthMinutes: 60,
    label: "60-minute session",
    price: "Free",
  },

  social: {
    instagram: "https://instagram.com/cmbbookings",
  },
} as const;

/**
 * Booking rules. These are the knobs you'll actually want to turn.
 */
export const booking = {
  /** Nothing bookable inside this many hours. Your travel + prep buffer. */
  minNoticeHours: 4,
  /** How far out the picker lets people book. */
  maxDaysAhead: 14,
  /** Gap left after each session before the next one can start. */
  bufferMinutes: 0,
} as const;

/**
 * Public booking windows in America/Chicago. Google Calendar removes any
 * window that conflicts with school, work, personal, or client events.
 */
export const availabilityRules = [
  { day_of_week: 0, start_time: "07:00:00", end_time: "18:00:00", slot_minutes: 60, active: true },
  { day_of_week: 1, start_time: "07:00:00", end_time: "21:00:00", slot_minutes: 60, active: true },
  { day_of_week: 2, start_time: "07:00:00", end_time: "21:00:00", slot_minutes: 60, active: true },
  { day_of_week: 3, start_time: "07:00:00", end_time: "21:00:00", slot_minutes: 60, active: true },
  { day_of_week: 4, start_time: "07:00:00", end_time: "21:00:00", slot_minutes: 60, active: true },
  { day_of_week: 5, start_time: "07:00:00", end_time: "18:00:00", slot_minutes: 60, active: true },
  { day_of_week: 6, start_time: "07:00:00", end_time: "18:00:00", slot_minutes: 60, active: true },
] as const;

export const goalOptions = [
  "Lose fat",
  "Build muscle",
  "Get stronger",
  "General health",
  "Sport-specific",
] as const;

export const experienceOptions = [
  "Never trained before",
  "Some experience",
  "Experienced",
] as const;

export const sessionIncludes = [
  {
    title: "We get to know each other",
    body: "We'll spend time talking about your goals, what's held you back in the past, and what success actually looks like for you. No judgment. Just an honest conversation.",
  },
  {
    title: "We train",
    body: "This isn't a consultation where we just sit and talk. You'll get a real workout so I can see how you move, coach you through exercises, and give you immediate feedback.",
  },
  {
    title: "We build your roadmap",
    body: "At the end of the session, I'll explain exactly what I think you should focus on first and how I'd approach your training. Even if you decide not to continue, you'll leave with direction instead of more confusion.",
  },
] as const;

export const faqs = [
  {
    q: "Is it actually free?",
    a: "Yes. No card, no deposit, no catch. I'd rather you feel how I coach before you decide to pay for it.",
  },
  {
    q: "What if I've never worked out before?",
    a: "That's most people who book this. We start where you are. Nothing about the session assumes experience.",
  },
  {
    q: "What should I bring?",
    a: "Comfortable clothes, athletic shoes, and water. That's it.",
  },
  {
    q: "What if I need to reschedule?",
    a: "Every confirmation email and text has a cancel link. Use it any time — no awkward conversation required.",
  },
] as const;
