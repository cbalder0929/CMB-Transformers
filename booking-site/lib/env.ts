/**
 * Every environment variable, read in exactly one place.
 *
 * Deliberately does NOT throw when something is missing. The site is already
 * live; a half-configured service should degrade to a friendly message, not a
 * 500 on the landing page. Each `isXConfigured()` guard lets the code above
 * decide what to do.
 */

const str = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : undefined);

export const env = {
  supabase: {
    url: str(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: str(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
  google: {
    clientId: str(process.env.GOOGLE_CLIENT_ID),
    clientSecret: str(process.env.GOOGLE_CLIENT_SECRET),
    refreshToken: str(process.env.GOOGLE_REFRESH_TOKEN),
    // Website-created appointments always go here. GOOGLE_CALENDAR_ID is kept
    // as a migration fallback so existing deployments can move safely.
    bookingCalendarId:
      str(process.env.BOOKING_CALENDAR_ID) ?? str(process.env.GOOGLE_CALENDAR_ID) ?? "primary",
    schoolCalendarId: str(process.env.SCHOOL_CALENDAR_ID),
    workCalendarId: str(process.env.WORK_CALENDAR_ID),
    personalCalendarId: str(process.env.PERSONAL_CALENDAR_ID),
  },
  resend: {
    apiKey: str(process.env.RESEND_API_KEY),
    /**
     * Resend's shared sandbox sender. It works with zero DNS setup but will
     * ONLY deliver to the address that owns the Resend account — anyone else
     * gets a 403 from the API. Fine for testing, useless in production. Replace
     * it with an address on your own verified domain before launch.
     */
    fromEmail: str(process.env.FROM_EMAIL) ?? "onboarding@resend.dev",
  },
  app: {
    siteUrl:
      str(process.env.NEXT_PUBLIC_SITE_URL) ??
      (str(process.env.VERCEL_URL) ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    timezone: str(process.env.BUSINESS_TIMEZONE) ?? "America/Chicago",
    trainerPhone: str(process.env.TRAINER_PHONE),
  },
};

/** Calendars which block public availability. Blank optional IDs are ignored. */
export function availabilityCalendarIds(): string[] {
  return Array.from(
    new Set(
      [
        env.google.bookingCalendarId,
        env.google.schoolCalendarId,
        env.google.workCalendarId,
        env.google.personalCalendarId,
      ].filter((id): id is string => Boolean(id)),
    ),
  );
}

/** Can we read and write bookings? Without this, nothing works. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabase.url && env.supabase.serviceRoleKey);
}

/**
 * Can we check the real calendar and create events?
 * Optional on purpose — bookings still save without it, they just won't
 * appear on your phone's calendar and won't respect your personal events.
 */
export function isGoogleConfigured(): boolean {
  const { clientId, clientSecret, refreshToken } = env.google;
  return Boolean(clientId && clientSecret && refreshToken);
}

/**
 * Can we send email? Also optional. A booking that saves but doesn't email is
 * recoverable — you can see it in the database and text the person. A booking
 * that fails because the mail provider is down is not.
 */
export function isResendConfigured(): boolean {
  return Boolean(env.resend.apiKey);
}

/** True while we're still on Resend's sandbox sender, which can only reach you. */
export function isSandboxSender(): boolean {
  return env.resend.fromEmail.endsWith("@resend.dev");
}
