import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Eye, Link2, Lock, MessageSquare, MoreHorizontal, Plus, Send, Trash2 } from 'lucide-react';
import type { CreateIssueInput, Epic, Issue, IssueType, Priority, Sprint, Status, User } from '../types';
import { PRIORITY_ORDER } from '../types';
import {
  Avatar,
  Field,
  IssueTypeIcon,
  LabelChip,
  Modal,
  ModalClose,
  PRIORITY_LABEL,
  PriorityIcon,
  StatusLozenge,
  TYPE_LABEL,
  fmtDate,
  timeAgo,
} from './ui';
import { cn } from '../utils/cn';
import { notify } from '../utils/toastBus';

/* ============================ Generic dropdown =========================== */

interface DOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}

function Dropdown<T>({
  options,
  value,
  onChange,
  trigger,
  panelClassName,
}: {
  options: DOption<T>[];
  value: T;
  onChange: (v: T) => void;
  trigger: React.ReactNode;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left">
        {trigger}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.14 }}
          className={cn('absolute z-30 mt-1 max-h-64 w-full min-w-[190px] overflow-y-auto rounded-lg border border-line-soft bg-white py-1 shadow-overlay', panelClassName)}
        >
          {options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] text-ink-900 transition-colors hover:bg-brand-50"
            >
              {o.icon}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.hint && <span className="text-[11px] text-ink-400">{o.hint}</span>}
              {o.value === value && <Check size={14} className="shrink-0 text-brand-600" />}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-line bg-white px-2.5 py-[7px] text-[13.5px] text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:bg-surface focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100';

const dropdownTriggerCls =
  'flex w-full items-center justify-between gap-2 rounded-md border border-transparent bg-surface px-2.5 py-[7px] text-[13.5px] text-ink-900 transition-all hover:bg-col-hover';

/* ============================ Issue detail modal ======================== */

interface DetailProps {
  issue: Issue;
  users: User[];
  sprints: Sprint[];
  epics: Epic[];
  onClose: () => void;
  onUpdate: (issueId: string, patch: Partial<Issue>) => void;
  onAddComment: (issueId: string, body: string) => void;
  onDelete: (issueId: string) => void;
}

export function IssueDetailModal({ issue, users, sprints, epics, onClose, onUpdate, onAddComment, onDelete }: DetailProps) {
  const [summary, setSummary] = useState(issue.summary);
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState<'comments' | 'history'>('comments');
  const [mentionQ, setMentionQ] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [watching, setWatching] = useState(() => {
    try {
      return localStorage.getItem(`nexus:watch:${issue.key}`) === '1';
    } catch {
      return false;
    }
  });
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSummary(issue.summary), [issue.id, issue.summary]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  /* Timeline reconstructed from the issue's lifecycle (Jira-style History). */
  const history = useMemo(() => {
    const created = Date.parse(issue.createdAt);
    const updated = Date.parse(issue.updatedAt);
    const span = Math.max(updated - created, 1);
    const at = (f: number) => new Date(created + span * f).toISOString();
    const actor = issue.assigneeId ?? issue.reporterId;
    const events: { icon: React.ElementType; tint: string; text: string; userId: string; at: string }[] = [
      { icon: ArrowRight, tint: 'bg-grn-100 text-grn-700', text: 'created the issue', userId: issue.reporterId, at: issue.createdAt },
    ];
    if (issue.status !== 'todo') events.push({ icon: ArrowRight, tint: 'bg-brand-50 text-brand-700', text: 'moved the issue to In Progress', userId: actor, at: at(0.5) });
    if (issue.status === 'inreview' || issue.status === 'done') events.push({ icon: Eye, tint: 'bg-pur-100 text-pur-600', text: 'moved the issue to In Review', userId: actor, at: at(0.75) });
    if (issue.status === 'done') events.push({ icon: CheckCircle2, tint: 'bg-grn-100 text-grn-700', text: 'marked the issue as Done', userId: actor, at: issue.updatedAt });
    return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [issue]);

  const assignee = users.find((u) => u.id === issue.assigneeId) ?? null;
  const reporter = users.find((u) => u.id === issue.reporterId) ?? null;
  const epic = epics.find((e) => e.id === issue.epicId);

  const userOptions: DOption<string | null>[] = [
    { value: null, label: 'Unassigned', icon: <Avatar user={null} size={20} ring={false} /> },
    ...users.map((u) => ({ value: u.id as string | null, label: u.name, icon: <Avatar user={u} size={20} ring={false} />, hint: u.role.split(' ')[0] })),
  ];

  const statusOptions: DOption<Status>[] = (['todo', 'inprogress', 'inreview', 'done'] as Status[]).map((s) => ({
    value: s,
    label: { todo: 'To Do', inprogress: 'In Progress', inreview: 'In Review', done: 'Done' }[s],
    icon: <StatusLozenge status={s} label="" className="!px-1 !py-0.5" />,
  }));

  return (
    <Modal open onClose={onClose} wide>
      <div className="flex max-h-[86vh] flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3">
          {epic && (
            <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-[2px] text-[11px] font-semibold text-white" style={{ backgroundColor: epic.color }}>
              <IssueTypeIcon type="epic" size={11} />
              {epic.title}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-700">
            <IssueTypeIcon type={issue.type} size={15} />
            {issue.key}
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}/browse/${issue.key}`).catch(() => {});
                notify('Link copied', `/browse/${issue.key}`);
              }}
              className="text-ink-400 transition-colors hover:text-ink-900"
              title="Copy link"
            >
              <Link2 size={13} />
            </button>
          </span>
          <div className="flex-1" />
          <button
            onClick={() => {
              setRestricted((r) => {
                notify(r ? 'Restriction removed' : 'Issue restricted', r ? `${issue.key} is visible to the whole team` : `${issue.key} is now visible to admins only`);
                return !r;
              });
            }}
            className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-line-soft', restricted ? 'text-red-500' : 'text-ink-500')}
            title={restricted ? 'Remove restriction' : 'Restrict issue'}
          >
            <Lock size={14} />
          </button>
          <div ref={moreRef} className="relative">
            <button onClick={() => setMoreOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft" title="Actions">
              <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.13 }}
                className="absolute right-0 z-40 mt-1 w-[200px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay"
              >
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(issue.key).catch(() => {});
                    setMoreOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                >
                  Copy issue key
                </button>
                <button
                  onClick={() => {
                    setWatching((w) => {
                      const next = !w;
                      try {
                        localStorage.setItem(`nexus:watch:${issue.key}`, next ? '1' : '0');
                      } catch { /* ignore */ }
                      notify(next ? `Watching ${issue.key}` : `Stopped watching ${issue.key}`, next ? 'You will be notified of every change' : 'No more notifications for this issue');
                      return next;
                    });
                    setMoreOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                >
                  {watching ? 'Watching' : 'Watch this issue'}
                  {watching && <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700">On</span>}
                </button>
                <div className="my-1 h-px bg-line-soft" />
                <button
                  onClick={() => onDelete(issue.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100/60"
                >
                  <Trash2 size={14} />
                  Delete issue
                </button>
              </motion.div>
            )}
          </div>
          <ModalClose onClose={onClose} />
        </div>

        <div className="scroll-slim flex min-h-0 flex-1 overflow-y-auto">
          {/* Main */}
          <div className="min-w-0 flex-1 px-7 py-5">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => summary.trim() && summary !== issue.summary && onUpdate(issue.id, { summary: summary.trim() })}
              className="-mx-2 w-[calc(100%+16px)] rounded-md border border-transparent bg-transparent px-2 py-1 text-[20px] font-medium tracking-[-0.01em] text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />

            <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.05em] text-ink-500">Description</p>
            <p className="mt-2 whitespace-pre-line text-[14px] leading-[22px] text-ink-800">{issue.description || 'Add a description…'}</p>

            <Checklist issueId={issue.id} />

            {/* Activity tabs */}
            <div className="mt-8 flex items-center gap-1 border-b border-line-soft">
              {(['comments', 'history'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 pb-2 text-[12px] font-bold uppercase tracking-[0.05em] transition-colors',
                    tab === t ? 'text-brand-700' : 'text-ink-400 hover:text-ink-700',
                  )}
                >
                  {t === 'comments' ? <MessageSquare size={13} /> : null}
                  {t === 'comments' ? `Comments` : 'History'}
                  {t === 'comments' && (
                    <span className="rounded-full bg-col px-1.5 py-[1px] text-[11px] font-semibold text-ink-700">{issue.comments.length}</span>
                  )}
                  {tab === t && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600" />}
                </button>
              ))}
            </div>

            {tab === 'comments' && (
              <>
                {/* comment input with @mentions */}
                <div className="mt-3 flex gap-2.5">
                  <Avatar user={users.find((u) => u.id === issue.reporterId)} size={28} ring={false} />
                  <div className="relative flex-1">
                    <textarea
                      value={comment}
                      onChange={(e) => {
                        const v = e.target.value;
                        setComment(v);
                        const upto = v.slice(0, e.target.selectionStart ?? v.length);
                        const m = upto.match(/@([\w][\w-]*)?$/);
                        setMentionQ(m ? (m[1] ?? '') : null);
                      }}
                      onBlur={() => setTimeout(() => setMentionQ(null), 150)}
                      placeholder="Add a comment… type @ to mention"
                      rows={2}
                      className={cn(inputCls, 'resize-none text-[13px]')}
                    />
                    {mentionQ !== null && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full z-30 mb-1 w-[220px] overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay"
                      >
                        {users
                          .filter((u) => u.name.toLowerCase().includes(mentionQ.toLowerCase()))
                          .map((u) => (
                            <button
                              key={u.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setComment((cur) => cur.replace(/@[\w-]*$/, `@${u.name} `));
                                setMentionQ(null);
                              }}
                              className="flex w-full items-center gap-2 px-2.5 py-[7px] text-left text-[13px] text-ink-900 transition-colors hover:bg-brand-50"
                            >
                              <Avatar user={u} size={20} ring={false} />
                              <span className="font-medium">{u.name}</span>
                              <span className="ml-auto text-[11px] text-ink-400">{u.role.split(' ')[0]}</span>
                            </button>
                          ))}
                        {users.filter((u) => u.name.toLowerCase().includes(mentionQ.toLowerCase())).length === 0 && (
                          <p className="px-3 py-2 text-[12px] text-ink-400">No people match “{mentionQ}”</p>
                        )}
                      </motion.div>
                    )}
                    {comment.trim() && (
                      <button
                        onClick={() => {
                          onAddComment(issue.id, comment.trim());
                          setComment('');
                          setMentionQ(null);
                        }}
                        className="mt-2 flex h-7 items-center gap-1.5 rounded-md bg-brand-600 px-2.5 text-[12.5px] font-semibold text-white transition-all hover:bg-brand-700"
                      >
                        <Send size={12} />
                        Comment
                      </button>
                    )}
                  </div>
                </div>

                {/* comments */}
                <div className="mt-4 space-y-4 pb-8">
                  {[...issue.comments].reverse().map((c) => {
                    const author = users.find((u) => u.id === c.authorId) ?? null;
                    return (
                      <div key={c.id} className="flex gap-2.5 rounded-md p-2 -mx-2 transition-colors hover:bg-surface/70">
                        <button
                          onClick={() => notify('Profile', author?.name ?? 'Unknown author')}
                          className="shrink-0 pt-0.5 transition-transform hover:scale-105"
                        >
                          <Avatar user={author} size={28} ring={false} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline gap-2">
                            <button
                              onClick={() => notify('Profile', author?.name ?? 'Unknown author')}
                              className="text-[13px] font-semibold text-ink-900 transition-colors hover:text-brand-700 hover:underline"
                            >
                              {author?.name ?? 'Unknown'}
                            </button>
                            <span className="text-[11.5px] text-ink-400">{timeAgo(c.createdAt)}</span>
                          </p>
                          <p className="mt-0.5 text-[13.5px] leading-[20px] text-ink-800">{c.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  {issue.comments.length === 0 && <p className="text-[12.5px] text-ink-400">No comments yet — start the conversation.</p>}
                </div>
              </>
            )}

            {tab === 'history' && (
              <div className="relative mt-4 space-y-0.5 pb-8 pl-1">
                <span className="absolute bottom-4 left-[13px] top-2 w-px bg-line-soft" />
                {history.map((ev, i) => {
                  const actor = users.find((u) => u.id === ev.userId) ?? null;
                  return (
                    <div key={i} className="relative flex items-start gap-3 py-2">
                      <span className={cn('z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white', ev.tint)}>
                        <ev.icon size={12} />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] text-ink-800">
                          <span className="font-semibold text-ink-900">{actor?.name ?? 'Unknown'}</span> {ev.text}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-400">{timeAgo(ev.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-[290px] shrink-0 space-y-4 border-l border-line-soft px-5 py-5">
            <Dropdown
              options={statusOptions}
              value={issue.status}
              onChange={(s) => onUpdate(issue.id, { status: s })}
              trigger={
                <span className="flex w-full items-center justify-between rounded-md bg-surface px-2 py-1.5 transition-colors hover:bg-col-hover">
                  <StatusLozenge status={issue.status} />
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />

            <div className="rounded-lg border border-line-soft">
              <p className="border-b border-line-soft px-3 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-ink-500">Details</p>
              <dl className="space-y-3 px-3 py-3">
                <div>
                  <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Assignee</dt>
                  <dd>
                    <Dropdown
                      options={userOptions}
                      value={issue.assigneeId}
                      onChange={(v) => onUpdate(issue.id, { assigneeId: v })}
                      trigger={
                        <span className={cn(dropdownTriggerCls, 'bg-transparent')}>
                          <span className="flex items-center gap-2">
                            <Avatar user={assignee} size={20} ring={false} />
                            <span className="text-[13px]">{assignee?.name ?? 'Unassigned'}</span>
                          </span>
                          <ChevronDown size={13} className="text-ink-400" />
                        </span>
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Reporter</dt>
                  <dd className="flex items-center gap-2 px-1">
                    <Avatar user={reporter} size={20} ring={false} />
                    <span className="text-[13px] text-ink-900">{reporter?.name}</span>
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Priority</dt>
                  <dd>
                    <Dropdown
                      options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} size={15} /> }))}
                      value={issue.priority}
                      onChange={(p) => onUpdate(issue.id, { priority: p })}
                      trigger={
                        <span className={cn(dropdownTriggerCls, 'bg-transparent')}>
                          <span className="flex items-center gap-2 text-[13px]">
                            <PriorityIcon priority={issue.priority} size={15} />
                            {PRIORITY_LABEL[issue.priority]}
                          </span>
                          <ChevronDown size={13} className="text-ink-400" />
                        </span>
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Story points</dt>
                  <dd>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={issue.storyPoints ?? ''}
                      onBlur={(e) => onUpdate(issue.id, { storyPoints: e.target.value === '' ? null : Number(e.target.value) })}
                      className={cn(inputCls, 'border-transparent bg-transparent py-1')}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Sprint</dt>
                  <dd>
                    <Dropdown
                      options={[
                        { value: null as string | null, label: 'Backlog', hint: 'unplanned' },
                        ...sprints.map((s) => ({ value: s.id as string | null, label: s.name, hint: s.state })),
                      ]}
                      value={issue.sprintId}
                      onChange={(v) => onUpdate(issue.id, { sprintId: v })}
                      trigger={
                        <span className={cn(dropdownTriggerCls, 'bg-transparent')}>
                          <span className="text-[13px]">{sprints.find((s) => s.id === issue.sprintId)?.name ?? 'Backlog'}</span>
                          <ChevronDown size={13} className="text-ink-400" />
                        </span>
                      }
                    />
                  </dd>
                </div>
                {issue.labels.length > 0 && (
                  <div>
                    <dt className="mb-1 text-[11.5px] font-semibold text-ink-500">Labels</dt>
                    <dd className="flex flex-wrap gap-1">
                      {issue.labels.map((l) => (
                        <LabelChip key={l} label={l} />
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="text-[11.5px] leading-[18px] text-ink-400">
              <p>Created {fmtDate(issue.createdAt)}</p>
              <p>Updated {timeAgo(issue.updatedAt)}</p>
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ Create issue modal ======================== */

interface CreateProps {
  defaultStatus: Status;
  defaultSprintId: string | null;
  activeSprintId: string | null;
  users: User[];
  sprints: Sprint[];
  epics: Epic[];
  onClose: () => void;
  onCreate: (input: CreateIssueInput) => void;
}

export function CreateIssueModal({ defaultStatus, defaultSprintId, activeSprintId, users, sprints, epics, onClose, onCreate }: CreateProps) {
  const [type, setType] = useState<IssueType>('story');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [priority, setPriority] = useState<Priority>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(defaultSprintId ?? activeSprintId);
  const [epicId, setEpicId] = useState<string | null>(null);
  const [storyPoints, setStoryPoints] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [description, setDescription] = useState('');

  const addLabel = () => {
    const v = labelDraft.trim().replace(/,+$/, '').toLowerCase();
    if (v && !labels.includes(v)) setLabels((l) => [...l, v]);
    setLabelDraft('');
  };

  const submit = () => {
    if (!summary.trim()) return;
    onCreate({
      summary: summary.trim(),
      type,
      status,
      priority,
      assigneeId,
      sprintId,
      epicId,
      labels,
      description,
      storyPoints: storyPoints === '' ? null : Number(storyPoints),
    });
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold text-ink-900">Create issue</h2>
          <span className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-[11.5px] font-semibold text-ink-700">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-gradient-to-br from-brand-500 to-brand-800">
              <svg viewBox="0 0 32 32" width="9" height="9"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
            </span>
            ATL
          </span>
        </div>
        <ModalClose onClose={onClose} />
      </div>

      <div className="scroll-slim max-h-[62vh] space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Issue type">
            <Dropdown
              options={(['story', 'task', 'bug'] as IssueType[]).map((t) => ({ value: t, label: TYPE_LABEL[t], icon: <IssueTypeIcon type={t} size={16} /> }))}
              value={type}
              onChange={setType}
              trigger={
                <span className={dropdownTriggerCls}>
                  <span className="flex items-center gap-2">
                    <IssueTypeIcon type={type} size={16} />
                    {TYPE_LABEL[type]}
                  </span>
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />
          </Field>
          <Field label="Status">
            <Dropdown
              options={(['todo', 'inprogress', 'inreview', 'done'] as Status[]).map((s) => ({ value: s, label: { todo: 'To Do', inprogress: 'In Progress', inreview: 'In Review', done: 'Done' }[s] }))}
              value={status}
              onChange={setStatus}
              trigger={
                <span className={dropdownTriggerCls}>
                  <StatusLozenge status={status} />
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />
          </Field>
        </div>

        <Field label="Summary">
          <input autoFocus value={summary} onChange={(e) => setSummary(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="What needs to be done?" className={inputCls} />
        </Field>

        <Field label="Description" optional>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add context, acceptance criteria…" className={cn(inputCls, 'resize-none')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <Dropdown
              options={[
                { value: null as string | null, label: 'Unassigned', icon: <Avatar user={null} size={20} ring={false} /> },
                ...users.map((u) => ({ value: u.id as string | null, label: u.name, icon: <Avatar user={u} size={20} ring={false} /> })),
              ]}
              value={assigneeId}
              onChange={setAssigneeId}
              trigger={
                <span className={dropdownTriggerCls}>
                  <span className="flex items-center gap-2">
                    <Avatar user={users.find((u) => u.id === assigneeId) ?? null} size={20} ring={false} />
                    <span className="text-[13px]">{users.find((u) => u.id === assigneeId)?.name ?? 'Unassigned'}</span>
                  </span>
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />
          </Field>
          <Field label="Priority">
            <Dropdown
              options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p], icon: <PriorityIcon priority={p} size={15} /> }))}
              value={priority}
              onChange={setPriority}
              trigger={
                <span className={dropdownTriggerCls}>
                  <span className="flex items-center gap-2">
                    <PriorityIcon priority={priority} size={15} />
                    {PRIORITY_LABEL[priority]}
                  </span>
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />
          </Field>
          <Field label="Sprint">
            <Dropdown
              options={[
                { value: null as string | null, label: 'Backlog' },
                ...sprints.map((s) => ({ value: s.id as string | null, label: s.name, hint: s.state })),
              ]}
              value={sprintId}
              onChange={setSprintId}
              trigger={
                <span className={dropdownTriggerCls}>
                  <span className="text-[13px]">{sprints.find((s) => s.id === sprintId)?.name ?? 'Backlog'}</span>
                  <ChevronDown size={14} className="text-ink-400" />
                </span>
              }
            />
          </Field>
          <Field label="Story points">
            <input type="number" min={0} value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} placeholder="1, 2, 3, 5, 8…" className={inputCls} />
          </Field>
        </div>

        <Field label="Epic link" optional>
          <Dropdown
            options={[{ value: null as string | null, label: 'None' }, ...epics.map((e) => ({ value: e.id as string | null, label: e.title, icon: <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: e.color }} /> }))]}
            value={epicId}
            onChange={setEpicId}
            trigger={
              <span className={dropdownTriggerCls}>
                <span className="flex items-center gap-2 text-[13px]">
                  {epicId && <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: epics.find((e) => e.id === epicId)?.color }} />}
                  {epics.find((e) => e.id === epicId)?.title ?? 'None'}
                </span>
                <ChevronDown size={14} className="text-ink-400" />
              </span>
            }
          />
        </Field>

        <Field label="Labels" optional>
          <div className="rounded-md border border-line px-2 py-1.5 transition-all focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
            <div className="flex flex-wrap items-center gap-1">
              {labels.map((l) => (
                <span key={l} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-[2px] text-[11px] font-medium text-brand-700">
                  {l}
                  <button type="button" onClick={() => setLabels((ls) => ls.filter((x) => x !== l))} className="text-brand-700/60 hover:text-brand-700">
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addLabel();
                  }
                }}
                onBlur={addLabel}
                placeholder={labels.length ? '' : 'Type + Enter'}
                className="min-w-[90px] flex-1 bg-transparent px-1 py-1 text-[13px] outline-none placeholder:text-ink-400"
              />
            </div>
          </div>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line-soft px-6 py-3.5">
        <button onClick={onClose} className="h-8 rounded-md px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!summary.trim()}
          className={cn(
            'h-8 rounded-md px-4 text-[13px] font-semibold text-white shadow-sm transition-all',
            summary.trim() ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98]' : 'cursor-not-allowed bg-ink-300',
          )}
        >
          Create
        </button>
      </div>
    </Modal>
  );
}

/* ============================== Checklist ============================== */

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

function loadChecklist(issueId: string): CheckItem[] {
  try {
    const raw = localStorage.getItem(`nexus:checklist:${issueId}`);
    return raw ? (JSON.parse(raw) as CheckItem[]) : [];
  } catch {
    return [];
  }
}

function Checklist({ issueId }: { issueId: string }) {
  const [items, setItems] = useState<CheckItem[]>(() => loadChecklist(issueId));
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setItems(loadChecklist(issueId));
    setAdding(false);
    setDraft('');
  }, [issueId]);

  useEffect(() => {
    try {
      localStorage.setItem(`nexus:checklist:${issueId}`, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [issueId, items]);

  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((cur) => [...cur, { id: `cl${Date.now()}`, text, done: false }]);
    setDraft('');
  };

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-ink-500">Checklist</p>
        {items.length > 0 && <span className="text-[11px] font-semibold text-ink-400">{doneCount}/{items.length} · {pct}%</span>}
      </div>

      {items.length > 0 && (
        <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-col">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn('h-full rounded-full transition-colors', pct === 100 ? 'bg-grn-500' : 'bg-brand-500')}
          />
        </div>
      )}

      <ul className="mt-2 space-y-0.5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group flex items-center gap-2.5 overflow-hidden rounded-md px-1.5 py-1 hover:bg-surface"
            >
              <button
                onClick={() => setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                className={cn(
                  'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-all',
                  item.done ? 'border-grn-500 bg-grn-500' : 'border-ink-300 bg-white hover:border-brand-600',
                )}
                aria-label={item.done ? 'Mark not done' : 'Mark done'}
              >
                {item.done && <Check size={12} strokeWidth={3.2} className="text-white" />}
              </button>
              <span className={cn('flex-1 text-[13.5px] transition-all', item.done ? 'text-ink-400 line-through' : 'text-ink-900')}>
                {item.text}
              </span>
              <button
                onClick={() => setItems((cur) => cur.filter((i) => i.id !== item.id))}
                className="text-ink-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                aria-label="Remove item"
              >
                <Trash2 size={13} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {adding ? (
        <div className="mt-1.5 flex items-center gap-2 px-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
            placeholder="Add an item and press Enter"
            className={cn(inputCls, 'h-8 py-1 text-[13px]')}
          />
          <button onClick={add} disabled={!draft.trim()} className={cn('h-8 shrink-0 rounded-md px-3 text-[12.5px] font-semibold text-white transition-all', draft.trim() ? 'bg-brand-600 hover:bg-brand-700' : 'bg-ink-300')}>
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-ink-500 transition-colors hover:bg-surface hover:text-ink-900"
        >
          <Plus size={14} />
          Add an item
        </button>
      )}
    </section>
  );
}
