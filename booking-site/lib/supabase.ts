import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 *
 * This key bypasses Row Level Security, which is exactly why it must never
 * reach the browser. It is only imported from files under app/api/**, which
 * Next.js never bundles into client JS. If you ever find yourself importing
 * this from a "use client" component, stop — that's a leak.
 */

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(env.supabase.url!, env.supabase.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Row types — hand-written rather than generated, so there's no codegen step
// to remember. Keep in sync with supabase/schema.sql.
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "booked"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type Booking = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  goal: string | null;
  experience_level: string | null;
  notes: string | null;
  sms_consent: boolean;
  consent_ip: string | null;
  consent_at: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: BookingStatus;
  google_event_id: string | null;
  action_token: string;
};

/** Postgres unique-violation. This is how a double-booking announces itself. */
export const PG_UNIQUE_VIOLATION = "23505";
