import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, BarChart3, CornerDownLeft, Database, Layers, List, Milestone, Plus, Search, Sparkles, SquareKanban } from 'lucide-react';
import type { Issue, User } from '../types';
import type { ViewKey } from './Sidebar';
import { IssueTypeIcon, StatusLozenge, Avatar } from './ui';
import { cn } from '../utils/cn';

interface Item {
  id: string;
  title: string;
  sub?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  run: () => void;
}

const VIEWS: { key: ViewKey; label: string; hint: string; icon: React.ElementType }[] = [
  { key: 'forYou', label: 'For you', hint: 'Your personal dashboard', icon: Sparkles },
  { key: 'board', label: 'Board', hint: 'Active sprint', icon: SquareKanban },
  { key: 'backlog', label: 'Backlog', hint: 'Plan & prioritize', icon: Layers },
  { key: 'issues', label: 'All issues', hint: 'Search & filter everything', icon: List },
  { key: 'roadmap', label: 'Roadmap', hint: 'Epic timeline', icon: Milestone },
  { key: 'reports', label: 'Reports', hint: 'Burndown & velocity', icon: BarChart3 },
  { key: 'backend', label: 'Backend & DB', hint: '.NET Core + Supabase', icon: Database },
];

interface Props {
  open: boolean;
  onClose: () => void;
  issues: Issue[];
  users: User[];
  onOpenIssue: (issue: Issue) => void;
  onNavigate: (view: ViewKey) => void;
  onCreate: () => void;
}

export function CommandPalette({ open, onClose, issues, users, onOpenIssue, onNavigate, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { label: string; items: Item[] }[] = [];

    const matched = issues
      .filter((i) => !q || [i.summary, i.key, ...i.labels].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (q ? 0 : Date.parse(b.updatedAt) - Date.parse(a.updatedAt)))
      .slice(0, q ? 7 : 5)
      .map<Item>((i) => ({
        id: i.id,
        title: i.summary,
        sub: i.key,
        icon: <IssueTypeIcon type={i.type} size={15} />,
        badge: <StatusLozenge status={i.status} />,
        run: () => onOpenIssue(i),
      }));
    if (matched.length) out.push({ label: q ? 'Issues' : 'Recent issues', items: matched });

    const quick: Item[] = [];
    if (!q || 'create issue'.includes(q) || 'new'.includes(q)) {
      quick.push({
        id: 'act-create',
        title: 'Create new issue',
        sub: 'ATL · active sprint',
        icon: <Plus size={15} className="text-ink-400" />,
        run: onCreate,
      });
    }
    for (const v of VIEWS) {
      if (!q || v.label.toLowerCase().includes(q)) {
        quick.push({
          id: `view-${v.key}`,
          title: `Go to ${v.label}`,
          sub: v.hint,
          icon: <v.icon size={15} className="text-ink-400" />,
          run: () => onNavigate(v.key),
        });
      }
    }
    if (quick.length) out.push({ label: q ? 'Actions' : 'Quick actions', items: quick });

    return out;
  }, [query, issues, onOpenIssue, onNavigate, onCreate]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setIndex(0), [query, flat.length]);

  const execute = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(flat[index]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="ci-${index}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-brand-950/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            className="relative z-10 w-full max-w-[580px] overflow-hidden rounded-xl bg-white shadow-overlay"
          >
            <div className="flex items-center gap-2.5 border-b border-line-soft px-4">
              <Search size={16} className="shrink-0 text-ink-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search issues, or type a command…"
                className="h-[52px] w-full bg-transparent text-[14.5px] text-ink-900 outline-none placeholder:text-ink-400"
              />
              <kbd className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-400">ESC</kbd>
            </div>

            <div ref={listRef} className="scroll-slim max-h-[380px] overflow-y-auto p-1.5">
              {flat.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
                  <Search size={18} className="text-ink-300" />
                  <p className="text-[13px] font-medium text-ink-700">No results for “{query}”</p>
                  <p className="text-[12px] text-ink-400">Try an issue key like ATL-104 or a different keyword.</p>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-400">{g.label}</p>
                  {g.items.map((item) => {
                    const flatIndex = flat.indexOf(item);
                    const active = flatIndex === index;
                    return (
                      <button
                        key={item.id}
                        data-idx={`ci-${flatIndex}`}
                        onMouseEnter={() => setIndex(flatIndex)}
                        onClick={() => execute(item)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                          active ? 'bg-brand-50' : 'hover:bg-surface',
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface">{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-[13.5px] font-medium', active ? 'text-brand-700' : 'text-ink-900')}>{item.title}</span>
                          {item.sub && <span className="block truncate text-[11.5px] text-ink-400">{item.sub}</span>}
                        </span>
                        {item.badge}
                        {active && <CornerDownLeft size={13} className="shrink-0 text-ink-300" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-line-soft bg-surface px-4 py-2 text-[11px] text-ink-400">
              <span className="flex items-center gap-1">
                <ArrowUp size={11} />
                <ArrowDown size={11} />
                navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft size={11} />
                select
              </span>
              <span className="ml-auto hidden items-center gap-1.5 sm:flex">
                {users.slice(0, 3).map((u) => (
                  <Avatar key={u.id} user={u} size={16} ring={false} />
                ))}
                synced with Supabase
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
