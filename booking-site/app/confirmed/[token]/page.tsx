import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";

import { confirmBooking } from "@/lib/booking-actions";
import StatusCard, { SessionDetails } from "@/components/StatusCard";
import { business } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `You're confirmed — ${business.name}`,
  robots: { index: false, follow: false },
};

/**
 * Confirming happens on page load rather than behind a button, unlike cancel.
 *
 * The tradeoff: a corporate link scanner that prefetches this URL will mark the
 * booking confirmed without the person having read the email. That's a false
 * positive on a signal, and the cost is that a reminder you'd otherwise send
 * looks unnecessary. Cancelling on a prefetch would destroy a real booking.
 * Different blast radius, different design — one click here, two to cancel.
 */
export default async function ConfirmedPage({ params }: { params: { token: string } }) {
  const result = await confirmBooking(params.token);

  if (!result.ok) {
    const { title, subtitle } = FAILURES[result.reason];
    return <StatusCard tone="neutral" title={title} subtitle={subtitle} />;
  }

  const { booking, alreadyDone } = result;
  const dayLabel = formatInTimeZone(new Date(booking.starts_at), booking.timezone, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(new Date(booking.starts_at), booking.timezone, "h:mm a");

  return (
    <StatusCard
      tone="good"
      title={alreadyDone ? "Already confirmed." : `See you then, ${booking.first_name}.`}
      subtitle={
        alreadyDone
          ? "You're on the list — nothing further to do."
          : "Thanks for confirming. That genuinely helps."
      }
      actions={
        <a
          href={business.location.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-glass w-full"
        >
          Open in Maps
        </a>
      }
    >
      <SessionDetails dayLabel={dayLabel} timeLabel={timeLabel} />
    </StatusCard>
  );
}

const FAILURES: Record<string, { title: string; subtitle: string }> = {
  not_found: {
    title: "That link doesn't work.",
    subtitle: "It may have been mistyped or cut in half by an email client. Text me and I'll confirm you manually.",
  },
  cancelled: {
    title: "That session was cancelled.",
    subtitle: "Book a new time whenever you're ready — the offer still stands.",
  },
  past: {
    title: "That session has already passed.",
    subtitle: "If you'd like another, book a new time and I'll see you there.",
  },
  error: {
    title: "Something went wrong.",
    subtitle: "Your booking is safe. Text me and I'll confirm it on my end.",
  },
  not_configured: {
    title: "Something went wrong.",
    subtitle: "Your booking is safe. Text me and I'll confirm it on my end.",
  },
};
