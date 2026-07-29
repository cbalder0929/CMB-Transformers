import { formatInTimeZone } from "date-fns-tz";

import { business } from "@/lib/config";
import { env } from "@/lib/env";
import type { Booking } from "@/lib/supabase";
import { shell, button, escapeHtml, H1, P, SMALL, type Email } from "./shell";

/**
 * Sent when someone cancels. Short, warm, and it ends with a rebook link —
 * most cancellations are a scheduling conflict, not a change of heart, and the
 * moment they cancel is the moment they're most likely to pick a new time.
 */
export function cancelledEmail(booking: Booking): Email {
  const start = new Date(booking.starts_at);
  const dayLabel = formatInTimeZone(start, booking.timezone, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(start, booking.timezone, "h:mm a");

  const body = `
    <h1 style="${H1}">Cancelled — no problem.</h1>
    <p style="${P}">
      Your session on ${escapeHtml(dayLabel)} at ${escapeHtml(timeLabel)} is off the books.
      Nothing else to do.
    </p>
    <p style="${P}">
      The offer stands whenever you're ready. Pick a new time and I'll see you then.
    </p>

    <div style="margin-top:20px;">
      ${button(env.app.siteUrl, "Book another time")}
    </div>

    <p style="${SMALL}">
      — ${escapeHtml(business.trainerName)}, ${escapeHtml(business.name)}
    </p>`;

  const text = [
    `Cancelled — no problem.`,
    ``,
    `Your session on ${dayLabel} at ${timeLabel} is off the books. Nothing else to do.`,
    ``,
    `The offer stands whenever you're ready:`,
    env.app.siteUrl,
    ``,
    `-- ${business.trainerName}, ${business.name}`,
  ].join("\n");

  return {
    subject: `Cancelled — your ${dayLabel} session`,
    html: shell({ preheader: `Your ${dayLabel} session has been cancelled.`, body }),
    text,
  };
}
