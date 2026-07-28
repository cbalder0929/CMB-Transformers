-- ============================================================================
-- CMB Transformations — booking database
-- Paste this whole file into the Supabase SQL Editor and hit Run.
-- Safe to re-run: everything is IF NOT EXISTS / idempotent.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Your bookable windows. You control these; the site reads them.
--    day_of_week: 0 = Sunday ... 6 = Saturday
--    Times are WALL CLOCK time in your business timezone (America/Chicago).
-- ---------------------------------------------------------------------------
create table if not exists availability_rules (
  id            uuid primary key default gen_random_uuid(),
  day_of_week   int  not null check (day_of_week between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  slot_minutes  int  not null default 60,
  active        boolean not null default true,
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- 2. One-off blocks: vacation, a busy Saturday, etc.
-- ---------------------------------------------------------------------------
create table if not exists blackout_dates (
  id        uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- 3. The core table.
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
  reminder_24h_sent_at  timestamptz,
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

-- ---------------------------------------------------------------------------
-- 4. Every message sent — debugging now, compliance proof later.
-- ---------------------------------------------------------------------------
create table if not exists message_log (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete cascade,
  channel     text not null,   -- email | sms
  kind        text not null,   -- confirmation | reminder_24h | reminder_2h | followup
  provider_id text,
  status      text,
  error       text,
  sent_at     timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- The browser never touches these tables directly — every read and write goes
-- through an API route using the service role key, which bypasses RLS.
-- So the policy here is simply: the public anon key can do NOTHING.
-- RLS on with zero policies = deny everything. That is intentional.
-- ============================================================================

alter table bookings          enable row level security;
alter table availability_rules enable row level security;
alter table blackout_dates    enable row level security;
alter table message_log       enable row level security;

-- ============================================================================
-- SEED: your training hours. EDIT THESE to match reality, then re-run just
-- this block. Times are Central wall-clock.
--   0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
-- ============================================================================

-- Only seeds if the table is empty, so re-running the file won't duplicate.
insert into availability_rules (day_of_week, start_time, end_time, slot_minutes)
select * from (values
  (1, '06:00'::time, '09:00'::time, 60),   -- Mon morning
  (1, '16:00'::time, '19:00'::time, 60),   -- Mon evening
  (2, '06:00'::time, '09:00'::time, 60),   -- Tue morning
  (2, '16:00'::time, '19:00'::time, 60),
  (3, '06:00'::time, '09:00'::time, 60),   -- Wed
  (3, '16:00'::time, '19:00'::time, 60),
  (4, '06:00'::time, '09:00'::time, 60),   -- Thu
  (4, '16:00'::time, '19:00'::time, 60),
  (5, '06:00'::time, '09:00'::time, 60),   -- Fri
  (6, '08:00'::time, '12:00'::time, 60)    -- Sat morning
) as seed(day_of_week, start_time, end_time, slot_minutes)
where not exists (select 1 from availability_rules);

-- ============================================================================
-- HANDY QUERIES (run these later, from the SQL editor)
-- ============================================================================
--
-- See upcoming bookings:
--   select first_name, last_name, phone, starts_at at time zone 'America/Chicago' as local_time, status
--   from bookings where starts_at > now() order by starts_at;
--
-- Block off a vacation:
--   insert into blackout_dates (starts_at, ends_at, reason)
--   values ('2026-08-10 00:00-05', '2026-08-17 00:00-05', 'vacation');
--
-- Turn off Saturdays for a while:
--   update availability_rules set active = false where day_of_week = 6;
