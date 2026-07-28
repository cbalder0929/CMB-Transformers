"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { bookingSchema, type BookingInput } from "@/lib/validation";
import { formatAsYouType } from "@/lib/phone";
import { business, goalOptions, experienceOptions } from "@/lib/config";

const fieldBase =
  "w-full rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white placeholder-white/35 outline-none transition focus:border-flame/60 focus:bg-white/[0.09]";

export type SubmitResult =
  | { ok: true; booking: BookingSuccess }
  | { ok: false; error: string; code?: string };

export type BookingSuccess = {
  id: string;
  firstName: string;
  startsAt: string;
  actionToken: string;
  dayLabel: string;
  timeLabel: string;
};

export default function BookingForm({
  startsAt,
  slotLabel,
  onSuccess,
  onSlotTaken,
}: {
  startsAt: string;
  slotLabel: string;
  onSuccess: (booking: BookingSuccess) => void;
  onSlotTaken: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      goal: "",
      experienceLevel: "",
      notes: "",
      smsConsent: false,
      startsAt,
      website: "",
    },
  });

  async function onSubmit(values: BookingInput) {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, startsAt }),
      });
      const json = await res.json();

      if (res.ok && json.ok) {
        onSuccess(json.booking);
        return;
      }

      if (json.code === "SLOT_TAKEN") {
        onSlotTaken();
        return;
      }

      setError("root", { message: json.error ?? "Something went wrong. Try again." });
    } catch {
      setError("root", {
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Locked-in slot, always visible so nobody submits blind */}
      <div className="flex items-center gap-3 rounded-xl border border-flame/25 bg-flame/10 px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-flame"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[15px] font-semibold tracking-tight">{slotLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={errors.firstName?.message}>
          <input
            {...register("firstName")}
            className={fieldBase}
            autoComplete="given-name"
            placeholder="Jordan"
          />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input
            {...register("lastName")}
            className={fieldBase}
            autoComplete="family-name"
            placeholder="Rivera"
          />
        </Field>
      </div>

      <Field label="Email" error={errors.email?.message}>
        <input
          {...register("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          className={fieldBase}
          placeholder="you@email.com"
        />
      </Field>

      <Field label="Mobile number" error={errors.phone?.message}>
        <input
          {...register("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className={fieldBase}
          placeholder="(555) 123-4567"
          onChange={(e) =>
            setValue("phone", formatAsYouType(e.target.value), { shouldValidate: false })
          }
        />
      </Field>

      <Field label="What are you after?" error={errors.goal?.message} optional>
        <select {...register("goal")} className={fieldBase}>
          <option value="">Pick one</option>
          {goalOptions.map((g) => (
            <option key={g} value={g} className="bg-night-900">
              {g}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Training experience" error={errors.experienceLevel?.message} optional>
        <select {...register("experienceLevel")} className={fieldBase}>
          <option value="">Pick one</option>
          {experienceOptions.map((e) => (
            <option key={e} value={e} className="bg-night-900">
              {e}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Anything I should know?"
        error={errors.notes?.message}
        optional
        hint="Injuries, surgeries, anything that limits how you move."
      >
        <textarea {...register("notes")} rows={3} className={`${fieldBase} resize-none`} />
      </Field>

      {/* Honeypot — hidden from humans, irresistible to bots */}
      <input
        {...register("website")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <input
          {...register("smsConsent")}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/25 bg-white/10 accent-flame"
        />
        <span className="text-[13px] leading-relaxed text-white/60">
          I agree to receive appointment reminders and confirmations by text message from{" "}
          {business.name} at the number provided. Message frequency varies. Message and data
          rates may apply. Reply STOP to opt out, HELP for help. See our{" "}
          <a href="/privacy" className="underline decoration-white/30 underline-offset-2">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="underline decoration-white/30 underline-offset-2">
            Terms
          </a>
          .
        </span>
      </label>

      {errors.root?.message && (
        <p className="rounded-xl border border-ember/40 bg-ember/15 px-4 py-3 text-sm text-white">
          {errors.root.message}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
        {isSubmitting ? (
          <>
            <span className="mr-2.5 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Booking…
          </>
        ) : (
          "Confirm my free session"
        )}
      </button>

      <p className="text-center text-xs text-white/40">
        No card, no deposit. Cancel any time from your confirmation email.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  hint,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2 text-[13px] font-semibold tracking-tight text-white/70">
        {label}
        {optional && <span className="text-[11px] font-normal text-white/35">optional</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-white/35">{hint}</span>}
      {/* amber, not red — #D83627 on a dark indigo ground fails contrast */}
      {error && <span className="mt-1.5 block text-xs text-amber">{error}</span>}
    </label>
  );
}
