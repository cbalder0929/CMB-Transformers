"use client";

import type { Slot } from "@/lib/availability";

/** Two-column grid of 48px buttons — thumb-sized, no mis-taps. */
export default function TimeSlots({
  slots,
  selected,
  onSelect,
  timezoneLabel,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (startsAt: string) => void;
  timezoneLabel: string;
}) {
  if (slots.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/50">
        Nothing open that day. Try another.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
          Choose a time
        </p>
        <p className="text-[11px] text-white/35">{timezoneLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Choose a time">
        {slots.map((slot) => {
          const isActive = slot.startsAt === selected;
          return (
            <button
              key={slot.startsAt}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(slot.startsAt)}
              className={`tap-target flex items-center justify-center rounded-xl border px-3 py-3 text-[15px] font-semibold tracking-tight transition ${
                isActive
                  ? "border-transparent bg-facet-warm text-white shadow-glow"
                  : "border-white/12 bg-white/[0.06] text-white/80 active:scale-[0.97]"
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
