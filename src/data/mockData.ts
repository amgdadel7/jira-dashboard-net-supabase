import type { Epic, Issue, Project, Sprint, User, Workspace } from '../types';

/* ------------------------------------------------------------------ */
/*  Seed data — mirrors the Supabase schema served by the .NET API     */
/* ------------------------------------------------------------------ */

export const users: User[] = [
  { id: 'u1', name: 'Layla Haddad', email: 'layla@atlas.dev', role: 'Engineering Lead', color: '#0C66E4', initials: 'LH' },
  { id: 'u2', name: 'Omar Farouk', email: 'omar@atlas.dev', role: 'Backend · .NET', color: '#1F845A', initials: 'OF' },
  { id: 'u3', name: 'Sara Nasser', email: 'sara@atlas.dev', role: 'Product Designer', color: '#8270DB', initials: 'SN' },
  { id: 'u4', name: 'Karim Aziz', email: 'karim@atlas.dev', role: 'Full-stack', color: '#E56910', initials: 'KA' },
  { id: 'u5', name: 'Dina Saleh', email: 'dina@atlas.dev', role: 'QA Engineer', color: '#E34935', initials: 'DS' },
  { id: 'u6', name: 'Adam Tarek', email: 'adam@atlas.dev', role: 'Frontend', color: '#2898BD', initials: 'AT' },
];

export const project: Project = {
  id: 'p1',
  key: 'ATL',
  name: 'Atlas Platform',
  type: 'Software project',
  leadId: 'u1',
};

export const sprints: Sprint[] = [
  { id: 's13', name: 'Sprint 13', goal: 'Checkout stability & audit logging', startDate: '2026-01-26', endDate: '2026-02-06', state: 'closed' },
  { id: 's14', name: 'Sprint 14', goal: 'Ship onboarding v2 and billing reliability', startDate: '2026-02-09', endDate: '2026-02-20', state: 'active' },
  { id: 's15', name: 'Sprint 15', goal: 'Notification center & guest checkout', startDate: '2026-02-23', endDate: '2026-03-06', state: 'future' },
];

export const epics: Epic[] = [
  { id: 'e1', key: 'ATL-40', title: 'User Onboarding Overhaul', color: '#8270DB', startDate: '2026-01-12', endDate: '2026-03-06' },
  { id: 'e2', key: 'ATL-41', title: 'Payments & Billing', color: '#22A06B', startDate: '2026-01-26', endDate: '2026-03-20' },
  { id: 'e3', key: 'ATL-42', title: 'Mobile App v2', color: '#0C66E4', startDate: '2026-02-09', endDate: '2026-04-17' },
  { id: 'e4', key: 'ATL-43', title: 'Analytics & Insights', color: '#E56910', startDate: '2026-02-23', endDate: '2026-04-03' },
  { id: 'e5', key: 'ATL-44', title: 'Performance & Reliability', color: '#2898BD', startDate: '2026-01-12', endDate: '2026-04-24' },
];

type I = Omit<Issue, 'id' | 'comments'> & { comments?: Issue['comments'] };

const raw: I[] = [
  /* ---------------- ACTIVE SPRINT (s14) ---------------- */
  {
    key: 'ATL-112', summary: 'Redesign signup flow with social login', type: 'story', priority: 'high',
    status: 'todo', storyPoints: 5, assigneeId: 'u3', reporterId: 'u1', sprintId: 's14', epicId: 'e1',
    labels: ['onboarding', 'design'], rank: 10, createdAt: '2026-02-02T09:12:00Z', updatedAt: '2026-02-09T08:00:00Z',
    description: 'Replace the 3-step form with a single progressive screen. Support Google and GitHub OAuth through Supabase Auth, keep email fallback, and measure drop-off per step.',
  },
  {
    key: 'ATL-118', summary: 'Write API contract tests for /invoices endpoints', type: 'task', priority: 'medium',
    status: 'todo', storyPoints: 3, assigneeId: 'u4', reporterId: 'u2', sprintId: 's14', epicId: 'e2',
    labels: ['api', 'testing'], rank: 20, createdAt: '2026-02-03T10:40:00Z', updatedAt: '2026-02-09T08:00:00Z',
    description: 'Cover GET /api/invoices, POST /api/invoices/:id/retry with xUnit + WebApplicationFactory. Contract snapshots must fail CI on breaking change.',
  },
  {
    key: 'ATL-121', summary: 'Checkout spinner stuck forever on Safari 17', type: 'bug', priority: 'high',
    status: 'todo', storyPoints: 2, assigneeId: 'u5', reporterId: 'u5', sprintId: 's14', epicId: 'e2',
    labels: ['checkout', 'safari'], rank: 30, createdAt: '2026-02-05T14:20:00Z', updatedAt: '2026-02-10T11:00:00Z',
    description: 'Repro: enable 3DS challenge, throttled 3G. The promise from stripe.confirmPayment never resolves when the challenge iframe is blocked. Add a timeout + user-facing retry.',
  },
  {
    key: 'ATL-125', summary: 'Add weekly digest email preference', type: 'story', priority: 'low',
    status: 'todo', storyPoints: 3, assigneeId: null, reporterId: 'u3', sprintId: 's14', epicId: 'e1',
    labels: ['email', 'settings'], rank: 40, createdAt: '2026-02-06T09:00:00Z', updatedAt: '2026-02-09T08:00:00Z',
    description: 'New toggle under Settings → Notifications. Digest is rendered by the NotificationsWorker (.NET background service) and sent Mondays 08:00 user-local time.',
  },
  {
    key: 'ATL-104', summary: 'Stripe webhook retries with exponential backoff', type: 'story', priority: 'highest',
    status: 'inprogress', storyPoints: 8, assigneeId: 'u2', reporterId: 'u1', sprintId: 's14', epicId: 'e2',
    labels: ['payments', 'backend'], rank: 10, createdAt: '2026-01-28T11:00:00Z', updatedAt: '2026-02-11T16:30:00Z',
    description: 'Webhook handler must be idempotent. Persist raw events in Supabase (stripe_events table), process via Hangfire job, retry 1m/5m/30m/2h then dead-letter.',
    comments: [
      { id: 'c1', authorId: 'u1', body: 'Make sure the retry policy is covered by integration tests before we flip the flag in production.', createdAt: '2026-02-10T09:15:00Z' },
      { id: 'c2', authorId: 'u2', body: 'Added Polly policies + idempotency key on event_id. Dead-letter table is ready for review.', createdAt: '2026-02-11T14:02:00Z' },
    ],
  },
  {
    key: 'ATL-109', summary: 'Avatar upload fails for files larger than 5MB', type: 'bug', priority: 'highest',
    status: 'inprogress', storyPoints: 3, assigneeId: 'u1', reporterId: 'u5', sprintId: 's14', epicId: 'e5',
    labels: ['storage', 'supabase'], rank: 20, createdAt: '2026-01-30T13:45:00Z', updatedAt: '2026-02-11T10:20:00Z',
    description: 'Supabase Storage rejects > 5MB on the avatars bucket. Either raise the bucket limit and resize client-side, or switch to tus resumable uploads.',
    comments: [
      { id: 'c3', authorId: 'u5', body: 'Verified on staging — 4.9MB passes, 5.1MB returns 413. Client shows a generic error.', createdAt: '2026-02-10T12:40:00Z' },
    ],
  },
  {
    key: 'ATL-115', summary: 'Instrument onboarding funnel events (steps 1–3)', type: 'task', priority: 'medium',
    status: 'inprogress', storyPoints: 2, assigneeId: 'u6', reporterId: 'u3', sprintId: 's14', epicId: 'e4',
    labels: ['analytics'], rank: 30, createdAt: '2026-02-01T15:00:00Z', updatedAt: '2026-02-11T09:05:00Z',
    description: 'Emit onboarding_started, step_completed {step}, onboarding_completed to PostHog. Include session replay sampling at 20%.',
  },
  {
    key: 'ATL-107', summary: 'Migrate settings API to .NET 9 minimal APIs', type: 'task', priority: 'medium',
    status: 'inreview', storyPoints: 5, assigneeId: 'u4', reporterId: 'u2', sprintId: 's14', epicId: 'e5',
    labels: ['dotnet', 'refactor'], rank: 10, createdAt: '2026-01-29T08:30:00Z', updatedAt: '2026-02-12T09:40:00Z',
    description: 'Move Controllers/SettingsController.cs to route-group minimal APIs with endpoint filters for validation. No behavior change; keep OpenAPI parity.',
    comments: [
      { id: 'c4', authorId: 'u2', body: 'PR #482 is up. Response times improved ~18% on the benchmark rig.', createdAt: '2026-02-12T09:30:00Z' },
    ],
  },
  {
    key: 'ATL-110', summary: 'Dark mode design tokens for dashboard', type: 'story', priority: 'low',
    status: 'inreview', storyPoints: 3, assigneeId: 'u5', reporterId: 'u3', sprintId: 's14', epicId: 'e3',
    labels: ['design-system'], rank: 20, createdAt: '2026-01-31T10:10:00Z', updatedAt: '2026-02-11T17:00:00Z',
    description: 'Map semantic tokens (surface/ink/brand) to a dark palette. Gate behind prefers-color-scheme until the manual toggle ships.',
  },
  {
    key: 'ATL-101', summary: 'Email verification required on signup', type: 'story', priority: 'high',
    status: 'done', storyPoints: 3, assigneeId: 'u3', reporterId: 'u1', sprintId: 's14', epicId: 'e1',
    labels: ['auth'], rank: 10, createdAt: '2026-01-27T09:00:00Z', updatedAt: '2026-02-10T13:00:00Z',
    description: 'Block access to the workspace until email is verified. Supabase Auth handles the magic link; add resend + expiry UI.',
  },
  {
    key: 'ATL-103', summary: 'Fix 500 error on empty-cart checkout', type: 'bug', priority: 'high',
    status: 'done', storyPoints: 2, assigneeId: 'u2', reporterId: 'u5', sprintId: 's14', epicId: 'e2',
    labels: ['checkout'], rank: 20, createdAt: '2026-01-28T12:00:00Z', updatedAt: '2026-02-09T15:30:00Z',
    description: 'NullReferenceException in OrderService.CreateDraft when cart has zero items. Return 422 with a problem-details body instead.',
  },
  {
    key: 'ATL-106', summary: 'Set up Supabase Row Level Security policies', type: 'task', priority: 'medium',
    status: 'done', storyPoints: 3, assigneeId: 'u1', reporterId: 'u1', sprintId: 's14', epicId: 'e5',
    labels: ['security', 'supabase'], rank: 30, createdAt: '2026-01-29T10:00:00Z', updatedAt: '2026-02-10T11:00:00Z',
    description: 'Enable RLS on issues, comments, sprints. Policies keyed by workspace membership via auth.jwt() workspace claim.',
  },
  {
    key: 'ATL-108', summary: 'Export monthly invoices to PDF', type: 'story', priority: 'medium',
    status: 'done', storyPoints: 5, assigneeId: 'u6', reporterId: 'u2', sprintId: 's14', epicId: 'e2',
    labels: ['billing'], rank: 40, createdAt: '2026-01-30T09:30:00Z', updatedAt: '2026-02-11T12:00:00Z',
    description: 'Server-side render with QuestPDF, store in Supabase Storage, signed URL valid 15 minutes.',
  },
  {
    key: 'ATL-111', summary: 'Password reset link expires too early', type: 'bug', priority: 'medium',
    status: 'done', storyPoints: 1, assigneeId: 'u5', reporterId: 'u3', sprintId: 's14', epicId: 'e1',
    labels: ['auth'], rank: 50, createdAt: '2026-02-02T16:00:00Z', updatedAt: '2026-02-11T08:00:00Z',
    description: 'OTP expiry was 60s. Raised to 15 min and updated the copy to match.',
  },

  /* ---------------- FUTURE SPRINT (s15) ---------------- */
  {
    key: 'ATL-113', summary: 'Guest checkout without account', type: 'story', priority: 'high',
    status: 'todo', storyPoints: 5, assigneeId: 'u2', reporterId: 'u1', sprintId: 's15', epicId: 'e2',
    labels: ['checkout'], rank: 10, createdAt: '2026-02-03T09:00:00Z', updatedAt: '2026-02-03T09:00:00Z',
    description: 'Allow payment with email only; create shadow account post-purchase and offer one-click activation.',
  },
  {
    key: 'ATL-122', summary: 'In-app notification center', type: 'story', priority: 'high',
    status: 'todo', storyPoints: 8, assigneeId: null, reporterId: 'u3', sprintId: 's15', epicId: 'e3',
    labels: ['notifications'], rank: 20, createdAt: '2026-02-05T11:00:00Z', updatedAt: '2026-02-05T11:00:00Z',
    description: 'Bell dropdown + full page. Realtime via Supabase channels filtered by recipient.',
  },
  {
    key: 'ATL-127', summary: 'Due dates shift by one day across time zones', type: 'bug', priority: 'medium',
    status: 'todo', storyPoints: 3, assigneeId: 'u4', reporterId: 'u5', sprintId: 's15', epicId: 'e5',
    labels: ['bug', 'timezone'], rank: 30, createdAt: '2026-02-06T13:20:00Z', updatedAt: '2026-02-06T13:20:00Z',
    description: 'Store timestamptz end-to-end; format with the viewer locale. Audit existing rows for off-by-one drift.',
  },

  /* ---------------- BACKLOG ---------------- */
  {
    key: 'ATL-114', summary: 'Rate limit public API with token bucket', type: 'task', priority: 'medium',
    status: 'todo', storyPoints: 3, assigneeId: 'u4', reporterId: 'u2', sprintId: null, epicId: 'e5',
    labels: ['api', 'security'], rank: 10, createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z',
    description: 'AspNetCoreRateLimit or built-in limiter in .NET 9 — 100 req/min per API key, headers for remaining quota.',
  },
  {
    key: 'ATL-116', summary: 'Mobile nav overlaps content on scroll', type: 'bug', priority: 'medium',
    status: 'todo', storyPoints: 2, assigneeId: 'u6', reporterId: 'u3', sprintId: null, epicId: 'e3',
    labels: ['mobile', 'ui'], rank: 20, createdAt: '2026-01-21T09:00:00Z', updatedAt: '2026-01-21T09:00:00Z',
    description: 'Safe-area inset is ignored when the virtual keyboard opens. Tested on iPhone 13 / Pixel 8.',
  },
  {
    key: 'ATL-117', summary: 'Usage-based billing tiers', type: 'story', priority: 'high',
    status: 'todo', storyPoints: 8, assigneeId: null, reporterId: 'u1', sprintId: null, epicId: 'e2',
    labels: ['billing', 'pricing'], rank: 30, createdAt: '2026-01-22T14:00:00Z', updatedAt: '2026-01-22T14:00:00Z',
    description: 'Metered seats + API calls. Stripe Billing meters, nightly aggregation job in the .NET worker.',
  },
  {
    key: 'ATL-119', summary: 'Add Redis caching layer for board reads', type: 'task', priority: 'low',
    status: 'todo', storyPoints: 5, assigneeId: 'u2', reporterId: 'u2', sprintId: null, epicId: 'e5',
    labels: ['performance'], rank: 40, createdAt: '2026-01-23T10:00:00Z', updatedAt: '2026-01-23T10:00:00Z',
    description: 'Cache board query (300ms → <50ms target). Invalidate on issue mutation events via Supabase webhooks.',
  },
  {
    key: 'ATL-120', summary: 'CSV export encodes Arabic names incorrectly', type: 'bug', priority: 'low',
    status: 'todo', storyPoints: 2, assigneeId: 'u6', reporterId: 'u5', sprintId: null, epicId: 'e4',
    labels: ['export', 'i18n'], rank: 50, createdAt: '2026-01-24T10:00:00Z', updatedAt: '2026-01-24T10:00:00Z',
    description: 'Write UTF-8 BOM and quote fields; verify round-trip in Excel and Numbers.',
  },
  {
    key: 'ATL-123', summary: 'E2E smoke tests with Playwright', type: 'task', priority: 'medium',
    status: 'todo', storyPoints: 3, assigneeId: 'u5', reporterId: 'u1', sprintId: null, epicId: 'e5',
    labels: ['testing'], rank: 60, createdAt: '2026-01-25T10:00:00Z', updatedAt: '2026-01-25T10:00:00Z',
    description: 'Cover login → create issue → move on board → complete sprint. Run nightly against staging.',
  },
  {
    key: 'ATL-124', summary: 'Team workspaces with role-based access', type: 'story', priority: 'high',
    status: 'todo', storyPoints: 13, assigneeId: null, reporterId: 'u1', sprintId: null, epicId: 'e1',
    labels: ['workspaces', 'auth'], rank: 70, createdAt: '2026-01-26T10:00:00Z', updatedAt: '2026-01-26T10:00:00Z',
    description: 'Owner / admin / member / viewer. Enforced by RLS in Supabase and policy handlers in the .NET API.',
  },
  {
    key: 'ATL-126', summary: 'Deprecate v1 REST endpoints', type: 'task', priority: 'low',
    status: 'todo', storyPoints: 2, assigneeId: 'u4', reporterId: 'u2', sprintId: null, epicId: 'e5',
    labels: ['api'], rank: 80, createdAt: '2026-01-27T10:00:00Z', updatedAt: '2026-01-27T10:00:00Z',
    description: 'Sunset header + 3-month warning, then remove. Update public docs and Postman collection.',
  },
  {
    key: 'ATL-128', summary: 'SSO with SAML for enterprise plans', type: 'story', priority: 'medium',
    status: 'todo', storyPoints: 5, assigneeId: null, reporterId: 'u1', sprintId: null, epicId: 'e1',
    labels: ['auth', 'enterprise'], rank: 90, createdAt: '2026-01-28T10:00:00Z', updatedAt: '2026-01-28T10:00:00Z',
    description: 'Supabase SSO supports SAML 2.0 — wire the .NET API to provision tenants on first login (JIT).',
  },
];

export const seedIssues: Issue[] = raw.map((r, i) => ({
  ...r,
  id: `i${i + 1}`,
  comments: r.comments ?? [],
}));

export function buildSeedWorkspace(): Workspace {
  return {
    project: { ...project },
    users: users.map((u) => ({ ...u })),
    sprints: sprints.map((s) => ({ ...s })),
    epics: epics.map((e) => ({ ...e })),
    issues: seedIssues.map((i) => ({ ...i, labels: [...i.labels], comments: i.comments.map((c) => ({ ...c })) })),
  };
}
