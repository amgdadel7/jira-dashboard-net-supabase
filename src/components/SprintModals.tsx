import { useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, CircleDot, Flag } from 'lucide-react';
import type { Issue, Sprint } from '../types';
import { Field, IssueTypeIcon, Modal, PointsBadge, fmtDate } from './ui';
import { cn } from '../utils/cn';

/* =========================== Start sprint modal ========================= */

export interface StartSprintPatch {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

interface StartProps {
  sprint: Sprint;
  issueCount: number;
  onClose: () => void;
  onConfirm: (sprintId: string, patch: StartSprintPatch) => void;
}

export function StartSprintModal({ sprint, issueCount, onClose, onConfirm }: StartProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(sprint.name);
  const [duration, setDuration] = useState(2);
  const [startDate, setStartDate] = useState(today);
  const [goal, setGoal] = useState(sprint.goal);

  const end = new Date(startDate);
  end.setDate(end.getDate() + duration * 7 - 1);
  const endDate = end.toISOString().slice(0, 10);

  return (
    <Modal open onClose={onClose}>
      <div className="px-6 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-org-100 text-org-500">
            <Flag size={17} />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink-900">Start sprint</h2>
            <p className="text-[12.5px] text-ink-500">{issueCount} issue{issueCount === 1 ? '' : 's'} will be included in this sprint</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Sprint name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-2.5 py-[7px] text-[13.5px] text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration">
              <div className="relative">
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-[34px] w-full appearance-none rounded-md border border-line bg-white px-2.5 pr-7 text-[13.5px] text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                >
                  {[1, 2, 3, 4].map((w) => (
                    <option key={w} value={w}>
                      {w} week{w > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              </div>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-[34px] w-full rounded-md border border-line bg-white px-2.5 text-[13.5px] text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-[12.5px] text-ink-700">
            <CalendarDays size={14} className="text-ink-400" />
            {fmtDate(startDate)} → {fmtDate(endDate)}
          </div>

          <Field label="Sprint goal" optional>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="What should the team achieve?"
              className="w-full resize-none rounded-md border border-line bg-white px-2.5 py-[7px] text-[13.5px] text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-line-soft px-6 py-3.5">
        <button onClick={onClose} className="h-8 rounded-md px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
          Cancel
        </button>
        <button
          onClick={() => name.trim() && onConfirm(sprint.id, { name: name.trim(), goal: goal.trim(), startDate, endDate })}
          disabled={!name.trim()}
          className={cn(
            'h-8 rounded-md px-4 text-[13px] font-semibold text-white shadow-sm transition-all',
            name.trim() ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98]' : 'cursor-not-allowed bg-ink-300',
          )}
        >
          Start
        </button>
      </div>
    </Modal>
  );
}

interface Props {
  sprint: Sprint;
  issues: Issue[];
  nextSprint: Sprint | null;
  onClose: () => void;
  onConfirm: (moveToSprintId: string | null) => void;
}

export function CompleteSprintModal({ sprint, issues, nextSprint, onClose, onConfirm }: Props) {
  const done = issues.filter((i) => i.status === 'done');
  const open = issues.filter((i) => i.status !== 'done');
  const [moveTo, setMoveTo] = useState<string>(nextSprint?.id ?? 'backlog');

  return (
    <Modal open onClose={onClose}>
      <div className="px-6 pt-6">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-ink-900">Complete {sprint.name}</h2>
        <p className="mt-1 text-[13px] text-ink-500">This sprint contains:</p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2.5 rounded-md border border-grn-500/25 bg-grn-100/60 px-3 py-2.5">
            <CheckCircle2 size={16} className="shrink-0 text-grn-500" />
            <span className="text-[13.5px] font-medium text-grn-700">
              {done.length} completed issue{done.length === 1 ? '' : 's'}
              <span className="ml-1.5 text-[12px] font-normal text-grn-700/70">
                · {done.reduce((a, i) => a + (i.storyPoints ?? 0), 0)} pts
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-md border border-org-500/25 bg-org-100/60 px-3 py-2.5">
            <CircleDot size={16} className="shrink-0 text-org-500" />
            <span className="text-[13.5px] font-medium text-org-700">
              {open.length} open issue{open.length === 1 ? '' : 's'}
              <span className="ml-1.5 text-[12px] font-normal text-org-700/70">
                · {open.reduce((a, i) => a + (i.storyPoints ?? 0), 0)} pts
              </span>
            </span>
          </div>
        </div>

        {open.length > 0 && (
          <>
            <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.05em] text-ink-500">Move open issues to</p>
            <div className="relative mt-2">
              <select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-line bg-white px-3 pr-8 text-[13.5px] font-medium text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                {nextSprint && <option value={nextSprint.id}>{nextSprint.name}</option>}
                <option value="backlog">Backlog</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            </div>

            <div className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-md bg-surface p-2 scroll-slim">
              {open.map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded px-2 py-1">
                  <IssueTypeIcon type={i.type} size={14} />
                  <span className="text-[11px] font-medium text-ink-400">{i.key}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-700">{i.summary}</span>
                  <PointsBadge points={i.storyPoints} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-line-soft px-6 py-3.5">
        <button onClick={onClose} className="h-8 rounded-md px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(moveTo === 'backlog' ? null : moveTo)}
          className={cn('h-8 rounded-md bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]')}
        >
          Complete sprint
        </button>
      </div>
    </Modal>
  );
}
