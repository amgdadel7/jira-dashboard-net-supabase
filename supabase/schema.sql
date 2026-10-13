-- ═══════════════════════════════════════════════════════════════════════
--  Nexus Agile Board — Supabase schema
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Then run seed.sql right after.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique not null,
  role        text,
  color       text default '#0C66E4',
  initials    text
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  type        text default 'Software project',
  lead_id     uuid references public.profiles(id)
);

create table if not exists public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  name        text not null,
  goal        text,
  start_date  date,
  end_date    date,
  state       text check (state in ('future','active','closed')) default 'future'
);

create table if not exists public.epics (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  key         text not null unique,
  title       text not null,
  color       text default '#0C66E4',
  start_date  date,
  end_date    date
);

create table if not exists public.issues (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade,
  sprint_id     uuid references public.sprints(id) on delete set null,
  epic_id       uuid references public.epics(id) on delete set null,
  key           text not null unique,
  summary       text not null,
  description   text default '',
  type          text check (type in ('story','task','bug','epic')) default 'task',
  status        text check (status in ('todo','inprogress','inreview','done')) default 'todo',
  priority      text check (priority in ('highest','high','medium','low','lowest')) default 'medium',
  story_points  int,
  assignee_id   uuid references public.profiles(id),
  reporter_id   uuid references public.profiles(id),
  labels        text[] default '{}',
  rank          double precision default 1000,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid references public.issues(id) on delete cascade,
  author_id   uuid references public.profiles(id),
  body        text not null,
  created_at  timestamptz default now()
);

-- ── performance ──────────────────────────────────────────────────────────
create index if not exists idx_issues_sprint on public.issues(sprint_id);
create index if not exists idx_issues_board  on public.issues(sprint_id, status, rank);
create index if not exists idx_comments_issue on public.comments(issue_id);

-- ── updated_at housekeeping ──────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_issues_touch on public.issues;
create trigger trg_issues_touch
  before update on public.issues
  for each row execute function public.touch_updated_at();

-- ── row level security ───────────────────────────────────────────────────
-- The .NET API uses the service-role key (bypasses RLS). These policies
-- guard direct client access if you later call Supabase from the browser
-- with the anon key.
alter table public.profiles  enable row level security;
alter table public.projects  enable row level security;
alter table public.sprints   enable row level security;
alter table public.epics     enable row level security;
alter table public.issues    enable row level security;
alter table public.comments  enable row level security;

create policy if not exists "read profiles"  on public.profiles  for select using (true);
create policy if not exists "read projects"  on public.projects  for select using (true);
create policy if not exists "read sprints"   on public.sprints   for select using (true);
create policy if not exists "read epics"     on public.epics     for select using (true);
create policy if not exists "read issues"    on public.issues    for select using (true);
create policy if not exists "write issues"   on public.issues    for all    using (auth.role() = 'authenticated');
create policy if not exists "read comments"  on public.comments  for select using (true);
create policy if not exists "add comments"   on public.comments  for insert with check (auth.role() = 'authenticated');
