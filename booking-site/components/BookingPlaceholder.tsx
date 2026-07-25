import { business } from "@/lib/config";
import { SectionLabel } from "./Includes";

/**
 * LAYER 1 PLACEHOLDER.
 * Layer 2 replaces the dashed panel with <DatePicker /> + <TimeSlots />,
 * Layer 3 adds <BookingForm />. It holds the layout and the #book anchor.
 */
export default function BookingPlaceholder() {
  return (
    <section id="book" className="relative scroll-mt-4 px-5 py-16 sm:px-8">
      {/* Warm bloom behind the booking card — draws the eye to the conversion point */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flame/25 blur-[130px]"
      />

      <div className="mx-auto max-w-lg">
        <SectionLabel>Pick a time</SectionLabel>

        <h2 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tightest sm:text-4xl">
          When works
          <br />
          <span className="text-facet">for you?</span>
        </h2>

        <div className="glass mt-8 p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-facet-warm shadow-glow">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>

          <p className="font-semibold tracking-tight">Calendar loads here</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">
            Layer 2 wires this to your real Google Calendar availability. Layer 3
            adds the booking form.
          </p>

          {/* Skeleton of the real slot grid, so the layout is already proven */}
          <div className="mt-7 grid grid-cols-2 gap-2.5" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl border border-dashed border-white/15 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-white/50">
          Sessions are held at {business.location.name} ·{" "}
          {business.location.cityState}
        </p>
      </div>
    </section>
  );
}
