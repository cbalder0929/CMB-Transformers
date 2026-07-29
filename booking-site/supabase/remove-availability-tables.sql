-- Run this once in the Supabase SQL Editor after deploying the Google
-- Calendar availability update. Bookings and message_log are not affected.
drop table if exists availability_rules;
drop table if exists blackout_dates;
