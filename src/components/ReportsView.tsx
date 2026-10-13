import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ChevronDown, Gauge, ListChecks, TrendingDown } from 'lucide-react';
import { notify } from '../utils/toastBus';
import type { Issue, Priority, Sprint } from '../types';
import { PRIORITY_ORDER } from '../types';
import { fmtDate } from './ui';
import { cn } from '../utils/cn';

const COLORS = {
  blue: '#0C66E4',
  green: '#22A06B',
  gray: '#8c9bab',
  dark: '#44546f',
  purple: '#8270DB',
  red: '#E34935',
  orange: '#E56910',
  teal: '#2898BD',
};

export function ReportsView({ sprint, sprints, issues }: { sprint: Sprint; sprints: Sprint[]; issues: Issue[] }) {
  const [selectedId, setSelectedId] = useState(sprint.id);
  const selected = sprints.find((s) => s.id === selectedId) ?? sprint;
  const sprintIssues = useMemo(() => issues.filter((i) => i.sprintId === selected.id), [issues, selected.id]);
  const committed = sprintIssues.reduce((a, i) => a + (i.storyPoints ?? 0), 0);
  const donePts = sprintIssues.filter((i) => i.status === 'done').reduce((a, i) => a + (i.storyPoints ?? 0), 0);
  const pct = committed ? Math.round((donePts / committed) * 100) : 0;

  const burndown = useMemo(() => {
    const days: string[] = [];
    const d = new Date(selected.startDate);
    const end = new Date(selected.endDate);
    while (d <= end) {
      days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      d.setDate(d.getDate() + 1);
    }
    const n = days.length;
    // deterministic pseudo-random burn using sin waves
    const remaining = days.map((_, i) => {
      const progress = i / (n - 1);
      const noise = Math.sin(i * 2.7) * 3 + Math.sin(i * 1.3 + 2) * 2;
      const base = committed * (1 - Math.min(1, progress * 1.05));
      return Math.max(donePts === committed ? 0 : 4, Math.round(base + noise * (1 - progress)));
    });
    remaining[0] = committed;
    return days.map((day, i) => ({
      day,
      ideal: Math.round(committed * (1 - i / (n - 1))),
      remaining: remaining[i],
    }));
  }, [selected, committed, donePts]);

  const velocity = useMemo(() => {
    const base = [
      { sprint: 'S10', committed: 38, completed: 31 },
      { sprint: 'S11', committed: 42, completed: 39 },
      { sprint: 'S12', committed: 40, completed: 36 },
      { sprint: 'S13', committed: 44, completed: 41 },
      { sprint: selected.name.replace('Sprint ', 'S'), committed, completed: donePts },
    ];
    return base;
  }, [committed, donePts, selected.name]);

  const cumulative = useMemo(() => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const p = i / 9;
      const total = committed;
      const done = Math.round(total * Math.pow(p, 1.6) * 0.85);
      const inprog = Math.round(Math.sin(p * Math.PI) * total * 0.28) + 4;
      rows.push({
        day: `D${i + 1}`,
        done,
        inprogress: inprog,
        review: Math.round(Math.sin(p * 5) * 2 + 3),
        todo: Math.max(0, total - done - inprog - 6),
      });
    }
    return rows;
  }, [committed]);

  const typeData = useMemo(() => {
    const t = { story: 0, task: 0, bug: 0 };
    sprintIssues.forEach((i) => {
      if (i.type in t) t[i.type as keyof typeof t] += 1;
    });
    return [
      { name: 'Stories', value: t.story, color: COLORS.green },
      { name: 'Tasks', value: t.task, color: COLORS.blue },
      { name: 'Bugs', value: t.bug, color: COLORS.red },
    ];
  }, [sprintIssues]);

  const priorityData = useMemo(() => {
    const counts: Record<Priority, number> = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0 };
    sprintIssues.forEach((i) => (counts[i.priority] += 1));
    return PRIORITY_ORDER.map((p) => ({ p, count: counts[p] }));
  }, [sprintIssues]);

  const maxPriority = Math.max(1, ...priorityData.map((p) => p.count));

  const exportCsv = (name: string, rows: Record<string, string | number | null>[]) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: string | number | null) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    notify('Report exported', `${name} · ${rows.length} rows`);
  };

  return (
    <div className="scroll-slim h-full overflow-y-auto bg-white px-6 pb-16 pt-4">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-500">
        <span className="hover:text-brand-700 hover:underline">Projects</span>
        <span>/</span>
        <span className="hover:text-brand-700 hover:underline">Atlas Platform</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-ink-900">Reports</h1>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-8 appearance-none rounded-md border border-line bg-white pl-3 pr-8 text-[13px] font-medium text-ink-700 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {fmtDate(s.startDate)} – {fmtDate(s.endDate)}{s.state === 'active' ? ' (active)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={Gauge} tint="bg-brand-50 text-brand-700" label="Sprint progress" value={`${pct}%`} sub={`${donePts} of ${committed} pts`} delta={pct >= 40 ? '+6% vs plan' : '-4% vs plan'} good={pct >= 40} delay={0} />
        <Kpi icon={ListChecks} tint="bg-grn-100 text-grn-700" label="Issues completed" value={String(sprintIssues.filter((i) => i.status === 'done').length)} sub={`of ${sprintIssues.length} committed`} delta="On track" good delay={0.05} />
        <Kpi icon={TrendingDown} tint="bg-org-100 text-org-700" label="Scope change" value="+6 pts" sub="3 issues added" delta="Since sprint start" good={false} delay={0.1} />
        <Kpi icon={Activity} tint="bg-pur-100 text-pur-600" label="Avg cycle time" value="3.2d" sub="todo → done" delta="−0.4d vs S13" good delay={0.15} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* Burndown */}
        <ChartCard
          title="Sprint burndown"
          sub="Story points remaining vs ideal pace"
          delay={0.1}
          onExport={() => exportCsv(`burndown-${selected.name.replace(/\s+/g, '-').toLowerCase()}.csv`, burndown)}
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={burndown} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="burn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f2f4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={{ stroke: '#e9ebee' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine x={burndown[3]?.day} stroke={COLORS.red} strokeDasharray="4 4" label={{ value: 'TODAY', position: 'insideTopRight', fontSize: 9, fill: COLORS.red, fontWeight: 700 }} />
              <Area type="monotone" dataKey="ideal" stroke={COLORS.gray} strokeDasharray="6 5" strokeWidth={1.6} fill="none" name="Ideal" />
              <Area type="monotone" dataKey="remaining" stroke={COLORS.blue} strokeWidth={2.2} fill="url(#burn)" name="Remaining" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Velocity */}
        <ChartCard
          title="Velocity"
          sub="Commitment vs completed per sprint"
          delay={0.15}
          onExport={() => exportCsv('velocity.csv', velocity.map((v) => ({ sprint: v.sprint, committed: v.committed, completed: v.completed })))}
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={velocity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={3}>
              <CartesianGrid stroke="#f1f2f4" vertical={false} />
              <XAxis dataKey="sprint" tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={{ stroke: '#e9ebee' }} />
              <YAxis tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(9,30,66,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 11.5 }} iconType="circle" iconSize={7} />
              <Bar dataKey="committed" name="Commitment" fill="#c1c7d0" radius={[3, 3, 0, 0]} maxBarSize={26} />
              <Bar dataKey="completed" name="Completed" fill={COLORS.green} radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cumulative flow */}
        <ChartCard
          title="Cumulative flow"
          sub="Issue count by status across the sprint"
          delay={0.2}
          onExport={() => exportCsv('cumulative-flow.csv', cumulative)}
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cumulative} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} stackOffset="none">
              <CartesianGrid stroke="#f1f2f4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={{ stroke: '#e9ebee' }} />
              <YAxis tick={{ fontSize: 10.5, fill: '#626f86' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area stackId="1" type="monotone" dataKey="done" name="Done" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.75} />
              <Area stackId="1" type="monotone" dataKey="review" name="In review" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.65} />
              <Area stackId="1" type="monotone" dataKey="inprogress" name="In progress" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.6} />
              <Area stackId="1" type="monotone" dataKey="todo" name="To do" stroke={COLORS.gray} fill={COLORS.gray} fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribution */}
        <ChartCard
          title="Issue breakdown"
          sub="By type and priority — current sprint"
          delay={0.25}
          onExport={() =>
            exportCsv('issue-breakdown.csv', [
              ...typeData.map((t) => ({ dimension: 'type', label: t.name, count: t.value })),
              ...priorityData.map((p) => ({ dimension: 'priority', label: p.p, count: p.count })),
            ])
          }
        >
          <div className="flex items-center gap-4">
            <div className="relative h-[190px] w-[190px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={3} cornerRadius={4} strokeWidth={0}>
                    {typeData.map((t) => (
                      <Cell key={t.name} fill={t.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-bold text-ink-900">{sprintIssues.length}</span>
                <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-500">issues</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {typeData.map((t) => (
                <div key={t.name} className="flex items-center gap-2 text-[12.5px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="flex-1 text-ink-700">{t.name}</span>
                  <span className="font-semibold text-ink-900">{t.value}</span>
                </div>
              ))}
              <div className="my-2 h-px bg-line-soft" />
              {priorityData.map(({ p, count }) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-[62px] text-[12px] capitalize text-ink-500">{p}</span>
                  <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-col">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxPriority) * 100}%` }}
                      transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className={cn('h-full rounded-full', p === 'highest' || p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-org-500' : 'bg-brand-500')}
                    />
                  </div>
                  <span className="w-4 text-right text-[12px] font-semibold text-ink-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, tint, label, value, sub, delta, good, delay }: { icon: React.ElementType; tint: string; label: string; value: string; sub: string; delta: string; good: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-line-soft bg-white p-4 shadow-card"
    >
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', tint)}>
          <Icon size={15} />
        </span>
        <span className="text-[12px] font-medium text-ink-500">{label}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[24px] font-bold tracking-[-0.02em] text-ink-900">{value}</span>
        <span className="text-[11.5px] text-ink-500">{sub}</span>
      </div>
      <p className={cn('mt-1 text-[11.5px] font-medium', good ? 'text-grn-700' : 'text-org-700')}>{delta}</p>
    </motion.div>
  );
}

function ChartCard({ title, sub, children, delay, onExport }: { title: string; sub: string; children: React.ReactNode; delay: number; onExport?: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-lg border border-line-soft bg-white p-4 shadow-card"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
          <p className="text-[12px] text-ink-500">{sub}</p>
        </div>
        {onExport && (
          <button onClick={onExport} className="rounded-md px-2 py-1 text-[11.5px] font-medium text-ink-400 transition-colors hover:bg-surface hover:text-ink-700">
            Export
          </button>
        )}
      </div>
      {children}
    </motion.section>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-soft bg-white px-3 py-2 shadow-overlay">
      {label && <p className="mb-1 text-[11px] font-semibold text-ink-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-[11.5px] text-ink-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? '#0C66E4' }} />
          {p.name}: <span className="font-semibold text-ink-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}
