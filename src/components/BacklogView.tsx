import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Copy, GitCommitHorizontal, GripVertical, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import type { Epic, Issue, Sprint, User } from '../types';
import { Avatar, IssueTypeIcon, LabelChip, PointsBadge, PriorityIcon, StatusLozenge, fmtDate } from './ui';
import { IssueCard } from './BoardView';
import { notify } from '../utils/toastBus';
import { cn } from '../utils/cn';

interface Props {
  sprints: Sprint[];
  issues: Issue[];
  users: User[];
  epics: Epic[];
  onOpenIssue: (issue: Issue) => void;
  onCreate: (sprintId: string | null) => void;
  onStartSprint: (sprintId: string) => void;
  onCreateSprint: () => void;
  onRelocate: (issueId: string, sprintId: string | null, rank: number) => void;
  onGoToReports: () => void;
}

export function BacklogView({ sprints, issues, users, epics, onOpenIssue, onCreate, onStartSprint, onCreateSprint, onRelocate, onGoToReports }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sections = useMemo(() => {
    const active = sprints.filter((s) => s.state === 'active');
    const future = sprints.filter((s) => s.state === 'future');
    const list: { sprint: Sprint | null; issues: Issue[] }[] = [];
    for (const s of [...active, ...future]) {
      list.push({ sprint: s, issues: issues.filter((i) => i.sprintId === s.id).sort((a, b) => a.rank - b.rank) });
    }
    list.push({ sprint: null, issues: issues.filter((i) => !i.sprintId).sort((a, b) => a.rank - b.rank) });
    return list;
  }, [sprints, issues]);

  const activeIssue = activeId ? issues.find((i) => i.id === activeId) ?? null : null;

  const handleDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    setActiveId(null);
    const { over } = e;
    if (!over) return;
    const issue = issues.find((i) => i.id === id);
    if (!issue) return;
    const overId = String(over.id);

    let targetSprint: string | null;
    let rank: number;

    if (overId.startsWith('sec:')) {
      targetSprint = overId.slice(4) === 'backlog' ? null : overId.slice(4);
      const list = issues.filter((i) => i.sprintId === targetSprint && i.id !== id);
      rank = list.length ? Math.max(...list.map((i) => i.rank)) + 10 : 10;
    } else {
      const overIssue = issues.find((i) => i.id === overId);
      if (!overIssue || overIssue.id === id) return;
      targetSprint = overIssue.sprintId;
      const siblings = issues.filter((i) => i.sprintId === targetSprint && i.id !== id).sort((a, b) => a.rank - b.rank);
      const idx = siblings.findIndex((i) => i.id === overIssue.id);
      const prev = idx > 0 ? siblings[idx - 1] : undefined;
      rank = prev ? (prev.rank + overIssue.rank) / 2 : overIssue.rank - 10;
    }

    if (issue.sprintId !== targetSprint || Math.abs(issue.rank - rank) > 0.001) {
      onRelocate(id, targetSprint, rank);
    }
  };

  return (
    <div className="scroll-slim h-full overflow-y-auto bg-white px-6 pb-16 pt-4">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
        <span className="hover:text-brand-700 hover:underline">Projects</span>
        <span>/</span>
        <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Backlog</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onGoToReports}
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft"
            title="Open velocity report"
          >
            <GitCommitHorizontal size={15} className="text-ink-400" />
            Velocity
          </button>
          <button
            onClick={onCreateSprint}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create sprint
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-400">
        <GripVertical size={13} />
        Drag issues between sections to plan sprints
      </p>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="mt-3 space-y-3">
          {sections.map(({ sprint, issues: list }, si) => (
            <Section
              key={sprint?.id ?? 'backlog'}
              sprint={sprint}
              issues={list}
              users={users}
              collapsed={collapsed[sprint?.id ?? 'backlog'] ?? false}
              onToggle={() => setCollapsed((c) => ({ ...c, [sprint?.id ?? 'backlog']: !(c[sprint?.id ?? 'backlog'] ?? false) }))}
              onOpenIssue={onOpenIssue}
              onCreate={onCreate}
              onStartSprint={onStartSprint}
              index={si}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0.4, 1)' }}>
          {activeIssue && (
            <div className="w-[320px] rotate-[2deg]">
              <IssueCard issue={activeIssue} epic={epics.find((e) => e.id === activeIssue.epicId)} user={users.find((u) => u.id === activeIssue.assigneeId) ?? null} ghost />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ------------------------------- Section ------------------------------- */

function Section({
  sprint,
  issues: list,
  users,
  collapsed,
  onToggle,
  onOpenIssue,
  onCreate,
  onStartSprint,
  index,
}: {
  sprint: Sprint | null;
  issues: Issue[];
  users: User[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenIssue: (issue: Issue) => void;
  onCreate: (sprintId: string | null) => void;
  onStartSprint: (sprintId: string) => void;
  index: number;
}) {
  const droppableId = `sec:${sprint?.id ?? 'backlog'}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
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
  const pts = list.reduce((a, i) => a + (i.storyPoints ?? 0), 0);
  const donePts = list.filter((i) => i.status === 'done').reduce((a, i) => a + (i.storyPoints ?? 0), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('overflow-hidden rounded-lg transition-colors', isOver ? 'bg-brand-50 ring-2 ring-inset ring-brand-200' : 'bg-col')}
    >
      <header className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button onClick={onToggle} className="flex h-6 w-6 items-center justify-center rounded text-ink-500 transition-colors hover:bg-line-soft">
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <h2 className="text-[13.5px] font-semibold text-ink-900">{sprint ? sprint.name : 'Backlog'}</h2>
        {sprint && (
          <span className="text-[12px] text-ink-500">
            {fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}
          </span>
        )}
        <span className="text-[12px] text-ink-500">
          ({list.length} issue{list.length === 1 ? '' : 's'} · {pts} pts)
        </span>
        {sprint?.state === 'active' && (
          <span className="rounded-full bg-brand-600 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-white">Active</span>
        )}
        {sprint && pts > 0 && (
          <span className="hidden items-center gap-1.5 sm:flex" title={`${donePts} of ${pts} points done`}>
            <span className="h-[6px] w-16 overflow-hidden rounded-full bg-line-soft">
              <span className="block h-full rounded-full bg-grn-500 transition-all" style={{ width: `${(donePts / pts) * 100}%` }} />
            </span>
            <span className="text-[11px] font-medium text-ink-500">{Math.round((donePts / pts) * 100)}%</span>
          </span>
        )}

        <div className="flex-1" />
        {sprint?.state === 'future' && (
          <button onClick={() => onStartSprint(sprint.id)} className="h-7 rounded-md bg-col-hover px-2.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-line">
            Start sprint
          </button>
        )}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-40 mt-1 w-[200px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay">
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(sprint ? sprint.name : 'Backlog').catch(() => {});
                  setMenuOpen(false);
                  notify('Copied to clipboard', sprint ? sprint.name : 'Backlog');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
              >
                <Copy size={13} className="text-ink-400" />
                Copy name
              </button>
              {sprint?.state === 'future' && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onStartSprint(sprint.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                >
                  <Pencil size={13} className="text-ink-400" />
                  Edit sprint
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  const ptTotal = list.reduce((a, i) => a + (i.storyPoints ?? 0), 0);
                  notify(
                    sprint ? sprint.name : 'Backlog',
                    `${list.length} issues · ${ptTotal} points${sprint ? ` · ${sprint.state}` : ''}`,
                  );
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
              >
                <MoreHorizontal size={13} className="text-ink-400" />
                Section details
              </button>
            </div>
          )}
        </div>
      </header>

      {!collapsed && (
        <div ref={setNodeRef} className={cn('px-1.5 pb-1.5 transition-colors', isOver && 'min-h-[80px]')}>
          {sprint?.goal && (
            <p className="mx-2 mb-2 rounded-md bg-yel-100 px-2.5 py-1.5 text-[12px] text-org-700">
              <span className="font-semibold">Sprint goal:</span> {sprint.goal}
            </p>
          )}
          <ul className="space-y-0.5">
            {list.map((issue) => (
              <DraggableRow key={issue.id} issue={issue} user={users.find((u) => u.id === issue.assigneeId) ?? null} onOpen={() => onOpenIssue(issue)} />
            ))}
          </ul>
          {list.length === 0 && (
            <p className={cn('rounded-md border border-dashed px-3 py-4 text-center text-[12.5px]', isOver ? 'border-brand-200 bg-white/70 text-brand-700' : 'border-line text-ink-400')}>
              Drop issues here
            </p>
          )}
          <button
            onClick={() => onCreate(sprint?.id ?? null)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-line-soft hover:text-ink-900"
          >
            <Plus size={14} />
            Create issue
          </button>
        </div>
      )}
    </motion.section>
  );
}

/* --------------------------------- Row --------------------------------- */

function DraggableRow({ issue, user, onOpen }: { issue: Issue; user: User | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id });
  return (
    <li ref={setNodeRef} data-dnd {...attributes} {...listeners} className={cn('transition-opacity', isDragging && 'opacity-35')}>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-2.5 rounded-md bg-white px-2.5 py-[7px] text-left shadow-card transition-shadow hover:shadow-card-hover"
      >
        <GripVertical size={13} className="shrink-0 cursor-grab text-ink-300 opacity-0 transition-opacity group-hover:opacity-100" />
        <IssueTypeIcon type={issue.type} size={16} />
        <span className="shrink-0 text-[11.5px] font-medium text-ink-500">{issue.key}</span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-900 group-hover:text-brand-700 group-hover:underline">{issue.summary}</span>
        <span className="hidden shrink-0 items-center gap-1 lg:flex">
          {issue.labels.slice(0, 2).map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </span>
        <PointsBadge points={issue.storyPoints} />
        <StatusLozenge status={issue.status} className="hidden sm:inline-flex" />
        <PriorityIcon priority={issue.priority} size={15} />
        <Avatar user={user} size={22} ring={false} />
      </button>
    </li>
  );
}
