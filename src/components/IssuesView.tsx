import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown, CircleOff, Download, Search } from 'lucide-react';
import type { Epic, Issue, IssueType, Priority, Sprint, Status, User } from '../types';
import { BOARD_COLUMNS, PRIORITY_ORDER, STATUS_META } from '../types';
import { Avatar, IssueTypeIcon, LabelChip, PointsBadge, PRIORITY_LABEL, PriorityIcon, StatusLozenge, TYPE_LABEL, timeAgo } from './ui';
import { cn } from '../utils/cn';

type SortKey = 'updated' | 'priority' | 'status' | 'points' | 'key';

const PRIORITY_RANK: Record<Priority, number> = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };
const STATUS_RANK: Record<Status, number> = { todo: 0, inprogress: 1, inreview: 2, done: 3 };

interface Props {
  issues: Issue[];
  users: User[];
  sprints: Sprint[];
  epics: Epic[];
  onOpenIssue: (issue: Issue) => void;
}

export function IssuesView({ issues, users, sprints, epics, onOpenIssue }: Props) {
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [type, setType] = useState<IssueType | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sprintScope, setSprintScope] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortAsc, setSortAsc] = useState(false);

  const activeFilters = statuses.length + (type ? 1 : 0) + (priority ? 1 : 0) + (assigneeId ? 1 : 0) + (sprintScope !== 'all' ? 1 : 0) + (query ? 1 : 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeSprintId = sprints.find((s) => s.state === 'active')?.id;
    const list = issues.filter((i) => {
      if (statuses.length && !statuses.includes(i.status)) return false;
      if (type && i.type !== type) return false;
      if (priority && i.priority !== priority) return false;
      if (assigneeId && i.assigneeId !== assigneeId) return false;
      if (sprintScope === 'active' && i.sprintId !== activeSprintId) return false;
      if (sprintScope === 'backlog' && i.sprintId !== null) return false;
      if (sprintScope !== 'all' && sprintScope !== 'active' && sprintScope !== 'backlog' && i.sprintId !== sprintScope) return false;
      if (q && ![i.summary, i.key, ...i.labels].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });

    const cmp = (a: Issue, b: Issue): number => {
      switch (sortKey) {
        case 'priority': return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        case 'status': return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        case 'points': return (a.storyPoints ?? -1) - (b.storyPoints ?? -1);
        case 'key': return parseInt(a.key.split('-')[1] ?? '0') - parseInt(b.key.split('-')[1] ?? '0');
        default: return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      }
    };
    list.sort((a, b) => (sortAsc ? cmp(a, b) : cmp(b, a)));
    return list;
  }, [issues, query, statuses, type, priority, assigneeId, sprintScope, sortKey, sortAsc, sprints]);

  const toggleStatus = (s: Status) => setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const clearAll = () => { setQuery(''); setStatuses([]); setType(null); setPriority(null); setAssigneeId(null); setSprintScope('all'); };

  const exportCsv = () => {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = ['Key', 'Type', 'Summary', 'Status', 'Priority', 'Points', 'Assignee', 'Sprint', 'Updated'];
    const rows = filtered.map((i) => [
      i.key,
      TYPE_LABEL[i.type],
      esc(i.summary),
      STATUS_META[i.status].label,
      PRIORITY_LABEL[i.priority],
      String(i.storyPoints ?? ''),
      esc(users.find((u) => u.id === i.assigneeId)?.name ?? 'Unassigned'),
      sprints.find((s) => s.id === i.sprintId)?.name ?? 'Backlog',
      i.updatedAt.slice(0, 10),
    ]);
    const csv = '﻿' + [header, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((a) => !a);
    else { setSortKey(k); setSortAsc(k === 'key' || k === 'points' || k === 'priority' || k === 'status'); }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 px-6 pt-4">
        <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className="hover:text-brand-700 hover:underline">Projects</span>
          <span>/</span>
          <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-[-0.015em] text-ink-900">
            All issues
            <span className="text-[13px] font-normal text-ink-400">{filtered.length} of {issues.length}</span>
          </h1>
          <button
            onClick={exportCsv}
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft"
            title="Download the filtered rows as CSV"
          >
            <Download size={14} className="text-ink-400" />
            Export CSV
          </button>
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pb-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues"
              className="h-8 w-44 rounded-md border border-transparent bg-surface pl-8 pr-2 text-[13px] outline-none transition-all placeholder:text-ink-400 hover:border-line focus:w-60 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 rounded-md bg-surface p-0.5">
            {BOARD_COLUMNS.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={cn(
                  'rounded-[5px] px-2 py-1 text-[11.5px] font-semibold transition-all',
                  statuses.includes(s) ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900',
                )}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>

          <MenuSelect
            button={type ? <span className="flex items-center gap-1.5"><IssueTypeIcon type={type} size={14} />{TYPE_LABEL[type]}</span> : 'Type'}
            active={!!type}
            options={[{ value: null, label: 'All types' }, ...(['story', 'task', 'bug'] as IssueType[]).map((t) => ({ value: t as IssueType | null, label: TYPE_LABEL[t], icon: <IssueTypeIcon type={t} size={15} /> }))]}
            value={type}
            onChange={setType}
          />

          <MenuSelect
            button={priority ? <span className="flex items-center gap-1.5"><PriorityIcon priority={priority} size={14} />{PRIORITY_LABEL[priority]}</span> : 'Priority'}
            active={!!priority}
            options={[{ value: null, label: 'All priorities' }, ...PRIORITY_ORDER.map((p) => ({ value: p as Priority | null, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} size={15} /> }))]}
            value={priority}
            onChange={setPriority}
          />

          <MenuSelect
            button={
              assigneeId ? (
                <span className="flex items-center gap-1.5">
                  <Avatar user={users.find((u) => u.id === assigneeId) ?? null} size={18} ring={false} />
                  {users.find((u) => u.id === assigneeId)?.name.split(' ')[0]}
                </span>
              ) : 'Assignee'
            }
            active={!!assigneeId}
            options={[{ value: null, label: 'Anyone' }, ...users.map((u) => ({ value: u.id as string | null, label: u.name, icon: <Avatar user={u} size={18} ring={false} /> }))]}
            value={assigneeId}
            onChange={setAssigneeId}
          />

          <MenuSelect
            button={sprintScope === 'all' ? 'Sprint' : sprintScope === 'active' ? 'Active sprint' : sprintScope === 'backlog' ? 'Backlog' : sprints.find((s) => s.id === sprintScope)?.name ?? 'Sprint'}
            active={sprintScope !== 'all'}
            options={[
              { value: 'all', label: 'Everywhere' },
              { value: 'active', label: 'Active sprint' },
              { value: 'backlog', label: 'Backlog' },
              ...sprints.filter((s) => s.state === 'future').map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={sprintScope}
            onChange={setSprintScope}
          />

          {activeFilters > 0 && (
            <button onClick={clearAll} className="flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-line-soft hover:text-ink-900">
              <CircleOff size={13} />
              Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 pb-10">
        <div className="overflow-hidden rounded-lg border border-line-soft shadow-card">
          {/* head */}
          <div className="sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-line-soft bg-surface px-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-ink-500">
            <span className="w-7 text-center">T</span>
            <SortBtn k="key" label="Key" w="w-[84px]" sortKey={sortKey} asc={sortAsc} onSort={sort} />
            <span className="min-w-0 flex-1">Summary</span>
            <SortBtn k="status" label="Status" w="w-[110px]" sortKey={sortKey} asc={sortAsc} onSort={sort} />
            <SortBtn k="priority" label="Priority" w="w-[86px]" sortKey={sortKey} asc={sortAsc} onSort={sort} />
            <SortBtn k="points" label="Pts" w="w-[56px] justify-center" sortKey={sortKey} asc={sortAsc} onSort={sort} />
            <span className="hidden w-[150px] lg:block">Assignee</span>
            <SortBtn k="updated" label="Updated" w="w-[84px]" sortKey={sortKey} asc={sortAsc} onSort={sort} />
          </div>

          {filtered.map((issue, i) => {
            const user = users.find((u) => u.id === issue.assigneeId) ?? null;
            const epic = epics.find((e) => e.id === issue.epicId);
            return (
              <motion.button
                key={issue.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.25 }}
                onClick={() => onOpenIssue(issue)}
                className="group flex min-h-[42px] w-full items-center gap-2 border-b border-line-soft bg-white px-2.5 py-1.5 text-left transition-colors last:border-b-0 hover:bg-brand-50/40"
              >
                <span className="flex w-7 justify-center"><IssueTypeIcon type={issue.type} size={16} /></span>
                <span className="w-[84px] shrink-0 text-[11.5px] font-medium text-ink-500 transition-colors group-hover:text-brand-700">{issue.key}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-[13px] text-ink-900">{issue.summary}</span>
                  {epic && <span className="hidden shrink-0 rounded-[4px] px-1.5 py-[1px] text-[10px] font-semibold text-white xl:inline" style={{ backgroundColor: epic.color }}>{epic.title.split(' ')[0]}</span>}
                  <span className="hidden shrink-0 items-center gap-1 md:flex">
                    {issue.labels.slice(0, 2).map((l) => <LabelChip key={l} label={l} />)}
                  </span>
                </span>
                <span className="w-[110px] shrink-0"><StatusLozenge status={issue.status} /></span>
                <span className="flex w-[86px] shrink-0 items-center gap-1.5 text-[12px] text-ink-700">
                  <PriorityIcon priority={issue.priority} size={15} />
                  <span className="hidden sm:inline">{PRIORITY_LABEL[issue.priority]}</span>
                </span>
                <span className="flex w-[56px] shrink-0 justify-center"><PointsBadge points={issue.storyPoints} /></span>
                <span className="hidden w-[150px] shrink-0 items-center gap-2 lg:flex">
                  <Avatar user={user} size={20} ring={false} />
                  <span className="truncate text-[12.5px] text-ink-700">{user?.name ?? 'Unassigned'}</span>
                </span>
                <span className="w-[84px] shrink-0 text-[11.5px] text-ink-500">{timeAgo(issue.updatedAt)}</span>
              </motion.button>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 bg-white px-4 py-14 text-center">
              <Search size={18} className="text-ink-300" />
              <p className="text-[13.5px] font-medium text-ink-700">No issues match these filters</p>
              <button onClick={clearAll} className="text-[13px] font-medium text-brand-700 hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ primitives ----------------------------- */

function SortBtn({ k, label, w, sortKey, asc, onSort }: { k: SortKey; label: string; w: string; sortKey: SortKey; asc: boolean; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <button onClick={() => onSort(k)} className={cn('flex shrink-0 items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-ink-900', w, active && 'text-ink-900')}>
      {label}
      {active && (asc ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />)}
    </button>
  );
}

function MenuSelect<T>({ button, options, value, onChange, active }: { button: ReactNode; options: { value: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
          active ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200' : 'text-ink-700 hover:bg-line-soft',
        )}
      >
        {button}
        <ChevronDown size={13} className={active ? 'text-brand-700' : 'text-ink-400'} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.13 }}
          className="absolute z-40 mt-1 max-h-72 w-[210px] overflow-y-auto rounded-lg border border-line-soft bg-white py-1 shadow-overlay"
        >
          {options.map((o, i) => (
            <button
              key={i}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn('flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] transition-colors hover:bg-brand-50', o.value === value ? 'font-semibold text-brand-700' : 'text-ink-900')}
            >
              {o.icon}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
