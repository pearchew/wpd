-- Run once in the Supabase SQL editor.
-- Only market data lives here; everything we write or decide lives in the GitHub repo.

create table if not exists prices (
  date       date    not null,
  ticker     text    not null,
  close      numeric not null,
  adj_close  numeric,
  currency   text    not null default 'USD',
  primary key (date, ticker)
);

create table if not exists fx (
  date  date    not null,
  pair  text    not null,           -- e.g. GBPUSD
  rate  numeric not null,
  primary key (date, pair)
);

create table if not exists nav_snapshots (
  date          date    not null,
  book          text    not null check (book in ('real', 'paper')),
  nav           numeric not null,   -- real: fund NAV. paper: paper equity
  spy_close     numeric,
  combined_nav  numeric,
  primary key (date, book)
);

create table if not exists job_runs (
  id          bigint generated always as identity primary key,
  date        date        not null,
  status      text        not null check (status in ('ok', 'partial', 'failed')),
  error       text,
  created_at  timestamptz not null default now()
);

-- The site and the daily job use the service-role key on the server, which
-- bypasses RLS. With RLS on and no policies, the public anon key sees nothing.
alter table prices        enable row level security;
alter table fx            enable row level security;
alter table nav_snapshots enable row level security;
alter table job_runs      enable row level security;
