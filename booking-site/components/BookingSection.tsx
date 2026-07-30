"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DatePicker from "./DatePicker";
import TimeSlots from "./TimeSlots";
import BookingForm, { type BookingSuccess } from "./BookingForm";
import SuccessScreen from "./SuccessScreen";
import { business } from "@/lib/config";
import type { DayOfSlots } from "@/lib/availability";

type AvailabilityResponse = {
  configured: boolean;
  timezone: string;
  days: DayOfSlots[];
  calendarChecked?: boolean;
  error?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string }
  | { kind: "ready"; days: DayOfSlots[]; timezone: string };

/**
 * Owns the whole booking flow: fetch availability -> pick day -> pick time ->
 * fill form -> done. Kept in one component because the steps share so much
 * state that splitting them would mean prop-drilling all of it anyway.
 */
export default function BookingSection() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState<BookingSuccess | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (preserveDate?: string | null) => {
    try {
      const res = await fetch("/api/availability", { cache: "no-store" });
      const json = (await res.json()) as AvailabilityResponse;

      if (!json.configured) {
        setState({ kind: "unconfigured" });
        return;
      }
      if (!res.ok || json.error) {
        setState({ kind: "error", message: json.error ?? "Could not load available times." });
        return;
      }

      setState({ kind: "ready", days: json.days, timezone: json.timezone });

      // Keep the user where they were if that day still has openings.
      const stillThere = preserveDate && json.days.some((d) => d.date === preserveDate);
      setSelectedDate(stillThere ? preserveDate! : (json.days[0]?.date ?? null));
    } catch {
      setState({ kind: "error", message: "Could not load available times." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const days = state.kind === "ready" ? state.days : [];
  const activeDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate],
  );

  const selectedSlotObj = useMemo(
    () => activeDay?.slots.find((s) => s.startsAt === selectedSlot) ?? null,
    [activeDay, selectedSlot],
  );

  const timezoneLabel = useMemo(() => {
    if (state.kind !== "ready") return "";
    try {
      const short = new Intl.DateTimeFormat("en-US", {
        timeZone: state.timezone,
        timeZoneName: "short",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value;
      return short ? `All times ${short}` : "";
    } catch {
      return "";
    }
  }, [state]);

  /** Someone else took the slot between page load and submit. */
  function handleSlotTaken() {
    setNotice("That time was just booked by someone else. Here's what's still open.");
    setSelectedSlot(null);
    void load(selectedDate);
  }

  return (
    <section id="book" className="relative scroll-mt-4 px-5 pb-16 pt-4 sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flame/25 blur-[130px]"
      />

      <div className="mx-auto max-w-lg">
        {!booked && (
          <p
            className="animate-fade-up text-center text-sm text-white/60"
            style={{ animationDelay: "180ms" }}
          >
            <span className="font-semibold text-white">60 min</span>
            {" · "}
            <span className="font-semibold text-white">$0</span>
            {" · "}
            <span className="font-semibold text-white">1:1 workout</span>
          </p>
        )}

        <div className={booked ? "" : "mt-3 animate-fade-up"} style={booked ? undefined : { animationDelay: "220ms" }}>
          {booked ? (
            <SuccessScreen booking={booked} />
          ) : (
            <div className="glass p-6 sm:p-7">
              {state.kind === "loading" && <LoadingSkeleton />}

              {state.kind === "unconfigured" && (
                <Fallback
                  title="Online booking opens shortly"
                  body="The calendar isn't live yet. Text me and I'll get you on the schedule myself."
                />
              )}

              {state.kind === "error" && (
                <Fallback
                  title="Couldn't load the calendar"
                  body="Something went wrong on my end. Try again, or just text me."
                  onRetry={() => {
                    setState({ kind: "loading" });
                    void load(selectedDate);
                  }}
                />
              )}

              {state.kind === "ready" && days.length === 0 && (
                <Fallback
                  title="Fully booked right now"
                  body="Nothing open in the next two weeks. Text me and I'll let you know the moment something frees up."
                />
              )}

              {state.kind === "ready" && days.length > 0 && (
                <div className="space-y-6">
                  {notice && (
                    <p className="rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-white/85">
                      {notice}
                    </p>
                  )}

                  <DatePicker
                    days={days}
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                      setNotice(null);
                    }}
                  />

                  {activeDay && (
                    <TimeSlots
                      slots={activeDay.slots}
                      selected={selectedSlot}
                      onSelect={(startsAt) => {
                        setSelectedSlot(startsAt);
                        setNotice(null);
                      }}
                      timezoneLabel={timezoneLabel}
                    />
                  )}

                  {selectedSlotObj && activeDay ? (
                    <div className="border-t border-white/10 pt-6 animate-fade-up">
                      <BookingForm
                        startsAt={selectedSlotObj.startsAt}
                        slotLabel={`${activeDay.weekday}, ${activeDay.dayLabel} at ${selectedSlotObj.label}`}
                        onSuccess={(b) => {
                          setBooked(b);
                          document
                            .getElementById("book")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        onSlotTaken={handleSlotTaken}
                      />
                    </div>
                  ) : (
                    <div className="border-t border-white/10 pt-6">
                      <button
                        type="button"
                        disabled
                        className="btn-primary w-full cursor-not-allowed opacity-40"
                      >
                        Book my free session
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!booked && (
          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md">
            {[
              { v: "60", l: "minutes" },
              { v: "$0", l: "to start" },
              { v: "1:1", l: "coaching" },
            ].map((s) => (
              <div key={s.l} className="bg-white/[0.04] px-3 py-4 text-center">
                <dt className="text-2xl font-bold tracking-tight">{s.v}</dt>
                <dd className="mt-0.5 text-[11px] uppercase tracking-widest text-white/60">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        )}

      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading available times" role="status">
      <div className="flex gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[74px] w-[76px] shrink-0 rounded-2xl bg-white/[0.07]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-white/[0.07]" />
        ))}
      </div>
    </div>
  );
}

function Fallback({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <p className="font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">{body}</p>
      <div className="mt-6 space-y-2.5">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-glass w-full">
            Try again
          </button>
        )}
        <a href={`sms:${business.phoneE164}`} className="btn-primary w-full">
          Text {business.phone}
        </a>
      </div>
    </div>
  );
}
