import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";

import { getBookingByToken } from "@/lib/booking-actions";
import StatusCard, { SessionDetails } from "@/components/StatusCard";
import CancelSession from "@/components/CancelSession";
import { business } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Cancel your session — ${business.name}`,
  robots: { index: false, follow: false },
};

/**
 * Renders the booking and a button. Cancelling itself is a POST from the
 * client component — this page only ever reads, so a link scanner fetching the
 * URL changes nothing.
 */
export default async function CancelPage({ params }: { params: { token: string } }) {
  const booking = await getBookingByToken(params.token);

  if (!booking) {
    return (
      <StatusCard
        tone="neutral"
        title="That link doesn't work."
        subtitle={`It may have been mistyped or cut in half by an email client. Text ${business.phone} and I'll cancel it for you.`}
      />
    );
  }

  const start = new Date(booking.starts_at);
  const dayLabel = formatInTimeZone(start, booking.timezone, "EEEE, MMMM d");
  const timeLabel = formatInTimeZone(start, booking.timezone, "h:mm a");

  if (booking.status === "cancelled") {
    return (
      <StatusCard
        tone="neutral"
        title="Already cancelled."
        subtitle="This one's already off the books. Nothing else to do."
        actions={
          <a href="/" className="btn-primary w-full">
            Book another time
          </a>
        }
      >
        <SessionDetails dayLabel={dayLabel} timeLabel={timeLabel} strike />
      </StatusCard>
    );
  }

  if (start.getTime() < Date.now()) {
    return (
      <StatusCard
        tone="neutral"
        title="That session has already passed."
        subtitle="Nothing left to cancel. If you'd like another, pick a new time."
        actions={
          <a href="/" className="btn-primary w-full">
            Book another time
          </a>
        }
      />
    );
  }

  return (
    <StatusCard tone="neutral" title="Cancel this session?">
      <CancelSession
        token={booking.action_token}
        firstName={booking.first_name}
        dayLabel={dayLabel}
        timeLabel={timeLabel}
      />
    </StatusCard>
  );
}
