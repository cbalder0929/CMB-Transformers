import { formatInTimeZone } from "date-fns-tz";

import { getServiceClient, type Booking } from "./supabase";
import { sendEmail, logMessage } from "./email";
import { isResendConfigured } from "./env";
import { buildIcs } from "./ics";
import { business } from "./config";
import { confirmationEmail } from "@/emails/confirmation";
import { cancelledEmail } from "@/emails/cancelled";
import { adminNotificationEmail } from "@/emails/admin-notification";
import {
  customerReminderEmail,
  adminReminderEmail,
  customerOneHourReminderEmail,
  adminOneHourReminderEmail,
} from "@/emails/reminder";

type BookingEmailKind =
  | "confirmation"
  | "admin_notification"
  | "reminder_24h_customer"
  | "reminder_24h_admin"
  | "reminder_1h_customer"
  | "reminder_1h_admin";
type EmailReservation =
  | { state: "reserved"; logId: string }
  | { state: "already_reserved" }
  | { state: "failed" };

/**
 * Acquire the one send slot for a booking email. The partial unique index in
 * schema.sql makes this an atomic cross-request guard: only the request that
 * creates the `sending` log row may call the email provider.
 */
async function reserveBookingEmail(
  bookingId: string,
  kind: BookingEmailKind,
): Promise<EmailReservation> {
  try {
    const { data, error } = await getServiceClient()
      .from("message_log")
      .insert({ booking_id: bookingId, channel: "email", kind, status: "sending" })
      .select("id")
      .single<{ id: string }>();

    if (!error && data) return { state: "reserved", logId: data.id };
    if (error?.code === "23505") return { state: "already_reserved" };

    console.error("[notifications] could not reserve email", bookingId, kind, error);
    return { state: "failed" };
  } catch (err) {
    console.error("[notifications] could not reserve email", bookingId, kind, err);
    return { state: "failed" };
  }
}

async function completeReservedBookingEmail(
  logId: string,
  result: Awaited<ReturnType<typeof sendEmail>>,
): Promise<void> {
  try {
    await getServiceClient()
      .from("message_log")
      .update({
        provider_id: result.ok ? result.id : null,
        status: result.ok ? "sent" : "failed",
        error: result.ok ? null : result.error,
      })
      .eq("id", logId);
  } catch (err) {
    // The provider has already received the email; leave the reservation in
    // place so a logging outage cannot cause a duplicate customer email.
    console.error("[notifications] could not complete email log", logId, err);
  }
}

/**
 * One place where "a thing happened to a booking" turns into "messages go out".
 *
 * Every function here resolves rather than throws, and logs what it did to
 * message_log. Layer 6 adds the SMS half alongside each email; Layer 7's crons
 * call into the same functions.
 */

function icsFor(booking: Booking): string {
  const start = new Date(booking.starts_at);
  const dayLabel = formatInTimeZone(start, booking.timezone, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(start, booking.timezone, "h:mm a");

  return buildIcs({
    // Tied to the booking id so a re-send updates the same calendar entry
    // instead of creating a second one.
    uid: `booking-${booking.id}@cmbbookings`,
    summary: `Free session with ${business.trainerName} — ${business.name}`,
    description: [
      `Your free ${business.session.label} with ${business.trainerName}.`,
      `${dayLabel} at ${timeLabel}.`,
      `Bring comfortable clothes, athletic shoes, and water.`,
      ``,
      `Phone: ${business.phone}`,
      `Email: ${business.email}`,
    ].join("\n"),
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    organizerName: business.name,
    organizerEmail: business.email,
  });
}

/**
 * Confirmation email + .ics, immediately after booking.
 *
 * `confirmation_sent_at` is stamped only on success, so a failed send stays
 * visibly unsent — that column is what a future retry would key off.
 */
export async function sendConfirmationEmail(booking: Booking): Promise<void> {
  if (!isResendConfigured()) {
    await logMessage({
      bookingId: booking.id,
      channel: "email",
      kind: "confirmation",
      status: "skipped",
      error: "Resend not configured",
    });
    return;
  }

  if (booking.confirmation_sent_at) return;

  const reservation = await reserveBookingEmail(booking.id, "confirmation");
  if (reservation.state !== "reserved") return;

  const email = confirmationEmail(booking);
  const result = await sendEmail({
    to: booking.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [
      {
        filename: "session.ics",
        content: Buffer.from(icsFor(booking), "utf8").toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });

  await completeReservedBookingEmail(reservation.logId, result);

  if (!result.ok) {
    console.error("[notifications] confirmation email failed", booking.id, result.error);
    return;
  }

  await getServiceClient()
    .from("bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", booking.id);
}

/**
 * Notifies the trainer that a session was booked. Fires alongside the customer
 * confirmation, never in place of it.
 *
 * Guarded by `admin_notified_at` the same way `confirmation_sent_at` guards the
 * customer email: stamped only on success, checked before sending, so a booking
 * object that's already been through this function once (e.g. a caller that
 * re-runs side effects for the same row) can't double-send.
 */
export async function sendAdminNotificationEmail(booking: Booking): Promise<void> {
  if (!isResendConfigured()) {
    await logMessage({
      bookingId: booking.id,
      channel: "email",
      kind: "admin_notification",
      status: "skipped",
      error: "Resend not configured",
    });
    return;
  }

  if (booking.admin_notified_at) return;

  const reservation = await reserveBookingEmail(booking.id, "admin_notification");
  if (reservation.state !== "reserved") return;

  const email = adminNotificationEmail(booking);
  const result = await sendEmail({
    to: business.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: booking.email,
  });

  await completeReservedBookingEmail(reservation.logId, result);

  if (!result.ok) {
    console.error("[notifications] admin notification email failed", booking.id, result.error);
    return;
  }

  await getServiceClient()
    .from("bookings")
    .update({ admin_notified_at: new Date().toISOString() })
    .eq("id", booking.id);
}

/**
 * Sends the two 24-hour reminders. Each recipient has a separate database
 * reservation, so a failed admin send can be retried without re-emailing the
 * customer (and vice versa). The cron route stamps reminder_24h_sent_at only
 * once both reservations have completed or already exist.
 */
export async function send24HourReminderEmails(booking: Booking): Promise<boolean> {
  if (!isResendConfigured()) return false;

  const customerReservation = await reserveBookingEmail(booking.id, "reminder_24h_customer");
  if (customerReservation.state === "failed") return false;
  if (customerReservation.state === "reserved") {
    const email = customerReminderEmail(booking);
    const result = await sendEmail({
      to: booking.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    await completeReservedBookingEmail(customerReservation.logId, result);
    if (!result.ok) {
      console.error("[notifications] customer reminder email failed", booking.id, result.error);
      return false;
    }
  }

  const adminReservation = await reserveBookingEmail(booking.id, "reminder_24h_admin");
  if (adminReservation.state === "failed") return false;
  if (adminReservation.state === "reserved") {
    const email = adminReminderEmail(booking);
    const result = await sendEmail({
      to: business.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: booking.email,
    });
    await completeReservedBookingEmail(adminReservation.logId, result);
    if (!result.ok) {
      console.error("[notifications] admin reminder email failed", booking.id, result.error);
      return false;
    }
  }

  return true;
}

/** The final one-hour reminder, separately idempotent from the 24-hour send. */
export async function send1HourReminderEmails(booking: Booking): Promise<boolean> {
  if (!isResendConfigured()) return false;

  const customerReservation = await reserveBookingEmail(booking.id, "reminder_1h_customer");
  if (customerReservation.state === "failed") return false;
  if (customerReservation.state === "reserved") {
    const email = customerOneHourReminderEmail(booking);
    const result = await sendEmail({ to: booking.email, subject: email.subject, html: email.html, text: email.text });
    await completeReservedBookingEmail(customerReservation.logId, result);
    if (!result.ok) {
      console.error("[notifications] one-hour customer reminder failed", booking.id, result.error);
      return false;
    }
  }

  const adminReservation = await reserveBookingEmail(booking.id, "reminder_1h_admin");
  if (adminReservation.state === "failed") return false;
  if (adminReservation.state === "reserved") {
    const email = adminOneHourReminderEmail(booking);
    const result = await sendEmail({
      to: business.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: booking.email,
    });
    await completeReservedBookingEmail(adminReservation.logId, result);
    if (!result.ok) {
      console.error("[notifications] one-hour admin reminder failed", booking.id, result.error);
      return false;
    }
  }

  return true;
}

/** Acknowledgement after a self-serve cancellation. */
export async function sendCancellationEmail(booking: Booking): Promise<void> {
  if (!isResendConfigured()) return;

  const email = cancelledEmail(booking);
  const result = await sendEmail({
    to: booking.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  await logMessage({
    bookingId: booking.id,
    channel: "email",
    kind: "cancellation",
    providerId: result.ok ? result.id : null,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error,
  });

  if (!result.ok) {
    console.error("[notifications] cancellation email failed", booking.id, result.error);
  }
}
