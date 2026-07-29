"use client";

import { useState } from "react";
import Link from "next/link";

import { business } from "@/lib/config";
import { SessionDetails } from "./StatusCard";

/**
 * The deliberate second click. The email link opens this page; nothing is
 * cancelled until someone presses the button, which is what keeps email link
 * scanners from cancelling real bookings on the prospect's behalf.
 */
export default function CancelSession({
  token,
  firstName,
  dayLabel,
  timeLabel,
}: {
  token: string;
  firstName: string;
  dayLabel: string;
  timeLabel: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function cancel() {
    setState("working");
    try {
      const res = await fetch(`/api/bookings/${token}/cancel`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">
          Your {dayLabel} session is off the books. Nothing else to do.
        </p>
        <SessionDetails dayLabel={dayLabel} timeLabel={timeLabel} strike />
        <Link href="/" className="btn-primary mt-6 w-full">
          Book another time
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="mt-2 text-[15px] leading-relaxed text-white/60">
        {firstName}, this will cancel your free session. No hard feelings — but
        it can&apos;t be undone from here.
      </p>

      <SessionDetails dayLabel={dayLabel} timeLabel={timeLabel} />

      {state === "error" ? (
        <p className="mt-4 text-sm text-flame">
          That didn&apos;t go through. Try again, or text {business.phone} and I&apos;ll
          take care of it.
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={cancel}
          disabled={state === "working"}
          className="btn-glass w-full disabled:opacity-50"
        >
          {state === "working" ? "Cancelling…" : "Yes, cancel my session"}
        </button>

        <Link href="/" className="btn-primary w-full">
          Never mind, keep it
        </Link>
      </div>
    </>
  );
}
