import { formatInTimeZone } from "date-fns-tz";

import { getServiceClient, type Booking } from "./supabase";
import { sendEmail, logMessage } from "./email";
import { isResendConfigured } from "./env";
import { buildIcs } from "./ics";
import { business } from "./config";
import { confirmationEmail } from "@/emails/confirmation";
import { cancelledEmail } from "@/emails/cancelled";

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
      `Questions: ${business.phone}`,
    ].join("\n"),
    location: `${business.location.name}, ${business.location.address}, ${business.location.cityState}`,
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

  await logMessage({
    bookingId: booking.id,
    channel: "email",
    kind: "confirmation",
    providerId: result.ok ? result.id : null,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error,
  });

  if (!result.ok) {
    console.error("[notifications] confirmation email failed", booking.id, result.error);
    return;
  }

  await getServiceClient()
    .from("bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", booking.id);
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
