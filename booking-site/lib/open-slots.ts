import "server-only";

import { getServiceClient } from "./supabase";
import { getBusyIntervals } from "./google-calendar";
import { isGoogleConfigured } from "./env";
import {
  calendarDates,
  generateSlots,
  subtractBusy,
  todayIn,
  type DayOfSlots,
  type Interval,
} from "./availability";
import { availabilityRules, booking as bookingConfig } from "./config";

/**
 * The one function that decides what is bookable.
 *
 * Both the picker (GET /api/availability) and the booking route call this.
 * That is the whole point: if they used different logic they would eventually
 * disagree, and the way you'd find out is a double-booked Saturday morning.
 */

export type OpenSlotsResult = {
  days: DayOfSlots[];
  timezone: string;
  /** True when the calendar was actually consulted. Surfaced for debugging. */
  calendarChecked: boolean;
};

export async function getOpenSlots(opts?: {
  from?: string;
  days?: number;
  now?: Date;
  timezone?: string;
}): Promise<OpenSlotsResult> {
  const now = opts?.now ?? new Date();
  const timezone = opts?.timezone ?? process.env.BUSINESS_TIMEZONE ?? "America/Chicago";
  const dayCount = opts?.days ?? bookingConfig.maxDaysAhead;
  const from = opts?.from ?? todayIn(timezone, now);

  const dates = calendarDates(from, dayCount);
  const rangeStart = new Date(`${dates[0]}T00:00:00Z`);
  const rangeEnd = new Date(
    new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime() + 2 * 86_400_000,
  );

  const supabase = getServiceClient();

  // --- 1. Website bookings ---------------------------------------------------
  // Weekly hours live in lib/config.ts. Supabase is only the concurrency-safe
  // booking record, not an availability-rules system.
  const { data: bookingRows, error: bookingsError } = await supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .in("status", ["booked", "confirmed"])
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString());

  if (bookingsError) throw new Error(`bookings: ${bookingsError.message}`);

  const busy: Interval[] = [
    ...((bookingRows ?? []) as { starts_at: string; ends_at: string }[]).map((b) => ({
      start: new Date(b.starts_at),
      end: new Date(b.ends_at),
    })),
  ];

  // --- 2. Your real calendar -------------------------------------------------
  // If this throws we do NOT fail the whole request — a Google outage should
  // not take the booking page down. We fall back to database-only availability
  // and report calendarChecked: false so the problem is visible.
  let calendarChecked = false;
  if (isGoogleConfigured()) {
    // Google is the source of truth for outside commitments. Fail closed if
    // FreeBusy cannot be read; a potentially occupied slot must not be shown.
    const googleBusy = await getBusyIntervals(rangeStart, rangeEnd);
    busy.push(...googleBusy);
    calendarChecked = true;
  }

  // --- 3. Generate, then subtract -------------------------------------------
  const all = generateSlots({
    rules: [...availabilityRules],
    dates,
    timezone,
    now,
    minNoticeHours: bookingConfig.minNoticeHours,
    bufferMinutes: bookingConfig.bufferMinutes,
  });

  return { days: subtractBusy(all, busy), timezone, calendarChecked };
}
