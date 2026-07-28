import { NextResponse } from "next/server";
import { getOpenSlots } from "@/lib/open-slots";
import { withOpenSlots } from "@/lib/availability";
import { availabilityQuerySchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/env";
import { booking as bookingConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/availability?from=2026-08-01&days=14
 *
 * Returns only days that have something open, each with its slots already
 * labelled in the business timezone.
 *
 * Note it answers 200 with `configured: false` rather than 500 when Supabase
 * isn't set up yet. The landing page is live; a missing env var should show a
 * "call me" fallback, not a broken page.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      days: [],
      timezone: process.env.BUSINESS_TIMEZONE ?? "America/Chicago",
    });
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { configured: true, error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const { days, timezone, calendarChecked } = await getOpenSlots({
      from: parsed.data.from,
      days: parsed.data.days ?? bookingConfig.maxDaysAhead,
    });

    return NextResponse.json(
      {
        configured: true,
        calendarChecked,
        timezone,
        days: withOpenSlots(days),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/availability]", err);
    return NextResponse.json(
      { configured: true, error: "Could not load available times." },
      { status: 500 },
    );
  }
}
