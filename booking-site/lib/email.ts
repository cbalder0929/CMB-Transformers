import { env, isResendConfigured, isSandboxSender } from "./env";
import { getServiceClient } from "./supabase";
import { business } from "./config";

/**
 * Resend over plain fetch — same reasoning as google-calendar.ts. The whole
 * API surface we need is one POST.
 *
 * Nothing in here throws. Sending mail is a side effect of booking, never a
 * precondition for it: if Resend is down, the booking still saved, the calendar
 * event still exists, and you can text the person. A thrown error here would
 * turn a working booking into a failed one.
 */

const RESEND_URL = "https://api.resend.com/emails";

export type EmailAttachment = {
  filename: string;
  /** base64-encoded file contents */
  content: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
};

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; skipped?: boolean };

/**
 * Resend wants either "you@example.com" or "Name <you@example.com>". If the
 * env var already carries a display name, leave it alone.
 */
function fromAddress(): string {
  const configured = env.resend.fromEmail;
  return configured.includes("<") ? configured : `${business.name} <${configured}>`;
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  if (!isResendConfigured()) {
    return { ok: false, error: "Resend is not configured", skipped: true };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? business.email,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
      }),
      cache: "no-store",
    });

    const body = (await res.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!res.ok) {
      // The one you'll actually hit in development: the sandbox sender refuses
      // to deliver anywhere except the Resend account owner's own inbox.
      const hint =
        res.status === 403 && isSandboxSender()
          ? " (the resend.dev sandbox sender can only email the address that owns your Resend account — verify a domain to reach anyone else)"
          : "";
      return { ok: false, error: `Resend ${res.status}: ${body?.message ?? "unknown"}${hint}` };
    }

    return { ok: true, id: body?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type MessageKind =
  | "confirmation"
  | "admin_notification"
  | "reminder_24h_customer"
  | "reminder_24h_admin"
  | "reminder_1h_customer"
  | "reminder_1h_admin"
  | "reminder_24h"
  | "reminder_2h"
  | "followup"
  | "cancellation";

/**
 * Write-only audit trail. Every send lands here, successes and failures alike —
 * when someone swears they never got a reminder, this is the answer. Failures
 * to log are swallowed: a broken log must not break a working send.
 */
export async function logMessage(entry: {
  bookingId: string;
  channel: "email" | "sms";
  kind: MessageKind;
  providerId?: string | null;
  status: "sent" | "failed" | "skipped";
  error?: string | null;
}): Promise<void> {
  try {
    await getServiceClient().from("message_log").insert({
      booking_id: entry.bookingId,
      channel: entry.channel,
      kind: entry.kind,
      provider_id: entry.providerId ?? null,
      status: entry.status,
      error: entry.error ?? null,
    });
  } catch (err) {
    console.error("[email] could not write message_log", err);
  }
}
