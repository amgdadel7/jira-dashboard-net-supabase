import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import type { IssueType, Priority, Status, User } from '../types';
import { cn } from '../utils/cn';

/* ------------------------------- Avatar ------------------------------ */

export function Avatar({ user, size = 24, className, ring = true }: { user?: User | null; size?: number; className?: string; ring?: boolean }) {
  if (!user) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-col-hover text-ink-500', ring && 'ring-2 ring-white', className)}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        title="Unassigned"
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v1H4z" /></svg>
      </span>
    );
  }
  return (
    <span
      title={user.name}
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white', ring && 'ring-2 ring-white', className)}
      style={{ width: size, height: size, backgroundColor: user.color, fontSize: size * 0.38, letterSpacing: '-0.02em' }}
    >
      {user.initials}
    </span>
  );
}

export function AvatarStack({ users, size = 26, max = 6, onSelect, active }: { users: (User | null)[]; size?: number; max?: number; onSelect?: (u: User | null) => void; active?: string | null }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((u, i) => (
        <button
          key={u?.id ?? `none-${i}`}
          data-dnd-skip
          onClick={onSelect ? () => onSelect(u) : undefined}
          className={cn(
            'relative rounded-full transition-transform duration-150',
            onSelect && 'cursor-pointer hover:z-10 hover:-translate-y-0.5',
            active && (u ? active !== u.id : active !== 'none') && 'opacity-35 saturate-50',
          )}
        >
          <Avatar user={u} size={size} />
        </button>
      ))}
      {extra > 0 && (
        <span className="z-10 inline-flex items-center justify-center rounded-full bg-col font-semibold text-ink-700 ring-2 ring-white" style={{ width: size, height: size, fontSize: size * 0.36 }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

/* --------------------------- Issue type icon ------------------------- */

export function IssueTypeIcon({ type, size = 16 }: { type: IssueType; size?: number }) {
  switch (type) {
    case 'story':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Story"><rect width="16" height="16" rx="3.5" fill="#22A06B" /><path d="M5 3.2h6v9.6l-3-2.4-3 2.4z" fill="#fff" /></svg>
      );
    case 'task':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Task"><rect width="16" height="16" rx="3.5" fill="#0C66E4" /><path d="M6.9 10.9 4.3 8.3l1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.1z" fill="#fff" /></svg>
      );
    case 'bug':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Bug"><rect width="16" height="16" rx="3.5" fill="#E34935" /><circle cx="8" cy="8" r="2.6" fill="#fff" /></svg>
      );
    case 'epic':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Epic"><rect width="16" height="16" rx="3.5" fill="#8270DB" /><path d="M8.9 2.2 4.2 9h2.9l-.9 4.8L10.6 7H7.6z" fill="#fff" /></svg>
      );
  }
}

/* ---------------------------- Priority icon -------------------------- */

export function PriorityIcon({ priority, size = 16 }: { priority: Priority; size?: number }) {
  const RED = '#E34935';
  const ORANGE = '#E56910';
  const BLUE = '#0C66E4';
  switch (priority) {
    case 'highest':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Highest"><path d="M8 1.5 12.8 6l-1.4 1.4L8 4 4.6 7.4 3.2 6z" fill={RED} /><path d="M8 7.5 12.8 12l-1.4 1.4L8 10l-3.4 3.4L3.2 12z" fill={RED} opacity=".75" /></svg>
      );
    case 'high':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="High"><path d="M8 1.8 13 7.5H9.8v6.5H6.2V7.5H3z" fill={RED} /></svg>
      );
    case 'medium':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Medium"><rect x="3" y="3.4" width="10" height="2.1" rx="1.05" fill={ORANGE} /><rect x="3" y="6.95" width="10" height="2.1" rx="1.05" fill={ORANGE} /><rect x="3" y="10.5" width="10" height="2.1" rx="1.05" fill={ORANGE} /></svg>
      );
    case 'low':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Low"><path d="M8 14.2 3 8.5h3.2V2h3.6v6.5H13z" fill={BLUE} /></svg>
      );
    case 'lowest':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Lowest"><path d="M8 14.5 3.2 10l1.4-1.4L8 12l3.4-3.4L12.8 10z" fill={BLUE} /><path d="M8 8.5 3.2 4l1.4-1.4L8 6l3.4-3.4L12.8 4z" fill={BLUE} opacity=".7" /></svg>
      );
  }
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};

export const TYPE_LABEL: Record<IssueType, string> = {
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
  epic: 'Epic',
};

/* ---------------------------- Status lozenge ------------------------- */

const STATUS_STYLE: Record<Status, string> = {
  todo: 'bg-col-hover text-ink-700',
  inprogress: 'bg-brand-50 text-brand-700',
  inreview: 'bg-pur-100 text-pur-600',
  done: 'bg-grn-100 text-grn-700',
};

export function StatusLozenge({ status, label, className }: { status: Status; label?: string; className?: string }) {
  const text = label ?? { todo: 'TO DO', inprogress: 'IN PROGRESS', inreview: 'IN REVIEW', done: 'DONE' }[status];
  return (
    <span className={cn('inline-flex items-center rounded-[4px] px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.04em]', STATUS_STYLE[status], className)}>
      {text}
    </span>
  );
}

export function PointsBadge({ points, className }: { points: number | null; className?: string }) {
  if (points === null) return null;
  return (
    <span className={cn('inline-flex min-w-[22px] items-center justify-center rounded-full bg-col px-1.5 py-[2px] text-[11px] font-semibold text-ink-700', className)}>
      {points}
    </span>
  );
}

const LABEL_PALETTE = [
  'bg-brand-50 text-brand-700',
  'bg-grn-100 text-grn-700',
  'bg-pur-100 text-pur-600',
  'bg-org-100 text-org-700',
  'bg-teal-100 text-teal-700',
  'bg-yel-100 text-[#7a5b00]',
];

export function LabelChip({ label }: { label: string }) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-[2px] text-[10.5px] font-medium', LABEL_PALETTE[h % LABEL_PALETTE.length])}>
      {label}
    </span>
  );
}

/* -------------------------------- Modal ------------------------------ */

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-brand-950/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn('relative z-10 w-full rounded-xl bg-white shadow-overlay', wide ? 'max-w-5xl' : 'max-w-xl')}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-line-soft hover:text-ink-900" aria-label="Close">
      <X size={17} />
    </button>
  );
}

/* ------------------------------ Copy button -------------------------- */

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard unavailable — noop */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors', copied ? 'text-grn-500' : 'text-ink-400 hover:bg-white/10 hover:text-white', className)}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ------------------------------ Form field --------------------------- */

export function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-ink-500">
        {label}
        {optional && <span className="font-medium normal-case tracking-normal text-ink-400">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------- Helpers ----------------------------- */

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
