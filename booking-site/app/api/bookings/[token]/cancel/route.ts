import { NextResponse } from "next/server";

import { cancelBooking } from "@/lib/booking-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bookings/[token]/cancel
 *
 * POST, not GET, and this is the important detail in the whole layer.
 *
 * Corporate mail security (Outlook Safe Links, Proofpoint, Mimecast) fetches
 * every URL in an incoming email to check it for malware. Gmail prefetches for
 * previews. If cancelling were a GET, those scanners would silently cancel
 * real bookings seconds after the confirmation email arrived, and the symptom —
 * "people book and then it just disappears" — is close to undebuggable.
 *
 * So the email links to a *page*, the page has a button, and the button POSTs.
 * A scanner following the link renders the page and cancels nothing.
 */
export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const result = await cancelBooking(params.token);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, alreadyDone: result.alreadyDone });
}
