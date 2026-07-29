import { NextResponse } from "next/server";

import { confirmBooking } from "@/lib/booking-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bookings/[token]/confirm
 *
 * The /confirmed/[token] page confirms on load, so this route exists for the
 * cases that aren't a browser: Layer 6's Twilio webhook handling a "Y" reply,
 * and anything you script by hand. Still POST — see the cancel route for why
 * mutating on GET is a trap when links live in emails.
 */
export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const result = await confirmBooking(params.token);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, alreadyDone: result.alreadyDone });
}
