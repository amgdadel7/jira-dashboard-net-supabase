import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Database,
  FileCode2,
  Loader2,
  MonitorSmartphone,
  PlugZap,
  RefreshCw,
  Server,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import { API_BASE, API_MODE, api } from '../services/api';
import { CopyButton } from './ui';
import { cn } from '../utils/cn';

const SQL_SCHEMA = `-- ── Supabase → SQL Editor — run once ─────────────────────────
create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique not null,
  role        text,
  color       text default '#0C66E4',
  initials    text
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  type        text default 'Software project',
  lead_id     uuid references public.profiles(id)
);

create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  name        text not null,
  goal        text,
  start_date  date,
  end_date    date,
  state       text check (state in ('future','active','closed')) default 'future'
);

create table public.epics (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  key         text not null unique,
  title       text not null,
  color       text default '#0C66E4',
  start_date  date,
  end_date    date
);

create table public.issues (
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

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid references public.issues(id) on delete cascade,
  author_id   uuid references public.profiles(id),
  body        text not null,
  created_at  timestamptz default now()
);

-- performance
create index idx_issues_sprint      on public.issues(sprint_id);
create index idx_issues_board       on public.issues(sprint_id, status, rank);

-- row level security
alter table public.issues   enable row level security;
alter table public.comments enable row level security;

create policy "read issues"   on public.issues   for select using (true);
create policy "write issues"  on public.issues   for all    using (auth.role() = 'authenticated');
create policy "read comments" on public.comments for select using (true);
create policy "add comments"  on public.comments for insert with check (auth.role() = 'authenticated');`;

const DOTNET_PROGRAM = `// Program.cs — ASP.NET Core 9 + supabase-csharp
using Supabase;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddPolicy("ui", p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddScoped(_ => new Supabase.Client(
    builder.Configuration["Supabase:Url"]!,
    builder.Configuration["Supabase:ServiceKey"]!,
    new SupabaseOptions { AutoConnectRealtime = false }));

var app = builder.Build();
app.UseCors("ui");

app.MapGet("/api/health",
    () => new { status = "ok", database = "supabase" });

app.MapGet("/api/workspace", async (string projectKey, Supabase.Client db) =>
{
    var project  = await db.From<Project>().Where(p => p.Key == projectKey).Single();
    var sprints  = await db.From<Sprint>().Where(s => s.ProjectId == project!.Id).Get();
    var issues   = await db.From<Issue>().Where(i => i.ProjectId == project.Id).Get();
    var users    = await db.From<Profile>().Get();
    return Results.Ok(WorkspaceDto.From(project, users.Models, sprints.Models, issues.Models));
});

app.MapPatch("/api/issues/{id:guid}/move", async (Guid id, MoveDto m, Supabase.Client db) =>
{
    await db.From<Issue>().Where(i => i.Id == id)
        .Set(i => i.Status, m.Status)
        .Set(i => i.Rank,   m.Rank)
        .Update();
    return Results.NoContent();
});

app.Run();`;

const APPSETTINGS = `// appsettings.Development.json
{
  "Supabase": {
    "Url": "https://<project-ref>.supabase.co",
    "ServiceKey": "<service-role-key>"
  }
}

// terminal
dotnet new web -n Nexus.Api
cd Nexus.Api
dotnet add package Supabase
dotnet run   →   https://localhost:7001

// frontend — .env.local  (then restart vite)
VITE_API_URL=https://localhost:7001`;

const ENDPOINTS: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; route: string; desc: string }[] = [
  { method: 'GET', route: '/api/workspace?projectKey=ATL', desc: 'Full board payload — project, users, sprints, issues, epics' },
  { method: 'GET', route: '/api/health', desc: 'Liveness probe used by the Test Connection button' },
  { method: 'POST', route: '/api/issues', desc: 'Create issue — returns the row with generated key (ATL-###)' },
  { method: 'PATCH', route: '/api/issues/{id}', desc: 'Update fields — summary, assignee, priority, points, sprint' },
  { method: 'DELETE', route: '/api/issues/{id}', desc: 'Remove an issue — comments cascade' },
  { method: 'PATCH', route: '/api/issues/{id}/move', desc: 'Drag & drop persistence — { status, rank }' },
  { method: 'POST', route: '/api/issues/{id}/comments', desc: 'Append a comment to the issue activity' },
  { method: 'POST', route: '/api/sprints', desc: 'Create a new future sprint with default dates' },
  { method: 'PATCH', route: '/api/sprints/{id}', desc: 'Rename, set goal & schedule dates (Start Sprint dialog)' },
  { method: 'POST', route: '/api/sprints/{id}/complete', desc: 'Close sprint, roll open issues to the next one' },
  { method: 'POST', route: '/api/sprints/{id}/start', desc: 'Move a future sprint to active' },
];

type TestState = 'idle' | 'loading' | 'ok' | 'fail';

export function BackendView() {
  const [test, setTest] = useState<TestState>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  const runTest = async () => {
    setTest('loading');
    setLatency(null);
    try {
      const h = await api.health();
      setLatency(h.latencyMs);
      setTest(h.ok ? 'ok' : 'fail');
    } catch {
      setTest('fail');
    }
  };

  return (
    <div className="scroll-slim h-full overflow-y-auto bg-white px-6 pb-20 pt-4">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
        <span className="hover:text-brand-700 hover:underline">Projects</span>
        <span>/</span>
        <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
      </div>
      <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Backend &amp; Data</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
        The board reads and writes through a typed API client (<code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-ink-800">src/services/api.ts</code>).
        Point it at your ASP.NET Core API backed by Supabase Postgres — no UI changes required. Production-ready source ships with
        this repo under <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-ink-800">backend/Nexus.Api</code> and{' '}
        <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-ink-800">supabase/schema.sql</code>.
      </p>

      {/* pipeline + status */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mt-5 grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <div className="rounded-lg border border-line-soft bg-white p-4 shadow-card">
          <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-ink-500">Data pipeline</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PipelineNode icon={MonitorSmartphone} tint="bg-brand-50 text-brand-700" title="React board" sub="Vite · TS · dnd-kit" />
            <Arrow />
            <PipelineNode icon={Server} tint="bg-grn-100 text-grn-700" title="ASP.NET Core" sub="Minimal APIs · C# 13" />
            <Arrow />
            <PipelineNode icon={Database} tint="bg-org-100 text-org-700" title="Supabase" sub="Postgres · RLS · Storage" />
          </div>
          <div className="mt-4 grid gap-2 text-[12.5px] text-ink-700 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-2">
              <ShieldCheck size={14} className="shrink-0 text-grn-500" />
              <span>Service-role key stays server-side</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-2">
              <PlugZap size={14} className="shrink-0 text-pur-400" />
              <span>Realtime via Supabase channels</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-2">
              <Cloud size={14} className="shrink-0 text-brand-500" />
              <span>CORS scoped to the Vite origin</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line-soft bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-ink-500">Connection</p>
            <span className={cn('flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold', API_MODE === 'live' ? 'bg-grn-100 text-grn-700' : 'bg-yel-100 text-[#7a5b00]')}>
              <span className={cn('h-[7px] w-[7px] rounded-full', API_MODE === 'live' ? 'bg-grn-500' : 'bg-yel-500 animate-pulse')} />
              {API_MODE === 'live' ? 'LIVE API' : 'MOCK MODE'}
            </span>
          </div>
          <div className="mt-3 rounded-md bg-surface px-3 py-2 font-mono text-[12px] text-ink-800">
            {API_MODE === 'live' ? API_BASE : 'VITE_API_URL not set'}
          </div>
          <p className="mt-2 text-[12px] leading-[18px] text-ink-500">
            {API_MODE === 'live'
              ? 'Every action below hits your .NET API in real time.'
              : 'Using the in-memory store. Set VITE_API_URL in .env.local and the same calls switch to your API automatically.'}
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              onClick={runTest}
              disabled={test === 'loading'}
              className="flex h-8 items-center gap-2 rounded-md bg-brand-600 px-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-70"
            >
              {test === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Test connection
            </button>
            {test === 'ok' && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-grn-700">
                <CheckCircle2 size={15} />
                200 OK · {latency}ms · Postgres reachable
              </span>
            )}
            {test === 'fail' && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-red-600">
                <XCircle size={15} />
                Unreachable — check CORS &amp; the port
              </span>
            )}
          </div>
        </div>
      </motion.section>

      {/* code */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CodeCard step="1" title="Supabase schema" sub="Tables, indexes & row-level security" file="supabase/schema.sql" code={SQL_SCHEMA} delay={0.05} />
        <CodeCard step="2" title="ASP.NET Core API" sub="Minimal endpoints with supabase-csharp" file="Nexus.Api/Program.cs" code={DOTNET_PROGRAM} delay={0.1} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CodeCard step="3" title="Configuration" sub="Secrets & setup commands" file="appsettings + terminal" code={APPSETTINGS} delay={0.15} />

        {/* Endpoints */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-lg border border-line-soft bg-white shadow-card"
        >
          <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">4</span>
            <div>
              <h3 className="text-[14px] font-semibold text-ink-900">REST contract</h3>
              <p className="text-[12px] text-ink-500">Exactly what the UI expects from the .NET API</p>
            </div>
            <FileCode2 size={16} className="ml-auto text-ink-300" />
          </div>
          <ul className="divide-y divide-line-soft">
            {ENDPOINTS.map((e) => (
              <li key={e.route} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface">
                <span
                  className={cn(
                    'w-[58px] shrink-0 rounded px-1.5 py-[3px] text-center font-mono text-[10.5px] font-bold',
                    e.method === 'GET' && 'bg-brand-50 text-brand-700',
                    e.method === 'POST' && 'bg-grn-100 text-grn-700',
                    e.method === 'PATCH' && 'bg-org-100 text-org-700',
                    e.method === 'DELETE' && 'bg-red-100 text-red-600',
                  )}
                >
                  {e.method}
                </span>
                <span className="min-w-0 flex-1">
                  <code className="block truncate font-mono text-[12px] text-ink-900">{e.route}</code>
                  <span className="block truncate text-[11.5px] text-ink-500">{e.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}

function Arrow() {
  return <ArrowRight size={16} className="shrink-0 text-ink-300" />;
}

function PipelineNode({ icon: Icon, tint, title, sub }: { icon: React.ElementType; tint: string; title: string; sub: string }) {
  return (
    <div className="flex min-w-[150px] flex-1 items-center gap-2.5 rounded-lg border border-line-soft bg-surface px-3 py-2.5">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tint)}>
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[11px] text-ink-500">{sub}</span>
      </span>
    </div>
  );
}

function CodeCard({ step, title, sub, file, code, delay }: { step: string; title: string; sub: string; file: string; code: string; delay: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-lg border border-brand-950/60 bg-brand-950 shadow-card"
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{step}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold text-white">{title}</h3>
          <p className="truncate text-[11.5px] text-white/50">{sub}</p>
        </div>
        <TerminalSquare size={15} className="shrink-0 text-white/30" />
      </div>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="flex items-center gap-2 font-mono text-[11px] text-white/45">
          <span className="flex gap-1">
            <i className="h-2 w-2 rounded-full bg-red-500/70" />
            <i className="h-2 w-2 rounded-full bg-yel-500/70" />
            <i className="h-2 w-2 rounded-full bg-grn-500/70" />
          </span>
          {file}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="code-scroll scroll-slim max-h-[380px] overflow-auto px-4 py-3 font-mono text-[11.5px] leading-[18px] text-[#c8d6f0]">
        <code>{code}</code>
      </pre>
    </motion.section>
  );
}
