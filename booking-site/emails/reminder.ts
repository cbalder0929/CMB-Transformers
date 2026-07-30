import { formatInTimeZone } from "date-fns-tz";

import { business } from "@/lib/config";
import type { Booking } from "@/lib/supabase";
import { shell, detailRow, escapeHtml, H1, P, SMALL, type Email } from "./shell";

function when(booking: Booking) {
  const start = new Date(booking.starts_at);
  return {
    day: formatInTimeZone(start, booking.timezone, "EEEE, MMMM d"),
    time: formatInTimeZone(start, booking.timezone, "h:mm a zzz"),
  };
}

export function customerReminderEmail(booking: Booking): Email {
  const { day, time } = when(booking);
  const body = `
    <h1 style="${H1}">See you tomorrow, ${escapeHtml(booking.first_name)}.</h1>
    <p style="${P}">A quick reminder about your free ${escapeHtml(business.session.label)} with ${escapeHtml(business.trainerName)}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("When", `${escapeHtml(day)}<br><strong style="color:#181420;">${escapeHtml(time)}</strong>`)}
      ${detailRow("Where", `${escapeHtml(business.location.name)}<br>${escapeHtml(business.location.address)}, ${escapeHtml(business.location.cityState)}`)}
      ${detailRow("Bring", "Comfortable clothes, athletic shoes, and water.")}
    </table>
    <p style="${SMALL}">Need help? Reply to this email or text ${escapeHtml(business.phone)}.</p>`;

  return {
    subject: `Reminder: your CMB Bookings session is tomorrow`,
    html: shell({ preheader: `${day} at ${time}`, body }),
    text: [
      `See you tomorrow, ${booking.first_name}.`, "",
      `Your free ${business.session.label} with ${business.trainerName}:`,
      `WHEN: ${day} at ${time}`,
      `WHERE: ${business.location.name}, ${business.location.address}, ${business.location.cityState}`,
      `BRING: Comfortable clothes, athletic shoes, and water.`, "",
      `Questions? Reply to this email or text ${business.phone}.`,
    ].join("\n"),
  };
}

export function adminReminderEmail(booking: Booking): Email {
  const { day, time } = when(booking);
  const clientName = `${booking.first_name} ${booking.last_name}`;
  const body = `
    <h1 style="${H1}">Session tomorrow.</h1>
    <p style="${P}">${escapeHtml(clientName)} is scheduled for tomorrow.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("Client", escapeHtml(clientName))}
      ${detailRow("Phone", escapeHtml(booking.phone))}
      ${detailRow("When", `${escapeHtml(day)} at ${escapeHtml(time)}`)}
    </table>`;

  return {
    subject: `Reminder: ${clientName}'s session is tomorrow`,
    html: shell({ preheader: `${clientName} â€” ${day} at ${time}`, body }),
    text: [`Session tomorrow.`, "", `Client: ${clientName}`, `Phone: ${booking.phone}`, `When: ${day} at ${time}`].join("\n"),
  };
}

export function customerOneHourReminderEmail(booking: Booking): Email {
  const { day, time } = when(booking);
  const body = `
    <h1 style="${H1}">See you in one hour, ${escapeHtml(booking.first_name)}.</h1>
    <p style="${P}">Your free ${escapeHtml(business.session.label)} with ${escapeHtml(business.trainerName)} starts soon.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("When", `${escapeHtml(day)}<br><strong style="color:#181420;">${escapeHtml(time)}</strong>`)}
      ${detailRow("Where", `${escapeHtml(business.location.name)}<br>${escapeHtml(business.location.address)}, ${escapeHtml(business.location.cityState)}`)}
    </table>
    <p style="${SMALL}">Need help? Reply to this email or text ${escapeHtml(business.phone)}.</p>`;

  return {
    subject: `Reminder: your CMB Bookings session starts in 1 hour`,
    html: shell({ preheader: `${day} at ${time}`, body }),
    text: [
      `See you in one hour, ${booking.first_name}.`, "",
      `Your free ${business.session.label} with ${business.trainerName} starts at ${time}.`,
      `WHERE: ${business.location.name}, ${business.location.address}, ${business.location.cityState}`,
    ].join("\n"),
  };
}

export function adminOneHourReminderEmail(booking: Booking): Email {
  const { day, time } = when(booking);
  const clientName = `${booking.first_name} ${booking.last_name}`;
  const body = `
    <h1 style="${H1}">Session in one hour.</h1>
    <p style="${P}">${escapeHtml(clientName)} starts at ${escapeHtml(time)}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      ${detailRow("Client", escapeHtml(clientName))}
      ${detailRow("Phone", escapeHtml(booking.phone))}
      ${detailRow("When", `${escapeHtml(day)} at ${escapeHtml(time)}`)}
    </table>`;

  return {
    subject: `Reminder: ${clientName}'s session starts in 1 hour`,
    html: shell({ preheader: `${clientName} starts at ${time}`, body }),
    text: [`Session in one hour.`, "", `Client: ${clientName}`, `Phone: ${booking.phone}`, `When: ${day} at ${time}`].join("\n"),
  };
}
