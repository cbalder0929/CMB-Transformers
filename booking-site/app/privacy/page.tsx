import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/lib/config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${business.name}`,
  robots: { index: true, follow: true },
};

/**
 * Required for Twilio A2P 10DLC approval — the reviewer will actually open
 * this URL and look for the "we don't sell or share phone numbers" sentence.
 * Read it through and make sure every line is true of how you operate.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Link href="/" className="text-sm text-white/50 underline underline-offset-4">
        ← Back
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tightest">Privacy Policy</h1>
      <p className="mt-2 text-sm text-white/40">Last updated: July 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/70">
        <Section title="What I collect">
          When you book a free session I collect your name, email address, phone number, and
          anything you choose to tell me about your goals, training history, or injuries. If
          you tick the text-message box, I also record the date and IP address of that consent
          — that record exists solely to prove you opted in.
        </Section>

        <Section title="What I use it for">
          To schedule your session, send you confirmations and reminders, and follow up
          afterward. That&apos;s all.
        </Section>

        <Section title="Text messages">
          <strong className="text-white">
            I do not sell, rent, or share your phone number with anyone for marketing purposes.
          </strong>{" "}
          Mobile opt-in data and consent records are never shared with third parties. Messages
          are sent through Twilio purely as the delivery carrier. Message frequency varies.
          Message and data rates may apply. Reply STOP to any message to opt out, or HELP for
          help.
        </Section>

        <Section title="Who else sees your data">
          Only the services that make the booking work: Supabase (database), Google Calendar
          (scheduling), Resend (email), and Twilio (text messages). Each of them processes your
          data on my behalf and nothing more. I don&apos;t sell your data to anyone, ever.
        </Section>

        <Section title="How long I keep it">
          Booking records are kept while you&apos;re a client and for a reasonable period after,
          so I have training history if you come back. Ask me to delete yours and I will.
        </Section>

        <Section title="Your choices">
          Email {business.email} or text {business.phone} to see, correct, or delete anything I
          hold about you.
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
