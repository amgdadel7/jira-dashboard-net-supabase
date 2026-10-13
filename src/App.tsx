import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Flag } from 'lucide-react';
import type { CreateIssueInput, Issue, Status, Workspace } from './types';
import { STATUS_META } from './types';
import { api } from './services/api';
import { notify, TOAST_EVENT, type ToastPayload } from './utils/toastBus';
import { TopBar } from './components/TopBar';
import { Sidebar, type ViewKey } from './components/Sidebar';
import { BoardView } from './components/BoardView';
import { BacklogView } from './components/BacklogView';
import { IssuesView } from './components/IssuesView';
import { RoadmapView } from './components/RoadmapView';
import { ReportsView } from './components/ReportsView';
import { BackendView } from './components/BackendView';
import { CreateIssueModal, IssueDetailModal } from './components/IssueModals';
import { CompleteSprintModal, StartSprintModal, type StartSprintPatch } from './components/SprintModals';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { YourWorkView } from './components/YourWorkView';
import { WelcomeModal } from './components/WelcomeModal';

interface Toast {
  id: number;
  title: string;
  desc?: string;
}

export default function App() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [view, setView] = useState<ViewKey>(() => {
    try {
      const v = localStorage.getItem('nexus:view') as ViewKey | null;
      const allowed: ViewKey[] = ['forYou', 'roadmap', 'backlog', 'issues', 'board', 'reports', 'backend'];
      return v && allowed.includes(v) ? v : 'board';
    } catch {
      return 'board';
    }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nexus:sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexus:view', view);
    } catch { /* ignore */ }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('nexus:sidebar', collapsed ? 'collapsed' : 'open');
    } catch { /* ignore */ }
  }, [collapsed]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [create, setCreate] = useState<{ status: Status; sprintId: string | null } | null>(null);
  const [palette, setPalette] = useState(false);
  const [completingSprint, setCompletingSprint] = useState(false);
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexus:projectName');
    } catch {
      return null;
    }
  });
  const [live, setLive] = useState(true);
  const [signedIn, setSignedIn] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nexus:user');
    } catch {
      return null;
    }
  });
  const [welcome, setWelcome] = useState(false);

  // First-visit product tour
  useEffect(() => {
    if (!signedIn) return;
    try {
      if (!localStorage.getItem('nexus:welcomed')) {
        const t = setTimeout(() => setWelcome(true), 700);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage unavailable */
    }
  }, [signedIn]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    api.getWorkspace().then((w) => alive && setWs(w));
    return () => {
      alive = false;
    };
  }, []);

  // ⌘K / Ctrl+K — global command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Global shortcuts — c create · ? cheat sheet · 1…6 navigate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const anyModalOpen = !!(selectedId || create || palette || completingSprint);
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((s) => !s);
        return;
      }
      if (anyModalOpen) return;
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCreate({ status: 'todo', sprintId: null });
        return;
      }
      const views: ViewKey[] = ['board', 'backlog', 'issues', 'roadmap', 'reports', 'backend', 'forYou'];
      const n = parseInt(e.key, 10);
      if (ws && n >= 1 && n <= views.length) setView(views[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ws, selectedId, create, palette, completingSprint]);

  const pushToast = useCallback((title: string, desc?: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, title, desc }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // Global toast bus — components fire without prop threading
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, desc } = (e as CustomEvent<ToastPayload>).detail;
      pushToast(title, desc);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, [pushToast]);

  // Simulated Supabase Realtime — teammates move issues while you watch.
  // In live mode this effect is replaced by a Supabase channel subscription.
  useEffect(() => {
    if (!live || !ws) return;
    const t = setInterval(() => {
      const candidates = ws.issues.filter((i) => i.status !== 'done' && i.sprintId);
      if (!candidates.length) return;
      const iss = candidates[Math.floor(Math.random() * candidates.length)];
      const next = ({ todo: 'inprogress', inprogress: 'inreview', inreview: 'done' } as Record<string, Status>)[iss.status];
      if (!next) return;
      const actor = ws.users.find((u) => u.id === (iss.assigneeId ?? ws.project.leadId)) ?? ws.users[0];
      setWs((cur) =>
        cur
          ? { ...cur, issues: cur.issues.map((i) => (i.id === iss.id ? { ...i, status: next, updatedAt: new Date().toISOString() } : i)) }
          : cur,
      );
      pushToast(`${actor.name.split(' ')[0]} moved ${iss.key}`, `${STATUS_META[iss.status].label} → ${STATUS_META[next].label} · live sync`);
    }, 45000);
    return () => clearInterval(t);
  }, [live, ws, pushToast]);

  /* ------------------------------ mutations ----------------------------- */

  const patchIssueLocal = useCallback((issueId: string, patch: Partial<Issue>) => {
    setWs((cur) => {
      if (!cur) return cur;
      return { ...cur, issues: cur.issues.map((i) => (i.id === issueId ? { ...i, ...patch } : i)) };
    });
  }, []);

  const handleMove = useCallback(
    (issueId: string, status: Status, rank: number, persist: boolean) => {
      patchIssueLocal(issueId, { status, rank, updatedAt: new Date().toISOString() });
      if (persist) {
        api.moveIssue(issueId, status, rank).catch(() => pushToast('Could not save move', 'Check the API connection'));
      }
    },
    [patchIssueLocal, pushToast],
  );

  const handleUpdate = useCallback(
    (issueId: string, patch: Partial<Issue>) => {
      patchIssueLocal(issueId, patch);
      api.updateIssue(issueId, patch).catch(() => pushToast('Update failed', 'Changes may not persist'));
    },
    [patchIssueLocal, pushToast],
  );

  const handleAddComment = useCallback(
    (issueId: string, body: string) => {
      setWs((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          issues: cur.issues.map((i) =>
            i.id === issueId
              ? { ...i, comments: [...i.comments, { id: `c${Date.now()}`, authorId: cur.project.leadId, body, createdAt: new Date().toISOString() }] }
              : i,
          ),
        };
      });
      api.addComment(issueId, ws?.project.leadId ?? 'u1', body).catch(() => {});
    },
    [ws],
  );

  const handleCreate = useCallback(
    (input: CreateIssueInput) => {
      api
        .createIssue(input)
        .then((issue) => {
          setWs((cur) => (cur ? { ...cur, issues: [...cur.issues, issue] } : cur));
          pushToast(`${issue.key} created`, issue.summary);
          setCreate(null);
        })
        .catch(() => pushToast('Create failed', 'The API did not respond'));
    },
    [pushToast],
  );

  const handleCompleteSprint = useCallback(
    (moveToSprintId: string | null) => {
      setCompletingSprint(false);
      setWs((cur) => {
        if (!cur) return cur;
        const active = cur.sprints.find((s) => s.state === 'active');
        if (!active) return cur;
        const dest = moveToSprintId ? cur.sprints.find((s) => s.id === moveToSprintId) : null;
        const doneCount = cur.issues.filter((i) => i.sprintId === active.id && i.status === 'done').length;
        const openCount = cur.issues.filter((i) => i.sprintId === active.id && i.status !== 'done').length;
        api
          .completeSprint(active.id, moveToSprintId)
          .then((fresh) => setWs(fresh))
          .catch(() => {});
        pushToast(`${active.name} completed`, `${doneCount} done · ${openCount} moved to ${dest ? dest.name : 'backlog'}`);
        setView('backlog');
        return {
          ...cur,
          sprints: cur.sprints.map((s) => (s.id === active.id ? { ...s, state: 'closed' as const } : s)),
          issues: cur.issues.map((i) =>
            i.sprintId === active.id && i.status !== 'done' ? { ...i, sprintId: moveToSprintId, status: 'todo' as Status } : i,
          ),
        };
      });
    },
    [pushToast],
  );

  const handleDeleteIssue = useCallback(
    (issueId: string) => {
      setSelectedId(null);
      setWs((cur) => {
        if (!cur) return cur;
        const iss = cur.issues.find((i) => i.id === issueId);
        if (iss) pushToast(`${iss.key} deleted`, iss.summary);
        return { ...cur, issues: cur.issues.filter((i) => i.id !== issueId) };
      });
      api.deleteIssue(issueId).catch(() => pushToast('Could not delete issue', 'Check the API connection'));
    },
    [pushToast],
  );

  const handleCreateSprint = useCallback(() => {
    if (!ws) return;
    const num = ws.sprints.reduce((m, s) => Math.max(m, parseInt(s.name.replace(/\D/g, ''), 10) || 0), 0) + 1;
    api
      .createSprint(`Sprint ${num}`)
      .then((sp) => {
        setWs((c) => (c ? { ...c, sprints: [...c.sprints, sp] } : c));
        pushToast(`${sp.name} created`, 'Add issues from the backlog');
      })
      .catch(() => pushToast('Could not create sprint', 'Check the API connection'));
  }, [ws, pushToast]);

  const handleConfirmStartSprint = useCallback(
    (sprintId: string, patch: StartSprintPatch) => {
      setStartingSprintId(null);
      api.updateSprint(sprintId, patch).catch(() => {});
      api.startSprint(sprintId).catch(() => pushToast('Could not start sprint', 'Check the API connection'));
      setWs((cur) =>
        cur
          ? { ...cur, sprints: cur.sprints.map((s) => (s.id === sprintId ? { ...s, ...patch, state: 'active' as const } : s)) }
          : cur,
      );
      pushToast(`${patch.name} started`, patch.goal || 'Good luck this sprint!');
      setView('board');
    },
    [pushToast],
  );

  const handleRelocate = useCallback(
    (issueId: string, sprintId: string | null, rank: number) => {
      const iss = ws?.issues.find((i) => i.id === issueId);
      const moved = iss && iss.sprintId !== sprintId;
      patchIssueLocal(issueId, { sprintId, rank, updatedAt: new Date().toISOString() });
      if (moved && iss) {
        const dest = sprintId ? ws?.sprints.find((s) => s.id === sprintId)?.name ?? 'sprint' : 'Backlog';
        pushToast(`${iss.key} → ${dest}`, iss.summary);
      }
      api.updateIssue(issueId, { sprintId, rank }).catch(() => pushToast('Update failed', 'Changes may not persist'));
    },
    [ws, patchIssueLocal, pushToast],
  );

  /* -------------------------------- render ------------------------------ */

  if (!signedIn) {
    return (
      <LoginScreen
        onSignIn={(name) => {
          try {
            localStorage.setItem('nexus:user', name);
          } catch {
            /* storage unavailable */
          }
          setSignedIn(name);
        }}
      />
    );
  }

  if (!ws) return <LoadingScreen />;

  const me = ws.users.find((u) => u.id === ws.project.leadId) ?? ws.users[0];
  const activeSprint = ws.sprints.find((s) => s.state === 'active');
  const selected = selectedId ? ws.issues.find((i) => i.id === selectedId) ?? null : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar
        me={me}
        onCreate={() => setCreate({ status: 'todo', sprintId: activeSprint?.id ?? null })}
        onOpenPalette={() => setPalette(true)}
        live={live}
        onToggleLive={() => setLive((l) => !l)}
        onNavigate={setView}
        onOpenHelp={() => setShortcutsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenIssueKey={(key) => {
          const target = ws.issues.find((i) => i.key === key);
          if (target) setSelectedId(target.id);
          else notify('Issue not found', `${key} may have been archived`);
        }}
        onLogout={() => {
          try {
            localStorage.removeItem('nexus:user');
          } catch {
            /* storage unavailable */
          }
          setSignedIn(null);
        }}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          project={{ ...ws.project, name: projectName ?? ws.project.name }}
          view={view}
          onNavigate={setView}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          apiMode={api.mode}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {view === 'forYou' && (
            <YourWorkView
              me={me}
              issues={ws.issues}
              users={ws.users}
              sprints={ws.sprints}
              onOpenIssue={(i) => setSelectedId(i.id)}
              onNavigate={setView}
              onCreate={() => setCreate({ status: 'todo', sprintId: activeSprint?.id ?? null })}
            />
          )}

          {view === 'board' &&
            (activeSprint ? (
              <BoardView
                sprint={activeSprint}
                issues={ws.issues.filter((i) => i.sprintId === activeSprint.id)}
                users={ws.users}
                epics={ws.epics}
                me={me}
                onOpenIssue={(i) => setSelectedId(i.id)}
                onMove={handleMove}
                onCreate={(status) => setCreate({ status, sprintId: activeSprint.id })}
                onCompleteSprint={() => setCompletingSprint(true)}
              />
            ) : (
              <EmptyBoard onGoToBacklog={() => setView('backlog')} />
            ))}

          {view === 'backlog' && (
            <BacklogView
              sprints={ws.sprints.filter((s) => s.state !== 'closed')}
              issues={ws.issues}
              users={ws.users}
              epics={ws.epics}
              onOpenIssue={(i) => setSelectedId(i.id)}
              onCreate={(sprintId) => setCreate({ status: 'todo', sprintId })}
              onStartSprint={(id) => setStartingSprintId(id)}
              onCreateSprint={handleCreateSprint}
              onRelocate={handleRelocate}
              onGoToReports={() => setView('reports')}
            />
          )}

          {view === 'issues' && (
            <IssuesView
              issues={ws.issues}
              users={ws.users}
              sprints={ws.sprints}
              epics={ws.epics}
              onOpenIssue={(i) => setSelectedId(i.id)}
            />
          )}

          {view === 'roadmap' && <RoadmapView epics={ws.epics} issues={ws.issues} onOpenIssue={(i) => setSelectedId(i.id)} />}

          {view === 'reports' && ws.sprints.length > 0 && (
            <ReportsView sprint={activeSprint ?? ws.sprints[ws.sprints.length - 1]} sprints={ws.sprints} issues={ws.issues} />
          )}
          {view === 'reports' && ws.sprints.length === 0 && <EmptyBoard onGoToBacklog={() => setView('backlog')} />}

          {view === 'backend' && <BackendView />}
        </main>
      </div>

      {/* Modals */}
      {selected && (
        <IssueDetailModal
          key={selected.id}
          issue={selected}
          users={ws.users}
          sprints={ws.sprints}
          epics={ws.epics}
          onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate}
          onAddComment={handleAddComment}
          onDelete={handleDeleteIssue}
        />
      )}

      {create && (
        <CreateIssueModal
          defaultStatus={create.status}
          defaultSprintId={create.sprintId}
          activeSprintId={activeSprint?.id ?? null}
          users={ws.users}
          sprints={ws.sprints.filter((s) => s.state !== 'closed')}
          epics={ws.epics}
          onClose={() => setCreate(null)}
          onCreate={handleCreate}
        />
      )}

      {startingSprintId &&
        (() => {
          const sp = ws.sprints.find((s) => s.id === startingSprintId);
          if (!sp) return null;
          return (
            <StartSprintModal
              sprint={sp}
              issueCount={ws.issues.filter((i) => i.sprintId === sp.id).length}
              onClose={() => setStartingSprintId(null)}
              onConfirm={handleConfirmStartSprint}
            />
          );
        })()}

      {completingSprint && activeSprint && (
        <CompleteSprintModal
          sprint={activeSprint}
          issues={ws.issues.filter((i) => i.sprintId === activeSprint.id)}
          nextSprint={ws.sprints.find((s) => s.state === 'future') ?? null}
          onClose={() => setCompletingSprint(false)}
          onConfirm={handleCompleteSprint}
        />
      )}

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        issues={ws.issues}
        users={ws.users}
        onOpenIssue={(i) => setSelectedId(i.id)}
        onNavigate={setView}
        onCreate={() => setCreate({ status: 'todo', sprintId: activeSprint?.id ?? null })}
      />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {settingsOpen && (
        <ProjectSettingsModal
          currentName={projectName ?? ws.project.name}
          live={live}
          onToggleLive={() => setLive((l) => !l)}
          onRename={(name) => {
            try {
              localStorage.setItem('nexus:projectName', name);
            } catch { /* ignore */ }
            setProjectName(name);
            pushToast('Project renamed', `Now showing “${name}”`);
          }}
          onOpenShortcuts={() => {
            setSettingsOpen(false);
            setShortcutsOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <WelcomeModal
        open={welcome}
        onClose={() => {
          setWelcome(false);
          try {
            localStorage.setItem('nexus:welcomed', '1');
          } catch {
            /* storage unavailable */
          }
        }}
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[100] flex w-[340px] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line-soft bg-white p-3 shadow-overlay"
            >
              <CheckCircle2 size={17} className="mt-[1px] shrink-0 text-grn-500" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink-900">{t.title}</p>
                {t.desc && <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-500">{t.desc}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------- Loading -------------------------------- */

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex h-12 items-center gap-3 border-b border-line px-4">
        <div className="skeleton h-6 w-6 rounded-md" />
        <div className="skeleton h-4 w-28 rounded" />
        <div className="ml-auto skeleton h-7 w-40 rounded-md" />
        <div className="skeleton h-7 w-7 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[248px] border-r border-line-soft p-3 sm:block">
          <div className="skeleton h-11 w-full rounded-lg" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded-md" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="skeleton h-6 w-44 rounded" />
          <div className="mt-6 flex gap-3">
            {[0.66, 1, 0.4, 0.82].map((n, i) => (
              <div key={i} className="w-[264px] shrink-0 rounded-lg bg-col p-2">
                <div className="skeleton mb-2 h-4 w-24 rounded" />
                {Array.from({ length: Math.round(3 + n * 2) }).map((_, j) => (
                  <div key={j} className="skeleton mb-2 rounded-md" style={{ height: 56 + ((i + j) % 3) * 14 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyBoard({ onGoToBacklog }: { onGoToBacklog: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-org-100 text-org-500">
        <Flag size={22} />
      </span>
      <h2 className="text-[16px] font-semibold text-ink-900">No active sprint</h2>
      <p className="max-w-sm text-[13px] text-ink-500">Plan work in the backlog, then start a sprint to see it on the board.</p>
      <button onClick={onGoToBacklog} className="mt-1 h-9 rounded-md bg-brand-600 px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
        Go to backlog
      </button>
    </div>
  );
}
