import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/lib/config";

export const metadata: Metadata = {
  title: `Terms — ${business.name}`,
  robots: { index: true, follow: true },
};

/**
 * Also checked during A2P 10DLC review. Not legal advice — read it, and if
 * you're running this as a registered business, have someone qualified glance
 * at the liability paragraph.
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Link href="/" className="text-sm text-white/50 underline underline-offset-4">
        ← Back
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tightest">Terms of Service</h1>
      <p className="mt-2 text-sm text-white/40">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/70">
        <Section title="The free session">
          One complimentary {business.session.label} per person. No payment, card, or deposit
          is required, and booking one puts you under no obligation to buy anything.
        </Section>

        <Section title="Cancelling and rescheduling">
          Cancel or move your session any time using the link in your confirmation email, or by
          texting {business.phone}. If you don&apos;t show and haven&apos;t told me, I may
          decline to rebook you — the slot could have gone to someone else.
        </Section>

        <Section title="Text messages">
          By ticking the consent box you agree to receive appointment confirmations and
          reminders by text from {business.name} at the number you provided. Message frequency
          varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP
          for help. Consent to receive texts is not a condition of booking a session.
        </Section>

        <Section title="Health and safety">
          Exercise carries risk. Tell me about injuries, medical conditions, medications, or
          anything that affects how you move — before we train, not after. If you have a
          medical condition, get clearance from your doctor first. You take part at your own
          risk, and you&apos;re responsible for stopping if something hurts.
        </Section>

        <Section title="Changes">
          These terms may change. The version on this page at the time you book is the one that
          applies to you.
        </Section>

        <Section title="Contact">
          {business.name}
          <br />
          {business.email}
          <br />
          {business.phone}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold tracking-tight text-white">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
