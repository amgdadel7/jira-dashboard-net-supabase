# Nexus — Jira-style Agile Board

لوحة تحكم Agile كاملة بتصميم مطابق لـ Jira، مع **backend جاهز بـ ASP.NET Core 9** و**قاعدة بيانات Supabase (Postgres)**.
كل حركة في الواجهة (سحب بطاقة، إنشاء مهمة، تعليق، إكمال سبرينت) تمر عبر عميل API واحد — التحويل من الوضع التجريبي إلى الإنتاج يتم عبر متغيّر بيئة واحد.

---

## Architecture

```
┌────────────────┐   REST/JSON    ┌──────────────────┐   PostgREST   ┌──────────────────┐
│  React board   │ ─────────────▶ │  ASP.NET Core 9  │ ────────────▶ │     Supabase     │
│  Vite · TS ·   │                │  Minimal APIs    │               │  Postgres + RLS  │
│  dnd-kit       │ ◀───────────── │  supabase-csharp │ ◀──────────── │  schema.sql      │
└────────────────┘                └──────────────────┘               └──────────────────┘
        ▲                                   │
        └──────── VITE_API_URL ─────────────┘   (one env var flips mock → live)
```

## Quick start

### 1 · Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste & run [`supabase/schema.sql`](supabase/schema.sql).
3. Run [`supabase/seed.sql`](supabase/seed.sql) right after (project key `ATL`, Sprint 14 active).
4. Copy your **Project URL** and **service-role key** from *Settings → API*.

### 2 · Backend (.NET 9)

```bash
cd backend/Nexus.Api
# put the two values from step 1.4 into appsettings.json → Supabase:Url / Supabase:ServiceKey
dotnet restore
dotnet run
# → https://localhost:7001  (Swagger at /swagger)
```

### 3 · Frontend

```bash
cp .env.example .env.local   # VITE_API_URL=https://localhost:7001
npm install
npm run dev                  # http://localhost:5173
```

### Docker (optional)

```bash
cd backend
SUPABASE_URL="https://<ref>.supabase.co" SUPABASE_SERVICE_KEY="<key>" docker compose up --build
# API on http://localhost:7001 — point VITE_API_URL at it
```

### Deploy the backend on Render

The repo ships a Render Blueprint ([`render.yaml`](render.yaml)) — Render has
no native .NET runtime, so the API deploys as a **Docker web service** built
from `backend/Dockerfile`:

1. Render Dashboard → **New → Blueprint** → connect this repo (or **New → Web
   Service → Docker**, Dockerfile Path `./backend/Dockerfile`, Docker Context
   `./backend`).
2. Set the secret env vars in the Render dashboard (never committed):
   `Supabase__Url`, `Supabase__ServiceKey` (service-role key — server side
   only), and `Cors__AllowedOrigins__0` = your frontend's origin.
3. The app binds to Render's `$PORT` automatically and answers health checks
   at `/api/health`. Then set `VITE_API_URL=https://<service>.onrender.com`
   for the frontend and rebuild it.

> **No backend yet?** Skip steps 1–2 entirely. Without `VITE_API_URL` the app runs in
> mock mode with a realistic in-memory dataset — every feature stays interactive.

## REST contract

| Method | Route | Purpose |
| ------ | ----- | ------- |
| GET    | `/api/workspace?projectKey=ATL` | Full board payload — 1 request on load |
| GET    | `/api/health` | Liveness, checked by the in-app *Test connection* button |
| POST   | `/api/issues` | Create issue (server generates `ATL-###`) |
| PATCH  | `/api/issues/{id}` | Update fields (assignee, priority, points…) |
| DELETE | `/api/issues/{id}` | Remove an issue (comments cascade) |
| PATCH  | `/api/issues/{id}/move` | Drag-&-drop persistence `{ status, rank }` |
| POST   | `/api/issues/{id}/comments` | Append a comment |
| POST   | `/api/sprints` | Create a new future sprint |
| PATCH  | `/api/sprints/{id}` | Rename, set goal & schedule dates |
| POST   | `/api/sprints/{id}/start` | Activate a future sprint |
| POST   | `/api/sprints/{id}/complete` | Close sprint, roll open issues forward |

## Features

- **Board** — drag & drop (dnd-kit) with fractional ranks, live cross-column animation, quick filters, member & epic filtering, story-point totals
- **Backlog** — full drag & drop planning (move issues between sprints & backlog with live rank persistence), collapsible sections, goals, point progress, create / start (dialog with dates & goal) / complete sprint flows
- **Reports** — burndown, velocity, cumulative flow, type/priority breakdown (Recharts) — with a working sprint selector
- **All issues** — Jira-style filterable & sortable table (status pills, type, priority, assignee, sprint scope)
- **Roadmap** — epic timeline with expandable child issues, progress %, today marker
- **Reports** — burndown, velocity, cumulative flow, type/priority breakdown (Recharts)
- **Issue view** — full Jira-style detail modal: inline summary edit, checklist with progress bar, Comments/History activity tabs, @mentions in comments, all fields editable, delete
- **Live sync simulation** — a LIVE pill in the header mirrors a Supabase Realtime channel: teammates move cards while you watch
- **CSV export** — one click on All issues downloads the filtered result set (BOM-safe for Excel)
- **⌘K command palette + shortcuts** — search & jump anywhere; `c` create · `?` cheat sheet · `1–6` switch views
- **Backend & DB page** — live connection test, schema + C# snippets with copy

## Repo layout

```
src/
  services/api.ts        # typed API client — mock/live switch
  components/            # Board, Backlog, Roadmap, Reports, modals, palette
backend/
  Nexus.Api/             # ASP.NET Core 9 minimal API + supabase-csharp
supabase/
  schema.sql             # tables, indexes, RLS, updated_at trigger
  seed.sql               # demo workspace (users, sprints, epics, 22 issues)
```
