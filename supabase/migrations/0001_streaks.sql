-- Adds streak tracking columns to profiles.
-- Run this once in the Supabase SQL editor.

alter table profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_scan_date date;
