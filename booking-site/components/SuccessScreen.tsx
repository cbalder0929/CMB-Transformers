"use client";

import { business } from "@/lib/config";
import type { BookingSuccess } from "./BookingForm";

export default function SuccessScreen({ booking }: { booking: BookingSuccess }) {
  return (
    <div className="glass p-8 text-center animate-fade-up">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-facet-warm shadow-glow">
        <svg
          className="h-7 w-7 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h3 className="text-2xl font-bold tracking-tightest">
        You&apos;re in, {booking.firstName}.
      </h3>

      <p className="mt-2 text-[15px] leading-relaxed text-white/60">
        {booking.dayLabel} at {booking.timeLabel}
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">
        <Row label="Where">
          {business.location.name}
          <br />
          {business.location.address}, {business.location.cityState}
        </Row>
        <Row label="Bring">Comfortable clothes, athletic shoes, water.</Row>
        <Row label="How long">{business.session.label}</Row>
      </div>

      <a
        href={business.location.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-glass mt-5 w-full"
      >
        Open in Maps
      </a>

      <p className="mt-5 text-xs leading-relaxed text-white/40">
        Need to move it? Text {business.phone} and I&apos;ll sort it out — no awkward
        conversation required.
      </p>
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
