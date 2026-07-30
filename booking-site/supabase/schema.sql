-- ============================================================================
-- CMB Bookings — booking database
-- Paste this whole file into the Supabase SQL Editor and hit Run.
-- Safe to re-run: everything is IF NOT EXISTS / idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. The core table.
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- Prospect info
  first_name            text not null,
  last_name             text not null,
  email                 text not null,
  phone                 text not null,            -- E.164, e.g. +15551234567
  goal                  text,
  experience_level      text,
  notes                 text,

  -- Consent (legally required to retain)
  sms_consent           boolean not null default false,
  consent_ip            text,
  consent_at            timestamptz,

  -- Scheduling
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  timezone              text not null default 'America/Chicago',

  -- Lifecycle
  status                text not null default 'booked'
    check (status in ('booked','confirmed','cancelled','completed','no_show')),
  google_event_id       text,

  -- Reminder tracking (makes the cron jobs idempotent)
  confirmation_sent_at  timestamptz,
  admin_notified_at     timestamptz,
  reminder_24h_sent_at  timestamptz,
  reminder_1h_sent_at   timestamptz,
  reminder_2h_sent_at   timestamptz,
  followup_sent_at      timestamptz,
  confirmed_at          timestamptz,
  cancelled_at          timestamptz,

  -- Short token used in confirm/cancel links
  action_token          text not null unique
                        default encode(gen_random_bytes(16), 'hex')
);

-- Two people, same slot, same second. This is the last line of defence and
-- the only one that actually holds under load. Do not remove it.
create unique index if not exists one_booking_per_slot
  on bookings (starts_at)
  where status in ('booked', 'confirmed');

create index if not exists bookings_upcoming on bookings (starts_at, status);
create index if not exists bookings_action_token on bookings (action_token);

-- Existing Supabase projects may have been created before the admin alert was
-- introduced. CREATE TABLE IF NOT EXISTS does not add later columns, so keep
-- this explicit upgrade safe to re-run.
alter table bookings add column if not exists admin_notified_at timestamptz;
alter table bookings add column if not exists reminder_1h_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Every message sent — debugging now, compliance proof later.
-- ---------------------------------------------------------------------------
create table if not exists message_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete cascade,
  channel     text not null,   -- email | sms
  kind        text not null,   -- confirmation | admin_notification | reminder_24h_customer | reminder_24h_admin | reminder_1h_customer | reminder_1h_admin | reminder_2h | followup
  provider_id text,
  status      text,
  error       text,
  sent_at     timestamptz not null default now()
);

-- A booking email gets exactly one active/successful send reservation. Failed
-- rows are deliberately excluded so an operational retry can try again later.
-- If a request dies after handing an email to Resend but before logging the
-- result, its `sending` row remains and safely prevents a duplicate.
create unique index if not exists one_active_booking_email_notification
  on message_log (booking_id, channel, kind)
  where channel = 'email' and kind in ('confirmation', 'admin_notification', 'reminder_24h_customer', 'reminder_24h_admin', 'reminder_1h_customer', 'reminder_1h_admin')
    and status in ('sending', 'sent');

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- The browser never touches these tables directly — every read and write goes
-- through an API route using the service role key, which bypasses RLS.
-- So the policy here is simply: the public anon key can do NOTHING.
-- RLS on with zero policies = deny everything. That is intentional.
-- ============================================================================

alter table bookings          enable row level security;
alter table message_log       enable row level security;

-- ============================================================================
-- HANDY QUERIES (run these later, from the SQL editor)
-- ============================================================================
--
-- See upcoming bookings:
--   select first_name, last_name, phone, starts_at at time zone 'America/Chicago' as local_time, status
--   from bookings where starts_at > now() order by starts_at;
--
