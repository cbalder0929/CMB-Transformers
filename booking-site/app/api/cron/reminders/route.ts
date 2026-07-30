import { NextResponse } from "next/server";

import { env, isResendConfigured, isSupabaseConfigured } from "@/lib/env";
import { send1HourReminderEmails, send24HourReminderEmails } from "@/lib/notifications";
import { getServiceClient, type Booking } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOUR = 60 * 60 * 1000;

/**
 * Vercel invokes this every minute. The one-hour look-back is a recovery
 * window for a delayed invocation; timestamps are UTC instants in Postgres,
 * so DST and each booking's display timezone cannot shift this calculation.
 */
export async function GET(request: Request) {
  if (!env.app.cronSecret || request.headers.get("authorization") !== `Bearer ${env.app.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !isResendConfigured()) {
    return NextResponse.json({ ok: false, error: "Reminders are not configured." }, { status: 503 });
  }

  const supabase = getServiceClient();
  const now = Date.now();
  const runReminder = async (
    hoursBefore: number,
    sentColumn: "reminder_24h_sent_at" | "reminder_1h_sent_at",
    send: (booking: Booking) => Promise<boolean>,
  ) => {
    const latestDueAt = new Date(now + hoursBefore * HOUR);
    const earliestDueAt = new Date(latestDueAt.getTime() - HOUR);
    const { data, error } = await supabase
      .from("bookings")
      .select()
      .in("status", ["booked", "confirmed"])
      .is(sentColumn, null)
      .gt("starts_at", earliestDueAt.toISOString())
      .lte("starts_at", latestDueAt.toISOString());
    if (error) throw error;

    let sent = 0;
    let deferred = 0;
    for (const booking of (data ?? []) as Booking[]) {
      if (!(await send(booking))) {
        deferred += 1;
        continue;
      }
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ [sentColumn]: new Date().toISOString() })
        .eq("id", booking.id)
        .is(sentColumn, null);
      if (updateError) {
        console.error("[cron/reminders] could not stamp reminder", booking.id, updateError);
        deferred += 1;
      } else {
        sent += 1;
      }
    }
    return { sent, deferred };
  };

  try {
    const [oneHour, oneDay] = await Promise.all([
      runReminder(1, "reminder_1h_sent_at", send1HourReminderEmails),
      runReminder(24, "reminder_24h_sent_at", send24HourReminderEmails),
    ]);
    return NextResponse.json({ ok: true, oneHour, oneDay });
  } catch (error) {
    console.error("[cron/reminders] could not load due bookings", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
