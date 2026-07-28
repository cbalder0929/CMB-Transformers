import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

import { getServiceClient, PG_UNIQUE_VIOLATION, type Booking } from "@/lib/supabase";
import { getOpenSlots } from "@/lib/open-slots";
import { isSlotOpen } from "@/lib/availability";
import { bookingSchema } from "@/lib/validation";
import { toE164 } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/env";
import { createCalendarEvent } from "@/lib/google-calendar";
import { business } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bookings
 *
 * The order of operations here is the whole ballgame:
 *   validate -> re-check the slot -> INSERT -> calendar event
 *
 * The re-check is not redundant with the picker. Someone can sit on the page
 * for ten minutes while another person books the same 6pm. The unique index on
 * bookings(starts_at) is the real guarantee; the re-check just turns a nasty
 * database error into a polite "that one just went".
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Online booking isn't switched on yet. Text me and I'll get you in." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot. Answer 200 so the bot doesn't learn anything, but save nothing.
  if (data.website) {
    return NextResponse.json({ ok: true, booking: null });
  }

  const phoneE164 = toE164(data.phone);
  if (!phoneE164) {
    return NextResponse.json(
      { error: "Enter a 10-digit US phone number", field: "phone" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  // --- Re-check availability against live data ------------------------------
  let slotEndsAt: string;
  let timezone: string;
  try {
    const { days, timezone: tz } = await getOpenSlots();
    timezone = tz;
    const slot = isSlotOpen(days, data.startsAt);
    if (!slot) {
      return NextResponse.json(
        {
          error: "Sorry — that time was just taken. Pick another and you're set.",
          code: "SLOT_TAKEN",
        },
        { status: 409 },
      );
    }
    slotEndsAt = slot.endsAt;
  } catch (err) {
    console.error("[api/bookings] availability re-check failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  // --- Insert ---------------------------------------------------------------
  const forwardedFor = request.headers.get("x-forwarded-for");
  const consentIp = forwardedFor?.split(",")[0]?.trim() ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email.toLowerCase(),
      phone: phoneE164,
      goal: data.goal || null,
      experience_level: data.experienceLevel || null,
      notes: data.notes || null,
      sms_consent: data.smsConsent,
      // Only meaningful if they actually ticked the box. Storing an IP and
      // timestamp for a non-consent would be worse than storing nothing.
      consent_ip: data.smsConsent ? consentIp : null,
      consent_at: data.smsConsent ? new Date().toISOString() : null,
      starts_at: data.startsAt,
      ends_at: slotEndsAt,
      timezone,
      status: "booked",
    })
    .select()
    .single<Booking>();

  if (insertError) {
    if (insertError.code === PG_UNIQUE_VIOLATION) {
      // Two submissions in the same instant. The index caught it.
      return NextResponse.json(
        {
          error: "Sorry — that time was just taken. Pick another and you're set.",
          code: "SLOT_TAKEN",
        },
        { status: 409 },
      );
    }
    console.error("[api/bookings] insert failed", insertError);
    return NextResponse.json({ error: "Could not save your booking." }, { status: 500 });
  }

  // --- Calendar event -------------------------------------------------------
  // Best-effort. A booking that saved but didn't sync is recoverable; a booking
  // the prospect thinks failed is not. So a calendar error never fails the POST.
  try {
    const eventId = await createCalendarEvent({
      summary: `Free session — ${inserted.first_name} ${inserted.last_name}`,
      description: [
        `${inserted.first_name} ${inserted.last_name}`,
        `Phone: ${inserted.phone}`,
        `Email: ${inserted.email}`,
        inserted.goal ? `Goal: ${inserted.goal}` : null,
        inserted.experience_level ? `Experience: ${inserted.experience_level}` : null,
        inserted.notes ? `Notes: ${inserted.notes}` : null,
        `SMS consent: ${inserted.sms_consent ? "yes" : "no"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      location: `${business.location.name}, ${business.location.address}, ${business.location.cityState}`,
      startsAt: inserted.starts_at,
      endsAt: inserted.ends_at,
      timezone: inserted.timezone,
      attendeeEmail: inserted.email,
    });

    if (eventId) {
      await supabase
        .from("bookings")
        .update({ google_event_id: eventId })
        .eq("id", inserted.id);
    }
  } catch (err) {
    console.error("[api/bookings] calendar sync failed for", inserted.id, err);
  }

  // Layer 5/6 hook: confirmation email + SMS go here.

  return NextResponse.json({
    ok: true,
    booking: {
      id: inserted.id,
      firstName: inserted.first_name,
      startsAt: inserted.starts_at,
      actionToken: inserted.action_token,
      dayLabel: formatInTimeZone(
        new Date(inserted.starts_at),
        inserted.timezone,
        "EEEE, MMMM d",
      ),
      timeLabel: formatInTimeZone(new Date(inserted.starts_at), inserted.timezone, "h:mm a"),
    },
  });
}
