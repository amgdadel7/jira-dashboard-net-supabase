import type { CreateIssueInput, Issue, Sprint, Status, Workspace } from '../types';
import { buildSeedWorkspace } from '../data/mockData';

/* ==================================================================== */
/*  API CLIENT — Jira-like board                                        */
/*                                                                      */
/*  The UI talks exclusively through this module.                       */
/*                                                                      */
/*  • LIVE MODE  → set  VITE_API_URL=https://localhost:7001  in         */
/*    .env.local and every call goes to your ASP.NET Core API, which    */
/*    reads/writes Supabase (Postgres) via the supabase-csharp SDK.     */
/*                                                                      */
/*  • MOCK MODE  → no VITE_API_URL. An in-memory store seeded with      */
/*    realistic data simulates latency + persistence, so the board      */
/*    is fully interactive offline.                                     */
/*                                                                      */
/*  Expected .NET controllers (see BackendView for the full snippets):  */
/*    GET   /api/workspace?projectKey=ATL                               */
/*    GET   /api/health                                                 */
/*    POST  /api/issues                                                 */
/*    PATCH /api/issues/{id}                                            */
/*    PATCH /api/issues/{id}/move        { status, rank }               */
/*    POST  /api/issues/{id}/comments    { body }                       */
/*    POST  /api/sprints/{id}/complete                                  */
/* ==================================================================== */

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const API_URL = env?.VITE_API_URL?.replace(/\/$/, '');

export const API_MODE: 'live' | 'mock' = API_URL ? 'live' : 'mock';
export const API_BASE = API_URL ?? 'https://localhost:7001';

const delay = (ms = 320) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------ HTTP ------------------------------ */

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path} — ${text.slice(0, 140)}`);
  }
  return (await res.json()) as T;
}

/* --------------------------- Mock store --------------------------- */

let store: Workspace | null = null;
const getStore = (): Workspace => {
  if (!store) store = buildSeedWorkspace();
  return store;
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let keyCounter = 200;

/* ---------------------------- API surface -------------------------- */

export const api = {
  mode: API_MODE,
  baseUrl: API_BASE,

  async health(): Promise<{ ok: boolean; latencyMs: number; db: string }> {
    if (API_MODE === 'mock') {
      await delay(180);
      return { ok: true, latencyMs: 182, db: 'supabase (simulated)' };
    }
    const t0 = performance.now();
    const res = await http<{ status: string; database?: string }>('/api/health');
    return { ok: res.status === 'ok', latencyMs: Math.round(performance.now() - t0), db: res.database ?? 'supabase' };
  },

  async getWorkspace(): Promise<Workspace> {
    if (API_MODE === 'live') {
      return http<Workspace>(`/api/workspace?projectKey=ATL`);
    }
    await delay();
    return clone(getStore());
  },

  async moveIssue(issueId: string, status: Status, rank: number): Promise<Issue> {
    if (API_MODE === 'live') {
      return http<Issue>(`/api/issues/${issueId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rank }),
      });
    }
    await delay(160);
    const s = getStore();
    const issue = s.issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');
    issue.status = status;
    issue.rank = rank;
    issue.updatedAt = new Date().toISOString();
    return clone(issue);
  },

  async updateIssue(issueId: string, patch: Partial<Issue>): Promise<Issue> {
    if (API_MODE === 'live') {
      return http<Issue>(`/api/issues/${issueId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    }
    await delay(160);
    const s = getStore();
    const idx = s.issues.findIndex((i) => i.id === issueId);
    if (idx < 0) throw new Error('Issue not found');
    s.issues[idx] = { ...s.issues[idx], ...patch, id: issueId, updatedAt: new Date().toISOString() };
    return clone(s.issues[idx]);
  },

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    if (API_MODE === 'live') {
      return http<Issue>(`/api/issues`, { method: 'POST', body: JSON.stringify(input) });
    }
    await delay(220);
    const s = getStore();
    const siblings = s.issues.filter((i) => i.status === input.status);
    const maxRank = siblings.length ? Math.max(...siblings.map((i) => i.rank)) : 0;
    const issue: Issue = {
      id: `i${++keyCounter}`,
      key: `${s.project.key}-${keyCounter}`,
      reporterId: s.project.leadId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      rank: maxRank + 10,
      ...input,
    };
    s.issues.push(issue);
    return clone(issue);
  },

  async addComment(issueId: string, authorId: string, body: string): Promise<Issue> {
    if (API_MODE === 'live') {
      return http<Issue>(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ authorId, body }),
      });
    }
    await delay(140);
    const s = getStore();
    const issue = s.issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue not found');
    issue.comments.push({
      id: `c${Date.now()}`,
      authorId,
      body,
      createdAt: new Date().toISOString(),
    });
    return clone(issue);
  },

  async completeSprint(sprintId: string, moveToSprintId: string | null): Promise<Workspace> {
    if (API_MODE === 'live') {
      await http(`/api/sprints/${sprintId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ moveOpenIssuesTo: moveToSprintId }),
      });
      return this.getWorkspace();
    }
    await delay(400);
    const s = getStore();
    const sprint = s.sprints.find((sp) => sp.id === sprintId);
    if (sprint) sprint.state = 'closed';
    s.issues.forEach((i) => {
      if (i.sprintId === sprintId && i.status !== 'done') {
        i.sprintId = moveToSprintId;
        i.status = 'todo';
      }
    });
    return clone(s);
  },

  async startSprint(sprintId: string): Promise<void> {
    if (API_MODE === 'live') {
      await http(`/api/sprints/${sprintId}/start`, { method: 'POST' });
      return;
    }
    await delay(220);
    const s = getStore();
    const sp = s.sprints.find((x) => x.id === sprintId);
    if (sp) sp.state = 'active';
  },

  async deleteIssue(issueId: string): Promise<void> {
    if (API_MODE === 'live') {
      await http(`/api/issues/${issueId}`, { method: 'DELETE' });
      return;
    }
    await delay(150);
    const s = getStore();
    s.issues = s.issues.filter((i) => i.id !== issueId);
  },

  async updateSprint(sprintId: string, patch: { name?: string; goal?: string; startDate?: string; endDate?: string }): Promise<Sprint> {
    if (API_MODE === 'live') {
      return http<Sprint>(`/api/sprints/${sprintId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    }
    await delay(180);
    const s = getStore();
    const sp = s.sprints.find((x) => x.id === sprintId);
    if (!sp) throw new Error('Sprint not found');
    Object.assign(sp, patch);
    return clone(sp);
  },

  async createSprint(name: string): Promise<Sprint> {
    if (API_MODE === 'live') {
      return http<Sprint>(`/api/sprints`, { method: 'POST', body: JSON.stringify({ name }) });
    }
    await delay(220);
    const s = getStore();
    const lastEnd = s.sprints.map((x) => x.endDate).sort().pop()!;
    const start = new Date(lastEnd);
    start.setDate(start.getDate() + 3);
    const end = new Date(start);
    end.setDate(end.getDate() + 11);
    const sp: Sprint = {
      id: `s${Date.now()}`,
      name,
      goal: '',
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      state: 'future',
    };
    s.sprints.push(sp);
    return clone(sp);
  },
};
