import Link from "next/link";
import { business } from "@/lib/config";

/**
 * The shell for the pages people land on from an email link. Shared so a
 * "you're confirmed" and a "that link has expired" feel like the same site.
 */

type Tone = "good" | "neutral" | "bad";

const ICONS: Record<Tone, React.ReactNode> = {
  good: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
  neutral: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M12 3l9 16H3l9-16z" />,
  bad: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
};

export default function StatusCard({
  tone = "good",
  title,
  subtitle,
  children,
  actions,
}: {
  tone?: Tone;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16 sm:px-8">
      <div className="glass p-8 text-center animate-fade-up">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
            tone === "good" ? "bg-facet-warm shadow-glow" : "border border-white/15 bg-white/[0.06]"
          }`}
        >
          <svg
            className="h-7 w-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            aria-hidden
          >
            {ICONS[tone]}
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tightest">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-[15px] leading-relaxed text-white/60">{subtitle}</p>
        ) : null}

        {children}
        {actions ? <div className="mt-6 space-y-3">{actions}</div> : null}

        <p className="mt-6 text-xs leading-relaxed text-white/40">
          Anything else? Text {business.phone} and I&apos;ll sort it out.
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-center text-sm text-white/40 underline underline-offset-4"
      >
        Back to {business.name}
      </Link>
    </main>
  );
}

/** The session details block, shared by both landing pages. */
export function SessionDetails({
  dayLabel,
  timeLabel,
  strike = false,
}: {
  dayLabel: string;
  timeLabel: string;
  strike?: boolean;
}) {
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">
      <Row label="When">
        <span className={strike ? "line-through opacity-50" : undefined}>
          {dayLabel} at {timeLabel}
        </span>
      </Row>
      <Row label="Where">
        {business.location.name}
        <br />
        {business.location.address}, {business.location.cityState}
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
        {label}
      </span>
      <span className="text-sm leading-relaxed text-white/75">{children}</span>
    </div>
  );
}
