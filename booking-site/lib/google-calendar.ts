import { availabilityCalendarIds, env, isGoogleConfigured } from "./env";
import type { Interval } from "./availability";

/**
 * Google Calendar via plain REST + a refresh token.
 *
 * No `googleapis` dependency on purpose: that package is ~50MB and pulls in
 * the entire Google API surface to use two endpoints. A refresh token exchange
 * is one POST, and the two calls we need are one POST each.
 *
 * Every function here is a no-op when Google isn't configured yet, so the rest
 * of the booking flow works before you've finished the Cloud Console setup.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.google.clientId!,
      client_secret: env.google.clientSecret!,
      refresh_token: env.google.refreshToken!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    // The usual cause: the OAuth consent screen is still in "Testing" mode,
    // which expires refresh tokens after 7 days. Publish it.
    throw new Error(`Google token refresh failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

/**
 * Everything already on your calendar between two instants.
 * Returns [] if Google isn't wired up — the caller treats that as "no conflicts
 * known", which is the safe-for-launch behaviour, not the safe-for-life one.
 */
export async function getBusyIntervals(from: Date, to: Date): Promise<Interval[]> {
  if (!isGoogleConfigured()) return [];

  const token = await getAccessToken();
  const calendarIds = availabilityCalendarIds();
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`freeBusy failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };

  const busy: Interval[] = [];
  for (const calendarId of calendarIds) {
    const calendar = json.calendars?.[calendarId];
    if (calendar?.errors?.length) {
      throw new Error(
        `freeBusy calendar error for ${calendarId}: ${JSON.stringify(calendar.errors)}`,
      );
    }
    busy.push(
      ...(calendar?.busy ?? []).map((block) => ({
        start: new Date(block.start),
        end: new Date(block.end),
      })),
    );
  }

  return mergeIntervals(busy);
}

/** Combine all calendar conflicts into one ordered availability block list. */
function mergeIntervals(intervals: Interval[]): Interval[] {
  const ordered = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [];

  for (const interval of ordered) {
    const previous = merged.at(-1);
    if (previous && interval.start < previous.end) {
      if (interval.end > previous.end) previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export type CalendarEventInput = {
  summary: string;
  description: string;
  location?: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  timezone: string;
  attendeeEmail?: string;
};

/** Creates the event and returns its id, or null if Google isn't configured. */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string | null> {
  if (!isGoogleConfigured()) return null;

  const token = await getAccessToken();
  const calId = encodeURIComponent(env.google.bookingCalendarId);

  const res = await fetch(
    // sendUpdates=all emails the prospect a real calendar invite from Google.
    `${CAL_BASE}/calendars/${calId}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: { dateTime: input.startsAt, timeZone: input.timezone },
        end: { dateTime: input.endsAt, timeZone: input.timezone },
        attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Calendar insert failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

/**
 * Used when someone cancels. If this doesn't run, the slot stays blocked on
 * your calendar forever even though the booking row says cancelled.
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isGoogleConfigured()) return;

  const token = await getAccessToken();
  const calId = encodeURIComponent(env.google.bookingCalendarId);

  const res = await fetch(
    `${CAL_BASE}/calendars/${calId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );

  // 410 = already gone. That's a success as far as we're concerned.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete failed (${res.status}): ${await res.text()}`);
  }
}
