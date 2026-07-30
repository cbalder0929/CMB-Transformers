import { formatInTimeZone } from "date-fns-tz";

import { business } from "@/lib/config";
import { env } from "@/lib/env";
import type { Booking } from "@/lib/supabase";
import { shell, button, detailRow, escapeHtml, H1, P, SMALL, type Email } from "./shell";

/**
 * Sent the moment someone books.
 *
 * Two jobs: prove the booking is real, and make cancelling easy. The cancel
 * link is prominent on purpose — a cancellation two days out is a slot you can
 * refill, and a no-show is an hour of your life you don't get back.
 */
export function confirmationEmail(booking: Booking): Email {
  const start = new Date(booking.starts_at);
  const tz = booking.timezone;

  const dayLabel = formatInTimeZone(start, tz, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(start, tz, "h:mm a");
  const zoneLabel = formatInTimeZone(start, tz, "zzz");

  const cancelUrl = `${env.app.siteUrl}/cancel/${booking.action_token}`;
  const confirmUrl = `${env.app.siteUrl}/confirmed/${booking.action_token}`;
  const { location } = business;

  const whereHtml = `${escapeHtml(location.name)}<br>
    <a href="${location.mapsUrl}" style="color:#6B6478;">${escapeHtml(location.address)}, ${escapeHtml(location.cityState)}</a>`;

  const body = `
    <h1 style="${H1}">You're booked, ${escapeHtml(booking.first_name)}.</h1>
    <p style="${P}">
      Your free ${escapeHtml(business.session.label)} with ${escapeHtml(business.trainerName)} is set.
      I've attached a calendar file so it lands in your calendar too.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("When", `${escapeHtml(dayLabel)}<br><strong style="color:#181420;">${escapeHtml(timeLabel)} ${escapeHtml(zoneLabel)}</strong>`)}
      ${detailRow("Where", whereHtml)}
      ${detailRow("Bring", "Comfortable clothes, athletic shoes, and water.")}
    </table>

    <p style="${P}">
      Something come up? Cancel any time — no awkward conversation, and it frees
      the slot for someone else.
    </p>

    <div style="margin-top:20px;">
      ${button(location.mapsUrl, "Open in Maps")}
      &nbsp;
      ${button(cancelUrl, "Cancel session", "outline")}
    </div>

    <p style="${SMALL}">
      Questions before then? Just reply to this email, or text
      ${escapeHtml(business.phone)}.
    </p>`;

  const text = [
    `You're booked, ${booking.first_name}.`,
    ``,
    `Your free ${business.session.label} with ${business.trainerName} is set.`,
    ``,
    `WHEN:  ${dayLabel} at ${timeLabel} ${zoneLabel}`,
    `WHERE: ${location.name}, ${location.address}, ${location.cityState}`,
    `BRING: Comfortable clothes, athletic shoes, and water.`,
    ``,
    `Directions:  ${location.mapsUrl}`,
    `Confirm:     ${confirmUrl}`,
    `Cancel:      ${cancelUrl}`,
    ``,
    `Questions? Reply to this email or text ${business.phone}.`,
    ``,
    `-- ${business.name}`,
  ].join("\n");

  return {
    subject: `CMB Bookings - Your Personal Training Session is Confirmed`,
    html: shell({
      preheader: `${dayLabel} at ${timeLabel} with ${business.trainerName}.`,
      body,
    }),
    text,
  };
}
