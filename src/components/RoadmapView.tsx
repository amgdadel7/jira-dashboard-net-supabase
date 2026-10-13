import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Share2 } from 'lucide-react';
import type { Epic, Issue } from '../types';
import { StatusLozenge, IssueTypeIcon, PointsBadge } from './ui';
import { cn } from '../utils/cn';

const DAY = 86400000;
const PX_PER_DAY = 8;

export function RoadmapView({ epics, issues, onOpenIssue }: { epics: Epic[]; issues: Issue[]; onOpenIssue: (i: Issue) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [onlyUnplanned] = useState(false);

  const { t0, totalDays, months, weeks } = useMemo(() => {
    const starts = epics.map((e) => new Date(e.startDate).getTime());
    const ends = epics.map((e) => new Date(e.endDate).getTime());
    const min = new Date(Math.min(...starts));
    min.setDate(min.getDate() - 6);
    min.setHours(0, 0, 0, 0);
    const max = new Date(Math.max(...ends));
    max.setDate(max.getDate() + 10);
    const t0 = min.getTime();
    const totalDays = Math.ceil((max.getTime() - t0) / DAY);

    const months: { label: string; offset: number; days: number }[] = [];
    const cur = new Date(t0);
    cur.setDate(1);
    if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
    let prevStart = t0;
    while (cur.getTime() < max.getTime()) {
      const days = Math.round((cur.getTime() - prevStart) / DAY);
      const prevLabel = new Date(prevStart).toLocaleDateString('en-US', { month: 'short' });
      months.push({ label: prevLabel, offset: (prevStart - t0) / DAY, days });
      prevStart = cur.getTime();
      cur.setMonth(cur.getMonth() + 1);
    }
    months.push({
      label: new Date(prevStart).toLocaleDateString('en-US', { month: 'short' }),
      offset: (prevStart - t0) / DAY,
      days: Math.round((max.getTime() - prevStart) / DAY),
    });

    const weeks: { label: string; offset: number }[] = [];
    for (let d = 0; d < totalDays; d += 7) {
      weeks.push({ label: new Date(t0 + d * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), offset: d });
    }
    return { t0, totalDays, months, weeks };
  }, [epics]);

  const width = totalDays * PX_PER_DAY;
  const nowOffset = (Date.now() - t0) / DAY;

  const epicStats = useMemo(() => {
    const m = new Map<string, { total: number; done: number; pts: number }>();
    for (const e of epics) m.set(e.id, { total: 0, done: 0, pts: 0 });
    for (const i of issues) {
      if (!i.epicId || !m.has(i.epicId)) continue;
      const s = m.get(i.epicId)!;
      s.total += 1;
      s.pts += i.storyPoints ?? 0;
      if (i.status === 'done') s.done += 1;
    }
    return m;
  }, [epics, issues]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 px-6 pt-4">
        <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className="hover:text-brand-700 hover:underline">Projects</span>
          <span>/</span>
          <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Roadmap</h1>
          <div className="flex items-center gap-1.5">
            <button className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
              <Share2 size={14} className="text-ink-400" />
              Share
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-slim mt-4 flex-1 overflow-auto px-6 pb-8">
        <div className="min-w-max overflow-hidden rounded-lg border border-line-soft shadow-card">
          {/* Timeline grid */}
          <div className="flex">
            {/* Left column */}
            <div className="w-[280px] shrink-0 border-r border-line-soft bg-white">
              <div className="flex h-[61px] items-end justify-between border-b border-line-soft px-3 pb-2">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-ink-500">Epics</span>
                <button className="flex h-6 w-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-line-soft">
                  <Plus size={14} />
                </button>
              </div>
              {epics.map((epic) => {
                const stats = epicStats.get(epic.id)!;
                const childIssues = issues.filter((i) => i.epicId === epic.id);
                const open = expanded[epic.id] ?? false;
                return (
                  <React.Fragment key={epic.id}>
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [epic.id]: !open }))}
                      className="flex h-[52px] w-full items-center gap-2 border-b border-line-soft px-3 text-left transition-colors hover:bg-surface"
                    >
                      {open ? <ChevronDown size={14} className="shrink-0 text-ink-400" /> : <ChevronRight size={14} className="shrink-0 text-ink-400" />}
                      <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ backgroundColor: epic.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink-900">{epic.title}</span>
                        <span className="block text-[11px] text-ink-500">
                          {stats.done}/{stats.total} done · {stats.pts} pts
                        </span>
                      </span>
                    </button>
                    {open &&
                      childIssues.map((i) => (
                        <button
                          key={i.id}
                          onClick={() => onOpenIssue(i)}
                          className="flex h-[40px] w-full items-center gap-2 border-b border-line-soft bg-surface/60 px-3 pl-8 text-left transition-colors hover:bg-surface"
                        >
                          <IssueTypeIcon type={i.type} size={14} />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-700 hover:text-brand-700">{i.summary}</span>
                          <PointsBadge points={i.storyPoints} />
                        </button>
                      ))}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right timeline */}
            <div className="relative bg-white" style={{ width }}>
              {/* Month + week header */}
              <div className="sticky top-0 z-10 h-[61px] border-b border-line-soft bg-white">
                <div className="flex h-[32px] border-b border-line-soft">
                  {months.map((m, i) => (
                    <div key={i} className="flex items-center border-r border-line-soft px-2 text-[11.5px] font-semibold text-ink-700" style={{ width: m.days * PX_PER_DAY }}>
                      {m.label} 2026
                    </div>
                  ))}
                </div>
                <div className="flex h-[28px]">
                  {weeks.map((w, i) => (
                    <div key={i} className="flex items-center border-r border-line-soft px-1.5 text-[10.5px] text-ink-400" style={{ width: 7 * PX_PER_DAY }}>
                      {w.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Week vertical lines */}
              <div className="pointer-events-none absolute inset-x-0 top-[61px] bottom-0 z-0 flex">
                {weeks.map((_, i) => (
                  <div key={i} className="h-full border-r border-line-soft/60" style={{ width: 7 * PX_PER_DAY }} />
                ))}
              </div>

              {/* Today line */}
              {nowOffset > 0 && nowOffset < totalDays && (
                <div className="pointer-events-none absolute top-[61px] bottom-0 z-10" style={{ left: nowOffset * PX_PER_DAY }}>
                  <div className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-full bg-red-500 shadow" />
                  <div className="h-full w-[2px] bg-red-500/80" />
                </div>
              )}

              {/* Epic rows */}
              {epics.map((epic, rowIdx) => {
                const stats = epicStats.get(epic.id)!;
                const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
                const left = ((new Date(epic.startDate).getTime() - t0) / DAY) * PX_PER_DAY;
                const w = ((new Date(epic.endDate).getTime() - new Date(epic.startDate).getTime()) / DAY) * PX_PER_DAY;
                const open = expanded[epic.id] ?? false;
                const childIssues = issues.filter((i) => i.epicId === epic.id);
                return (
                  <React.Fragment key={epic.id}>
                    <div className={cn('relative z-[1] flex h-[52px] items-center border-b border-line-soft', open && 'bg-surface/40')}>
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0.6 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: 0.15 + rowIdx * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{ left, width: w, transformOrigin: 'left' }}
                        className="group absolute h-[30px] cursor-pointer"
                      >
                        <div
                          className="relative h-full overflow-hidden rounded-[7px] shadow-sm transition-transform duration-200 group-hover:scale-y-110"
                          style={{ background: `linear-gradient(180deg, ${epic.color}cc, ${epic.color})` }}
                        >
                          <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${pct}%` }} />
                          <span className="absolute inset-0 flex items-center justify-between px-2.5 text-[11.5px] font-semibold text-white">
                            <span className="truncate drop-shadow-sm">{epic.title}</span>
                            {stats.total > 0 && <span className="ml-2 shrink-0 rounded-full bg-black/20 px-1.5 py-[1px] text-[10px]">{pct}%</span>}
                          </span>
                        </div>
                        {/* date handles */}
                        <span className="absolute -left-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow ring-1 ring-line transition-opacity group-hover:opacity-100" />
                        <span className="absolute -right-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow ring-1 ring-line transition-opacity group-hover:opacity-100" />
                      </motion.div>
                    </div>
                    {open &&
                      childIssues.map((i) => {
                        const cLeft = Math.max(4, ((new Date(i.createdAt).getTime() - t0) / DAY) * PX_PER_DAY);
                        const cWidth = Math.max(70, ((new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / DAY) * PX_PER_DAY + 60);
                        const color = i.status === 'done' ? '#22A06B' : i.status === 'inprogress' ? '#0C66E4' : i.status === 'inreview' ? '#8270DB' : '#8c9bab';
                        return (
                          <div key={i.id} className="relative z-[1] flex h-[40px] items-center border-b border-line-soft bg-surface/60">
                            <div className="absolute h-[14px] rounded-full opacity-70" style={{ left: cLeft, width: cWidth, backgroundColor: `${color}30` }}>
                              <div className="h-full rounded-full" style={{ width: i.status === 'done' ? '100%' : i.status === 'todo' ? '12%' : '55%', backgroundColor: color }} />
                            </div>
                            <StatusLozenge status={i.status} className="absolute right-2" />
                          </div>
                        );
                      })}
                  </React.Fragment>
                );
              })}

              {onlyUnplanned && <div className="h-10" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
