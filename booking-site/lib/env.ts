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
    calendarId: str(process.env.GOOGLE_CALENDAR_ID) ?? "primary",
  },
  app: {
    siteUrl:
      str(process.env.NEXT_PUBLIC_SITE_URL) ??
      (str(process.env.VERCEL_URL) ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    timezone: str(process.env.BUSINESS_TIMEZONE) ?? "America/Chicago",
    trainerPhone: str(process.env.TRAINER_PHONE),
  },
};

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
