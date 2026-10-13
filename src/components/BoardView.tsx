import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { ChevronDown, CircleOff, Copy, Download, EyeOff, MoreHorizontal, Plus, Search, Star, Zap } from 'lucide-react';
import type { Epic, Issue, Sprint, Status, User } from '../types';
import { BOARD_COLUMNS, STATUS_META } from '../types';
import { Avatar, AvatarStack, IssueTypeIcon, LabelChip, Modal, ModalClose, PointsBadge, PriorityIcon, fmtDate } from './ui';
import { notify } from '../utils/toastBus';
import { cn } from '../utils/cn';

/** Work-in-progress limits per column (Jira column constraints) */
const WIP_LIMITS: Partial<Record<Status, number>> = { inprogress: 4, inreview: 3 };

interface Props {
  sprint: Sprint;
  issues: Issue[];
  users: User[];
  epics: Epic[];
  me: User;
  onOpenIssue: (issue: Issue) => void;
  onMove: (issueId: string, status: Status, rank: number, persist: boolean) => void;
  onCreate: (status: Status) => void;
  onCompleteSprint: () => void;
}

export function BoardView({ sprint, issues, users, epics, me, onOpenIssue, onMove, onCreate, onCompleteSprint }: Props) {
  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'bug' | 'mine'>('all');
  const [epicFilter, setEpicFilter] = useState<string | null>(null);
  const [epicMenuOpen, setEpicMenuOpen] = useState(false);
  const [starred, setStarred] = useState(() => {
    try {
      return localStorage.getItem('nexus:starred') === '1';
    } catch {
      return false;
    }
  });
  const [showEpics, setShowEpics] = useState(() => {
    try {
      return localStorage.getItem('nexus:showEpics') !== '0';
    } catch {
      return true;
    }
  });
  const [automationOpen, setAutomationOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const epicMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) setBoardMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [boardMenuOpen]);

  const exportVisible = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = filtered.map((i) => [i.key, STATUS_META[i.status].label, esc(i.summary), String(i.storyPoints ?? ''), i.priority]);
    const csv = '﻿' + [['Key', 'Status', 'Summary', 'Points', 'Priority'].join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-${sprint.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Board exported', `${filtered.length} visible cards → CSV`);
  };
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!epicMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (epicMenuRef.current && !epicMenuRef.current.contains(e.target as Node)) setEpicMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [epicMenuOpen]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (assignee) {
        if (assignee === 'none' ? i.assigneeId !== null : i.assigneeId !== assignee) return false;
      }
      if (typeFilter === 'bug' && i.type !== 'bug') return false;
      if (typeFilter === 'mine' && i.assigneeId !== me.id) return false;
      if (epicFilter && i.epicId !== epicFilter) return false;
      if (q && ![i.summary, i.key, ...i.labels].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, query, assignee, typeFilter, epicFilter, me.id]);

  const columns = useMemo(() => {
    const map = {} as Record<Status, Issue[]>;
    for (const s of BOARD_COLUMNS) map[s] = [];
    for (const i of filtered) map[i.status].push(i);
    for (const s of BOARD_COLUMNS) map[s].sort((a, b) => a.rank - b.rank);
    return map;
  }, [filtered]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) ?? null : null;

  const memberFilters: (User | null)[] = useMemo(() => {
    const ids = new Set<string>();
    issues.forEach((i) => i.assigneeId && ids.add(i.assigneeId));
    const list = users.filter((u) => ids.has(u.id));
    return issues.some((i) => !i.assigneeId) ? [...list, null] : list;
  }, [issues, users]);

  const points = filtered.reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
  const daysLeft = Math.max(0, Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / 86400000));

  /* ----------------------------- DnD logic ---------------------------- */

  const resolveTarget = (overId: string | number): { status: Status; rank: number } | null => {
    const key = String(overId);
    if (key.startsWith('col:')) {
      const status = key.slice(4) as Status;
      const list = columns[status].filter((i) => i.id !== activeId);
      const rank = list.length ? list[list.length - 1].rank + 10 : 10;
      return { status, rank };
    }
    const over = issues.find((i) => i.id === key);
    if (!over) return null;
    const list = columns[over.status].filter((i) => i.id !== activeId);
    const idx = list.findIndex((i) => i.id === over.id);
    if (idx < 0) return { status: over.status, rank: over.rank };
    const prev = list[idx - 1];
    const rank = prev ? (prev.rank + over.rank) / 2 : over.rank - 10;
    return { status: over.status, rank };
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const target = resolveTarget(over.id);
    if (!target) return;
    const issue = issues.find((i) => i.id === id);
    if (!issue) return;
    // live-move across columns for smooth cross-container animation
    if (issue.status !== target.status) onMove(id, target.status, target.rank, false);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const id = String(active.id);
    setActiveId(null);
    if (!over) return;
    const target = resolveTarget(over.id);
    if (!target) return;
    const issue = issues.find((i) => i.id === id);
    if (!issue) return;
    if (issue.status !== target.status || Math.abs(issue.rank - target.rank) > 0.001) {
      onMove(id, target.status, target.rank, true);
    }
  };

  /* ------------------------------- Render ------------------------------ */

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="shrink-0 px-6 pt-4">
        <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className="hover:text-brand-700 hover:underline">Projects</span>
          <span>/</span>
          <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-ink-900">ATL board</h1>
            <motion.button
              whileTap={{ scale: 0.75 }}
              onClick={() =>
                setStarred((s) => {
                  const v = !s;
                  try {
                    localStorage.setItem('nexus:starred', v ? '1' : '0');
                  } catch { /* ignore */ }
                  return v;
                })
              }
              title={starred ? 'Remove from starred' : 'Add to starred'}
              className={cn('flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-line-soft', starred ? 'text-yel-500' : 'text-ink-400 hover:text-yel-500')}
            >
              <Star size={15} className={starred ? 'fill-yel-500' : ''} />
            </motion.button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setAutomationOpen(true)} className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
              <Zap size={14} className="text-pur-400" />
              Automation
            </button>
            <div ref={boardMenuRef} className="relative">
              <button onClick={() => setBoardMenuOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft">
                <MoreHorizontal size={16} />
              </button>
              {boardMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 z-40 mt-1 w-[230px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay"
                >
                  <MenuItem
                    icon={<EyeOff size={14} />}
                    label={showEpics ? 'Hide epic chips on cards' : 'Show epic chips on cards'}
                    onClick={() => {
                      setShowEpics((v) => {
                        const next = !v;
                        try {
                          localStorage.setItem('nexus:showEpics', next ? '1' : '0');
                        } catch { /* ignore */ }
                        return next;
                      });
                      setBoardMenuOpen(false);
                    }}
                  />
                  <MenuItem
                    icon={<Download size={14} />}
                    label="Export visible cards (CSV)"
                    onClick={() => {
                      exportVisible();
                      setBoardMenuOpen(false);
                    }}
                  />
                  <MenuItem
                    icon={<Copy size={14} />}
                    label="Copy board link"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${window.location.origin}/boards/ATL`).catch(() => {});
                      setBoardMenuOpen(false);
                      notify('Board link copied', '/boards/ATL');
                    }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-3 pb-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search board"
              className="h-8 w-40 rounded-md border border-transparent bg-surface pl-8 pr-2 text-[13px] outline-none transition-all placeholder:text-ink-400 hover:border-line focus:w-56 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <AvatarStack
            users={memberFilters}
            size={28}
            active={assignee}
            onSelect={(u) => {
              const id = u ? u.id : 'none';
              setAssignee((cur) => (cur === id ? null : id));
            }}
          />

          <div className="flex items-center gap-1.5">
            <FilterPill active={typeFilter === 'mine'} onClick={() => setTypeFilter(typeFilter === 'mine' ? 'all' : 'mine')}>
              Only my issues
            </FilterPill>
            <FilterPill active={typeFilter === 'bug'} onClick={() => setTypeFilter(typeFilter === 'bug' ? 'all' : 'bug')}>
              Bugs only
            </FilterPill>
            {(assignee || typeFilter !== 'all' || query || epicFilter) && (
              <button
                onClick={() => { setAssignee(null); setTypeFilter('all'); setQuery(''); setEpicFilter(null); }}
                className="flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-line-soft hover:text-ink-900"
              >
                <CircleOff size={13} />
                Clear
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden items-center gap-1.5 rounded-md bg-col px-2 py-1 text-[11.5px] font-medium text-ink-700 md:flex">
              <span className="font-semibold">{points}</span> pts · {daysLeft}d left
            </span>
            <div ref={epicMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setEpicMenuOpen((o) => !o)}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
                  epicFilter ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200' : 'bg-col text-ink-700 hover:bg-col-hover',
                )}
              >
                {epicFilter ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: epics.find((e) => e.id === epicFilter)?.color }} />
                    {epics.find((e) => e.id === epicFilter)?.title.split(' ').slice(0, 2).join(' ')}
                  </>
                ) : (
                  'Epic: All'
                )}
                <ChevronDown size={14} className={epicFilter ? 'text-brand-700' : 'text-ink-400'} />
              </button>
              {epicMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 z-40 mt-1 w-[240px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay"
                >
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-400">Filter by epic</p>
                  <button
                    onClick={() => { setEpicFilter(null); setEpicMenuOpen(false); }}
                    className={cn('flex w-full items-center gap-2 px-3 py-[7px] text-left text-[13px] transition-colors hover:bg-brand-50', !epicFilter ? 'font-semibold text-brand-700' : 'text-ink-900')}
                  >
                    <span className="h-3 w-3 rounded-[4px] bg-col-hover" />
                    All epics
                  </button>
                  {epics.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { setEpicFilter(e.id); setEpicMenuOpen(false); }}
                      className={cn('flex w-full items-center gap-2 px-3 py-[7px] text-left text-[13px] transition-colors hover:bg-brand-50', epicFilter === e.id ? 'font-semibold text-brand-700' : 'text-ink-900')}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ backgroundColor: e.color }} />
                      <span className="truncate">{e.title}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <button
              onClick={onCompleteSprint}
              className="h-8 rounded-md bg-brand-600 px-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
            >
              Complete sprint
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-3 text-[12px] text-ink-500">
          <span className="rounded bg-org-100 px-1.5 py-0.5 font-semibold text-org-700">{sprint.name}</span>
          <span>
            {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)} · {sprint.goal}
          </span>
        </div>
      </div>

      {/* Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="scroll-slim flex flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden px-6 pb-5">
          {BOARD_COLUMNS.map((status, colIdx) => (
            <Column
              key={status}
              status={status}
              issues={columns[status]}
              epics={epics}
              users={users}
              index={colIdx}
              onOpenIssue={onOpenIssue}
              onCreate={onCreate}
              showEpics={showEpics}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0.4, 1)' }}>
          {activeIssue && (
            <div className="w-[264px] rotate-[2.5deg]">
              <IssueCard issue={activeIssue} epic={showEpics ? epics.find((e) => e.id === activeIssue.epicId) : undefined} user={users.find((u) => u.id === activeIssue.assigneeId) ?? null} ghost />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AutomationModal open={automationOpen} onClose={() => setAutomationOpen(false)} />
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface">
      <span className="text-ink-400">{icon}</span>
      {label}
    </button>
  );
}

/* --------------------------- Automation rules -------------------------- */

const RULES = [
  { id: 'pr-merge', title: 'Move to Done when PR merges', desc: 'Watches linked pull requests and closes the issue automatically.' },
  { id: 'auto-assign', title: 'Auto-assign new bugs to QA', desc: 'Any issue of type Bug lands with the QA engineer until triaged.' },
  { id: 'stale-flag', title: 'Flag issues idle for 3 days', desc: 'Adds a “stale” label when a card has not moved recently.' },
];

function loadRules(): Record<string, boolean> {
  try {
    return { 'pr-merge': true, 'auto-assign': false, 'stale-flag': true, ...JSON.parse(localStorage.getItem('nexus:automation') ?? '{}') };
  } catch {
    return { 'pr-merge': true, 'auto-assign': false, 'stale-flag': true };
  }
}

function AutomationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rules, setRules] = useState<Record<string, boolean>>(loadRules);

  const toggle = (id: string) => {
    setRules((cur) => {
      const next = { ...cur, [id]: !cur[id] };
      try {
        localStorage.setItem('nexus:automation', JSON.stringify(next));
      } catch { /* ignore */ }
      const rule = RULES.find((r) => r.id === id);
      notify(next[id] ? 'Rule enabled' : 'Rule disabled', rule?.title);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pur-100 text-pur-400">
            <Zap size={16} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-ink-900">Automation</h2>
            <p className="text-[12px] text-ink-500">{Object.values(rules).filter(Boolean).length} of {RULES.length} rules active on ATL board</p>
          </div>
        </div>
        <ModalClose onClose={onClose} />
      </div>
      <div className="px-6 py-4">
        {RULES.map((rule) => (
          <button
            key={rule.id}
            onClick={() => toggle(rule.id)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface"
          >
            <span>
              <span className="block text-[13.5px] font-medium text-ink-900">{rule.title}</span>
              <span className="mt-0.5 block text-[12px] leading-[17px] text-ink-400">{rule.desc}</span>
            </span>
            <span className={cn('relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200', rules[rule.id] ? 'bg-brand-600' : 'bg-ink-300')}>
              <span className={cn('absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform duration-200', rules[rule.id] ? 'translate-x-[21px]' : 'translate-x-[3px]')} />
            </span>
          </button>
        ))}
        <p className="mt-2 rounded-md bg-surface px-3 py-2 text-[11.5px] leading-[17px] text-ink-400">
          Rules are stored per-browser in this demo. On the live API they map to a .NET background worker and Supabase webhooks.
        </p>
      </div>
    </Modal>
  );
}

/* ------------------------------- Column ------------------------------ */

function Column({
  status,
  issues,
  epics,
  users,
  index,
  onOpenIssue,
  onCreate,
  showEpics,
}: {
  status: Status;
  issues: Issue[];
  epics: Epic[];
  users: User[];
  index: number;
  onOpenIssue: (issue: Issue) => void;
  onCreate: (status: Status) => void;
  showEpics: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const limit = WIP_LIMITS[status];
  const overLimit = !!limit && issues.length > limit;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);
  const totalPts = issues.reduce((a, i) => a + (i.storyPoints ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[264px] shrink-0 flex-col"
    >
      <div className="flex items-center gap-1.5 px-1.5 pb-2">
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-ink-500">{STATUS_META[status].label}</h2>
        <span
          className={cn(
            'flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold',
            overLimit ? 'bg-red-500 text-white' : 'bg-col text-ink-700',
          )}
        >
          {issues.length}
        </span>
        {limit && (
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', overLimit ? 'text-red-600' : 'text-ink-400')}>
            max {limit}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={() => onCreate(status)} className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-line-soft hover:text-ink-900">
          <Plus size={14} />
        </button>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-line-soft hover:text-ink-900"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-40 mt-1 w-[210px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay">
              <MenuItem
                icon={<Plus size={14} />}
                label="Add card"
                onClick={() => {
                  onCreate(status);
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Copy size={14} />}
                label="Copy column name"
                onClick={() => {
                  void navigator.clipboard?.writeText(STATUS_META[status].label).catch(() => {});
                  setMenuOpen(false);
                  notify('Copied', STATUS_META[status].label);
                }}
              />
              <MenuItem
                icon={<Download size={14} />}
                label="Column summary"
                onClick={() => {
                  setMenuOpen(false);
                  notify(`${STATUS_META[status].label}: ${issues.length} cards · ${totalPts} pts`, limit ? `WIP limit ${limit} — ${issues.length <= limit ? 'within limit' : 'over limit!'}` : 'No WIP limit set');
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'scroll-slim flex min-h-[140px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-1.5 transition-colors duration-150',
          isOver ? 'bg-brand-50 ring-2 ring-inset ring-brand-200' : overLimit ? 'bg-red-100/60 ring-1 ring-inset ring-red-500/30' : 'bg-col',
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <SortableCard
              key={issue.id}
              issue={issue}
              epic={showEpics ? epics.find((e) => e.id === issue.epicId) : undefined}
              user={users.find((u) => u.id === issue.assigneeId) ?? null}
              onOpen={() => onOpenIssue(issue)}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onCreate(status)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-line-soft hover:text-ink-900"
        >
          <Plus size={14} />
          Create
        </button>
      </div>
    </motion.div>
  );
}

/* -------------------------------- Cards ------------------------------ */

function SortableCard({ issue, epic, user, onOpen }: { issue: Issue; epic?: Epic; user: User | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  return (
    <div
      ref={setNodeRef}
      data-dnd
      style={{ transform: CSS.Transform.toString(transform), transition: transition ?? undefined }}
      className={cn('transition-opacity duration-150', isDragging && 'opacity-35')}
      {...attributes}
      {...listeners}
    >
      <IssueCard issue={issue} epic={epic} user={user} onOpen={onOpen} />
    </div>
  );
}

export function IssueCard({ issue, epic, user, onOpen, ghost }: { issue: Issue; epic?: Epic; user: User | null; onOpen?: () => void; ghost?: boolean }) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        'group cursor-pointer rounded-lg border border-transparent bg-white p-2.5 shadow-card transition-all duration-150',
        ghost ? 'shadow-drag' : 'hover:border-line hover:shadow-card-hover',
      )}
    >
      {epic && (
        <span
          className="mb-1.5 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-[1.5px] text-[10px] font-semibold text-white"
          style={{ backgroundColor: epic.color }}
        >
          <svg width="9" height="9" viewBox="0 0 16 16"><path d="M8.9 2.2 4.2 9h2.9l-.9 4.8L10.6 7H7.6z" fill="#fff" /></svg>
          {epic.title.split(' ').slice(0, 2).join(' ')}
        </span>
      )}
      <p className="text-[13px] leading-[18px] text-ink-900">{issue.summary}</p>

      {issue.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <IssueTypeIcon type={issue.type} size={15} />
        <span className="text-[11px] font-medium text-ink-500 transition-colors group-hover:text-brand-700">{issue.key}</span>
        <div className="flex-1" />
        <PointsBadge points={issue.storyPoints} />
        <PriorityIcon priority={issue.priority} size={15} />
        <Avatar user={user} size={22} ring={false} />
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 rounded-md px-2.5 text-[12.5px] font-medium transition-colors',
        active ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200' : 'text-ink-700 hover:bg-line-soft',
      )}
    >
      {children}
    </button>
  );
}
