"use client";

import { useEffect, useRef } from "react";
import type { DayOfSlots } from "@/lib/availability";

/**
 * Horizontal strip of days, not a calendar grid.
 *
 * A month grid on a phone is 42 tiny tap targets, most of them unbookable.
 * A scroll strip of only the days you can actually book is one thumb gesture
 * and every target is 64px wide.
 */
export default function DatePicker({
  days,
  selected,
  onSelect,
}: {
  days: DayOfSlots[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the chosen day in view when it changes from outside (e.g. auto-select).
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
        Choose a day
      </p>

      <div
        ref={scroller}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1"
        role="radiogroup"
        aria-label="Choose a day"
      >
        {days.map((day) => {
          const isActive = day.date === selected;
          return (
            <button
              key={day.date}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(day.date)}
              className={`tap-target flex shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-4 py-3 transition ${
                isActive
                  ? "border-transparent bg-facet-warm text-white shadow-glow"
                  : "border-white/12 bg-white/[0.06] text-white/75 active:scale-[0.97]"
              }`}
              style={{ minWidth: 76 }}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-widest ${
                  isActive ? "text-white/80" : "text-white/45"
                }`}
              >
                {day.weekday}
              </span>
              <span className="mt-0.5 whitespace-nowrap text-[15px] font-semibold tracking-tight">
                {day.dayLabel}
              </span>
              <span
                className={`mt-0.5 text-[11px] ${isActive ? "text-white/75" : "text-white/40"}`}
              >
                {day.slots.length} open
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
