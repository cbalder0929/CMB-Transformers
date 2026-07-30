import { formatInTimeZone } from "date-fns-tz";

import { business } from "@/lib/config";
import type { Booking } from "@/lib/supabase";
import { shell, detailRow, escapeHtml, H1, P, type Email } from "./shell";

/**
 * Sent to the trainer the moment a booking saves. Not a nice-to-have — it's
 * how you find out someone booked at all, since nothing else pages you.
 */
export function adminNotificationEmail(booking: Booking): Email {
  const start = new Date(booking.starts_at);
  const tz = booking.timezone;

  const dayLabel = formatInTimeZone(start, tz, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(start, tz, "h:mm a zzz");
  const clientName = `${booking.first_name} ${booking.last_name}`;

  const body = `
    <h1 style="${H1}">New session booked.</h1>
    <p style="${P}">${escapeHtml(clientName)} just booked a ${escapeHtml(business.session.label)}.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("Client", escapeHtml(clientName))}
      ${detailRow("Email", `<a href="mailto:${booking.email}" style="color:#6B6478;">${escapeHtml(booking.email)}</a>`)}
      ${detailRow("Phone", `<a href="tel:${booking.phone}" style="color:#6B6478;">${escapeHtml(booking.phone)}</a>`)}
      ${detailRow("Date", escapeHtml(dayLabel))}
      ${detailRow("Time", escapeHtml(timeLabel))}
      ${detailRow("Session type", escapeHtml(business.session.label))}
      ${booking.notes ? detailRow("Notes", escapeHtml(booking.notes)) : ""}
    </table>`;

  const text = [
    `New session booked.`,
    ``,
    `${clientName} just booked a ${business.session.label}.`,
    ``,
    `Client:       ${clientName}`,
    `Email:        ${booking.email}`,
    `Phone:        ${booking.phone}`,
    `Date:         ${dayLabel}`,
    `Time:         ${timeLabel}`,
    `Session type: ${business.session.label}`,
    ...(booking.notes ? [`Notes:        ${booking.notes}`] : []),
  ].join("\n");

  return {
    subject: `New Personal Training Session Scheduled`,
    html: shell({ preheader: `${clientName} — ${dayLabel} at ${timeLabel}`, body }),
    text,
  };
}
