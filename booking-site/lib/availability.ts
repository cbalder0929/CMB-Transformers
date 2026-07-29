import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Slot generation. Deliberately pure — no database, no network, no `new Date()`
 * hiding inside. Everything it needs is an argument, which is what makes the
 * DST and timezone tests in lib/__tests__ possible.
 *
 * THE RULE: weekly rules store WALL CLOCK time in the business timezone
 * ("6am Monday"). Everything downstream is a UTC instant. The conversion
 * happens here, once, and nowhere else.
 */

export type Interval = { start: Date; end: Date };

/** A recurring business-hours window, maintained in lib/config.ts. */
export type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
};

export type Slot = {
  /** UTC ISO instant — this is what gets stored and posted back. */
  startsAt: string;
  endsAt: string;
  /** Pre-rendered in the business timezone so the client needs no tz library. */
  label: string;
};

export type DayOfSlots = {
  /** Calendar date in the business timezone, "2026-08-03". */
  date: string;
  /** "Mon" */
  weekday: string;
  /** "Aug 3" */
  dayLabel: string;
  slots: Slot[];
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** "2026-08-03" -> a stable UTC-noon anchor, safe to add days to. */
function anchor(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function toDateStr(anchorDate: Date): string {
  return anchorDate.toISOString().slice(0, 10);
}

/** N consecutive calendar dates starting at `startDate` (business-tz dates). */
export function calendarDates(startDate: string, days: number): string[] {
  const base = anchor(startDate);
  return Array.from({ length: days }, (_, i) =>
    toDateStr(new Date(base.getTime() + i * 86_400_000)),
  );
}

/** Today's calendar date in the given timezone. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** 0 = Sunday ... 6 = Saturday, for a calendar date in a given timezone. */
export function dayOfWeek(dateStr: string, timezone: string): number {
  const instant = fromZonedTime(`${dateStr}T12:00:00`, timezone);
  const iso = Number(formatInTimeZone(instant, timezone, "i")); // 1=Mon .. 7=Sun
  return iso % 7;
}

/** "06:30:00" -> 390 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// The core
// ---------------------------------------------------------------------------

export type GenerateOptions = {
  rules: AvailabilityRule[];
  dates: string[];
  timezone: string;
  now: Date;
  minNoticeHours: number;
  bufferMinutes?: number;
};

/**
 * Every theoretical slot in the range, before anything is subtracted.
 * Already excludes slots too close to `now`.
 */
export function generateSlots(opts: GenerateOptions): DayOfSlots[] {
  const { rules, dates, timezone, now, minNoticeHours, bufferMinutes = 0 } = opts;
  const earliest = new Date(now.getTime() + minNoticeHours * 3_600_000);

  return dates.map((date) => {
    const dow = dayOfWeek(date, timezone);
    const dayRules = rules.filter((r) => r.active && r.day_of_week === dow);

    const slots: Slot[] = [];

    for (const rule of dayRules) {
      const startMin = timeToMinutes(rule.start_time);
      const endMin = timeToMinutes(rule.end_time);
      const step = rule.slot_minutes + bufferMinutes;

      for (let m = startMin; m + rule.slot_minutes <= endMin; m += step) {
        const localStart = `${date}T${minutesToTime(m)}`;
        const start = fromZonedTime(localStart, timezone);
        const end = new Date(start.getTime() + rule.slot_minutes * 60_000);

        if (start < earliest) continue;

        slots.push({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          label: formatInTimeZone(start, timezone, "h:mm a"),
        });
      }
    }

    // Rules can overlap (two windows, one day). Dedupe and sort by instant.
    const seen = new Set<string>();
    const unique = slots
      .filter((s) => (seen.has(s.startsAt) ? false : (seen.add(s.startsAt), true)))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const anchorDate = fromZonedTime(`${date}T12:00:00`, timezone);

    return {
      date,
      weekday: formatInTimeZone(anchorDate, timezone, "EEE"),
      dayLabel: formatInTimeZone(anchorDate, timezone, "MMM d"),
      slots: unique,
    };
  });
}

/** Two intervals collide if each starts before the other ends. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

/** Remove any slot that collides with a busy interval. */
export function subtractBusy(days: DayOfSlots[], busy: Interval[]): DayOfSlots[] {
  if (busy.length === 0) return days;
  return days.map((day) => ({
    ...day,
    slots: day.slots.filter((slot) => {
      const s = { start: new Date(slot.startsAt), end: new Date(slot.endsAt) };
      return !busy.some((b) => overlaps(s, b));
    }),
  }));
}

/** Days with nothing left in them shouldn't show up as tappable in the picker. */
export function withOpenSlots(days: DayOfSlots[]): DayOfSlots[] {
  return days.filter((d) => d.slots.length > 0);
}

/**
 * The single question the booking route needs answered:
 * "is this exact instant still bookable?" Uses the same code path as the
 * picker, so the two can never disagree.
 */
export function isSlotOpen(days: DayOfSlots[], startsAtIso: string): Slot | null {
  const target = new Date(startsAtIso).getTime();
  for (const day of days) {
    for (const slot of day.slots) {
      if (new Date(slot.startsAt).getTime() === target) return slot;
    }
  }
  return null;
}
