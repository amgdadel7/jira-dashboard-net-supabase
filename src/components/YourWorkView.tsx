import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, CircleDot, Flag, Layers, Sparkles } from 'lucide-react';
import type { Issue, Sprint, User } from '../types';
import type { ViewKey } from './Sidebar';
import { STATUS_META } from '../types';
import { Avatar, IssueTypeIcon, LabelChip, PointsBadge, PriorityIcon, StatusLozenge, fmtDate, timeAgo } from './ui';
import { cn } from '../utils/cn';

interface Props {
  me: User;
  issues: Issue[];
  users: User[];
  sprints: Sprint[];
  onOpenIssue: (issue: Issue) => void;
  onNavigate: (view: ViewKey) => void;
  onCreate: () => void;
}

export function YourWorkView({ me, issues, users, sprints, onOpenIssue, onNavigate, onCreate }: Props) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const mine = useMemo(() => issues.filter((i) => i.assigneeId === me.id), [issues, me.id]);
  const mineOpen = mine.filter((i) => i.status !== 'done');
  const inProgress = mine.filter((i) => i.status === 'inprogress');
  const mineDone = mine.filter((i) => i.status === 'done');
  const activeSprint = sprints.find((s) => s.state === 'active');
  const sprintIssues = useMemo(() => issues.filter((i) => activeSprint && i.sprintId === activeSprint.id), [issues, activeSprint]);
  const sprintPts = sprintIssues.reduce((a, i) => a + (i.storyPoints ?? 0), 0);
  const sprintDonePts = sprintIssues.filter((i) => i.status === 'done').reduce((a, i) => a + (i.storyPoints ?? 0), 0);
  const recent = useMemo(() => [...issues].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 7), [issues]);
  const daysLeft = activeSprint ? Math.max(0, Math.ceil((Date.parse(activeSprint.endDate) - Date.now()) / 86400000)) : 0;

  const grouped = useMemo(() => {
    const order: Issue['status'][] = ['inprogress', 'inreview', 'todo'];
    return order
      .map((s) => ({ status: s, items: mineOpen.filter((i) => i.status === s).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)) }))
      .filter((g) => g.items.length > 0);
  }, [mineOpen]);

  return (
    <div className="scroll-slim h-full overflow-y-auto bg-white px-6 pb-16 pt-5">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-3.5">
        <Avatar user={me} size={44} ring={false} />
        <div>
          <h1 className="text-[21px] font-semibold tracking-[-0.015em] text-ink-900">
            {greeting}, {me.name.split(' ')[0]}
          </h1>
          <p className="text-[13px] text-ink-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {mineOpen.length} open issue{mineOpen.length === 1 ? '' : 's'} on your plate
          </p>
        </div>
        <button
          onClick={onCreate}
          className="ml-auto hidden h-9 items-center gap-1.5 rounded-md bg-brand-600 px-3.5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98] sm:flex"
        >
          <Sparkles size={14} />
          Create issue
        </button>
      </motion.div>

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { icon: CircleDot, tint: 'bg-brand-50 text-brand-700', label: 'Assigned to me', value: mineOpen.length, sub: 'open now' },
          { icon: Flag, tint: 'bg-org-100 text-org-700', label: 'In progress', value: inProgress.length, sub: 'keep it moving' },
          { icon: CheckCircle2, tint: 'bg-grn-100 text-grn-700', label: 'Done by me', value: mineDone.length, sub: 'this sprint' },
          { icon: Layers, tint: 'bg-pur-100 text-pur-600', label: 'My story points', value: mineOpen.reduce((a, i) => a + (i.storyPoints ?? 0), 0), sub: 'remaining' },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-line-soft bg-white p-4 shadow-card"
          >
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', k.tint)}>
              <k.icon size={15} />
            </span>
            <p className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-[24px] font-bold tracking-[-0.02em] text-ink-900">{k.value}</span>
              <span className="text-[11.5px] text-ink-500">{k.sub}</span>
            </p>
            <p className="text-[12px] font-medium text-ink-500">{k.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr,1fr]">
        {/* Assigned to me */}
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden rounded-lg border border-line-soft bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <h3 className="text-[14px] font-semibold text-ink-900">Assigned to me</h3>
            <button onClick={() => onNavigate('issues')} className="flex items-center gap-1 text-[12.5px] font-medium text-brand-700 transition-colors hover:underline">
              View in filters
              <ArrowRight size={13} />
            </button>
          </div>

          {grouped.map((g) => (
            <div key={g.status}>
              <p className="border-b border-line-soft bg-surface px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-500">
                {STATUS_META[g.status].label} · {g.items.length}
              </p>
              {g.items.map((issue) => {
                const reporter = users.find((u) => u.id === issue.reporterId) ?? null;
                return (
                  <button
                    key={issue.id}
                    onClick={() => onOpenIssue(issue)}
                    className="group flex w-full items-center gap-2.5 border-b border-line-soft px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-brand-50/40"
                  >
                    <IssueTypeIcon type={issue.type} size={16} />
                    <span className="w-[70px] shrink-0 text-[11.5px] font-medium text-ink-500 group-hover:text-brand-700">{issue.key}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-900">{issue.summary}</span>
                    <span className="hidden items-center gap-1 md:flex">{issue.labels.slice(0, 2).map((l) => <LabelChip key={l} label={l} />)}</span>
                    <PointsBadge points={issue.storyPoints} />
                    <PriorityIcon priority={issue.priority} size={15} />
                    <span className="hidden w-[86px] text-right text-[11.5px] text-ink-400 sm:block">{timeAgo(issue.updatedAt)}</span>
                    <span className="hidden" title={`Reporter: ${reporter?.name}`} />
                  </button>
                );
              })}
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <CheckCircle2 size={20} className="text-grn-500" />
              <p className="text-[13.5px] font-medium text-ink-700">All clear — nothing assigned to you</p>
              <p className="text-[12.5px] text-ink-400">Pick up work from the backlog when you're ready.</p>
            </div>
          )}
        </motion.section>

        {/* Right rail */}
        <div className="space-y-4">
          {activeSprint && (
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="rounded-lg border border-line-soft bg-gradient-to-br from-brand-50/60 to-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-ink-900">{activeSprint.name}</h3>
                <span className="rounded-full bg-brand-600 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-white">Active</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-[18px] text-ink-500">{activeSprint.goal}</p>
              <div className="mt-3 flex items-center justify-between text-[11.5px] font-medium text-ink-500">
                <span>{fmtDate(activeSprint.startDate)} – {fmtDate(activeSprint.endDate)}</span>
                <span>{daysLeft}d left</span>
              </div>
              <div className="mt-1.5 h-[8px] overflow-hidden rounded-full bg-white ring-1 ring-line-soft">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${sprintPts ? (sprintDonePts / sprintPts) * 100 : 0}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-grn-500 to-teal-500"
                />
              </div>
              <p className="mt-1.5 text-[11.5px] font-medium text-ink-500">
                {sprintDonePts}/{sprintPts} points done
              </p>
              <button onClick={() => onNavigate('board')} className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-white text-[12.5px] font-semibold text-ink-900 ring-1 ring-line transition-all hover:bg-surface hover:ring-ink-300">
                Open board
                <ArrowRight size={13} />
              </button>
            </motion.section>
          )}

          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden rounded-lg border border-line-soft bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-ink-900">Recently updated</h3>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-grn-700">
                <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-grn-500" />
                Live
              </span>
            </div>
            <ul>
              {recent.map((i) => (
                <li key={i.id}>
                  <button onClick={() => onOpenIssue(i)} className="flex w-full items-center gap-2 border-b border-line-soft px-4 py-2 text-left transition-colors last:border-b-0 hover:bg-surface">
                    <IssueTypeIcon type={i.type} size={14} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink-900">{i.summary}</span>
                      <span className="block text-[10.5px] text-ink-400">{i.key} · {timeAgo(i.updatedAt)}</span>
                    </span>
                    <StatusLozenge status={i.status} />
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
