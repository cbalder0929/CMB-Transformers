import { getServiceClient, type Booking } from "./supabase";
import { deleteCalendarEvent } from "./google-calendar";
import { sendCancellationEmail } from "./notifications";
import { isSupabaseConfigured } from "./env";

/**
 * Confirm and cancel, in one place.
 *
 * Three callers end up here: the email links (via the pages), the API routes,
 * and — in Layer 6 — the Twilio webhook handling "Y" and "C" replies. Keeping
 * the logic here is what stops those three from drifting apart, which is how
 * you end up with a booking cancelled by SMS that still owns a calendar slot.
 *
 * Both operations are idempotent. People click email buttons twice.
 */

export type ActionOutcome =
  | { ok: true; booking: Booking; alreadyDone: boolean }
  | { ok: false; reason: FailureReason };

export type FailureReason =
  | "not_configured"
  | "not_found"
  | "cancelled"
  | "past"
  | "error";

/** action_token is 16 random bytes hex-encoded by Postgres. */
const TOKEN_RE = /^[0-9a-f]{32}$/;

export async function getBookingByToken(token: string): Promise<Booking | null> {
  if (!isSupabaseConfigured() || !TOKEN_RE.test(token)) return null;

  const { data, error } = await getServiceClient()
    .from("bookings")
    .select("*")
    .eq("action_token", token)
    .maybeSingle<Booking>();

  if (error) {
    console.error("[booking-actions] lookup failed", error);
    return null;
  }
  return data;
}

function isPast(booking: Booking): boolean {
  return new Date(booking.starts_at).getTime() < Date.now();
}

export async function confirmBooking(token: string): Promise<ActionOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };

  const booking = await getBookingByToken(token);
  if (!booking) return { ok: false, reason: "not_found" };

  if (booking.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (booking.status === "confirmed") return { ok: true, booking, alreadyDone: true };
  if (booking.status === "completed" || booking.status === "no_show" || isPast(booking)) {
    return { ok: false, reason: "past" };
  }

  const { data, error } = await getServiceClient()
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", booking.id)
    .select()
    .single<Booking>();

  if (error) {
    console.error("[booking-actions] confirm failed", error);
    return { ok: false, reason: "error" };
  }
  return { ok: true, booking: data, alreadyDone: false };
}

/**
 * Cancelling does three things and the order matters least of all — what
 * matters is that all three happen. Freeing the database row while leaving the
 * calendar event in place blocks the slot forever, because availability checks
 * freeBusy as well as the bookings table.
 *
 * The partial unique index (status in 'booked','confirmed') means the slot
 * reopens the instant the status flips. Nothing else to clean up.
 */
export async function cancelBooking(
  token: string,
  opts: { notify?: boolean } = {},
): Promise<ActionOutcome> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };

  const booking = await getBookingByToken(token);
  if (!booking) return { ok: false, reason: "not_found" };

  if (booking.status === "cancelled") return { ok: true, booking, alreadyDone: true };
  if (booking.status === "completed" || booking.status === "no_show" || isPast(booking)) {
    return { ok: false, reason: "past" };
  }

  const { data, error } = await getServiceClient()
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id)
    .select()
    .single<Booking>();

  if (error) {
    console.error("[booking-actions] cancel failed", error);
    return { ok: false, reason: "error" };
  }

  // Best-effort from here. The cancellation itself has already succeeded and
  // the person is looking at a "cancelled" screen; a calendar or mail failure
  // must not contradict that. Both are visible in the logs if they break.
  if (booking.google_event_id) {
    try {
      await deleteCalendarEvent(booking.google_event_id);
    } catch (err) {
      console.error("[booking-actions] calendar delete failed", booking.id, err);
    }
  }

  if (opts.notify !== false) {
    try {
      await sendCancellationEmail(data);
    } catch (err) {
      console.error("[booking-actions] cancellation email failed", booking.id, err);
    }
  }

  return { ok: true, booking: data, alreadyDone: false };
}
