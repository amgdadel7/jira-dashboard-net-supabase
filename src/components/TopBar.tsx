import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronDown, CircleHelp, Flag, GitPullRequest, Grip, MessageSquare, Plus, Search, Settings, UserPlus } from 'lucide-react';
import type { User } from '../types';
import type { ViewKey } from './Sidebar';
import { Avatar } from './ui';
import { notify } from '../utils/toastBus';
import { cn } from '../utils/cn';

const NAV: { label: string; to: ViewKey | null; soon?: boolean }[] = [
  { label: 'Your work', to: 'forYou' },
  { label: 'Projects', to: 'board' },
  { label: 'Filters', to: 'issues' },
  { label: 'Dashboards', to: 'reports' },
  { label: 'Teams', to: null, soon: true },
];

const APPS = [
  { name: 'Nexus Software', desc: 'Agile boards & sprints', current: true },
  { name: 'Nexus Service Desk', desc: 'Customer support queues', current: false },
  { name: 'Nexus Insight', desc: 'Analytics & dashboards', current: false },
];

interface Notif {
  id: string;
  icon: React.ElementType;
  tint: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  issueKey?: string;
  view?: ViewKey;
}

const NOTIFS: Notif[] = [
  { id: 'n1', icon: MessageSquare, tint: 'bg-brand-50 text-brand-700', title: 'Omar Farouk commented on ATL-104', desc: 'Dead-letter table is ready for review.', time: '14m', unread: true, issueKey: 'ATL-104' },
  { id: 'n2', icon: UserPlus, tint: 'bg-grn-100 text-grn-700', title: 'Sara Nasser assigned you ATL-112', desc: 'Redesign signup flow with social login.', time: '2h', unread: true, issueKey: 'ATL-112' },
  { id: 'n3', icon: GitPullRequest, tint: 'bg-pur-100 text-pur-600', title: 'PR #482 is ready to merge', desc: 'Migrate settings API to .NET 9 minimal APIs.', time: '5h', unread: true, issueKey: 'ATL-107' },
  { id: 'n4', icon: Flag, tint: 'bg-org-100 text-org-700', title: 'Sprint 15 planning starts soon', desc: '3 issues are already planned for next sprint.', time: '1d', unread: false, view: 'backlog' },
];

interface Props {
  me: User;
  onCreate: () => void;
  onOpenPalette: () => void;
  live: boolean;
  onToggleLive: () => void;
  onLogout: () => void;
  onNavigate: (view: ViewKey) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenIssueKey: (key: string) => void;
}

export function TopBar({ me, onCreate, onOpenPalette, live, onToggleLive, onLogout, onNavigate, onOpenHelp, onOpenSettings, onOpenIssueKey }: Props) {
  const [menu, setMenu] = useState<'bell' | 'avatar' | 'apps' | null>(null);
  const [readAll, setReadAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const unreadCount = readAll ? 0 : NOTIFS.filter((n) => n.unread).length;

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center gap-1 border-b border-line bg-white pl-1.5 pr-3">
      <div ref={menuRef} className="flex items-center gap-1">
        {/* App switcher */}
        <div className="relative">
          <button
            onClick={() => setMenu(menu === 'apps' ? null : 'apps')}
            className={cn('flex h-8 w-8 items-center justify-center rounded-md transition-colors', menu === 'apps' ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-line-soft')}
            title="Switch to"
          >
            <Grip size={17} />
          </button>
          <AnimatePresence>
            {menu === 'apps' && (
              <Dropdown className="left-0 w-[300px]">
                <p className="border-b border-line-soft px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Switch to</p>
                <div className="py-1">
                  {APPS.map((app) => (
                    <button
                      key={app.name}
                      onClick={() => {
                        setMenu(null);
                        if (!app.current) notify(`${app.name} — coming soon`, 'This demo ships one product for now');
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-[8px] shadow-sm', app.current ? 'bg-gradient-to-br from-brand-500 to-brand-800' : 'bg-col-hover')}>
                        <svg viewBox="0 0 32 32" width="14" height="14"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill={app.current ? '#fff' : '#626f86'} /></svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink-900">{app.name}</span>
                        <span className="block text-[11.5px] text-ink-500">{app.desc}</span>
                      </span>
                      {app.current && <Check size={15} className="text-brand-600" />}
                    </button>
                  ))}
                </div>
              </Dropdown>
            )}
          </AnimatePresence>
        </div>

        {/* Brand */}
        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('board'); }} className="mr-1 flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-line-soft">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
            <svg viewBox="0 0 32 32" width="13" height="13"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
          </span>
          <span className="text-[15px] font-bold tracking-[-0.02em] text-ink-900">Nexus</span>
          <span className="hidden text-[13px] font-medium text-ink-400 sm:block">Software</span>
        </a>
      </div>

      {/* Nav */}
      <nav className="hidden items-center lg:flex">
        {NAV.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.to) onNavigate(item.to);
              else notify('Teams directory', 'Coming with Supabase Auth roles — stay tuned');
            }}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium transition-colors ${
              item.label === 'Projects' ? 'text-brand-700' : 'text-ink-700 hover:bg-line-soft hover:text-ink-900'
            }`}
          >
            {item.label}
            <ChevronDown size={14} strokeWidth={2.4} className="text-ink-400" />
          </button>
        ))}
      </nav>

      <button
        onClick={onCreate}
        className="ml-1 hidden h-8 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98] md:flex"
      >
        <Plus size={15} strokeWidth={2.6} />
        Create
      </button>

      <div className="flex-1" />

      {/* Search → opens command palette */}
      <button
        onClick={onOpenPalette}
        className="relative hidden h-8 w-48 items-center rounded-md border border-transparent bg-surface pl-8 pr-8 text-left text-[13px] text-ink-400 transition-all hover:border-line hover:bg-col-hover sm:flex"
        title="Search (⌘K)"
      >
        <Search size={15} className="absolute left-2.5 text-ink-400" />
        Search
        <kbd className="absolute right-2 rounded border border-line bg-white px-1 text-[10px] font-medium text-ink-400">⌘K</kbd>
      </button>

      {/* Live sync indicator */}
      <button
        onClick={onToggleLive}
        title={live ? 'Realtime sync on — simulated teammates (click to pause)' : 'Realtime sync paused (click to resume)'}
        className={cn(
          'mr-1 hidden h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-bold tracking-[0.04em] transition-all sm:flex',
          live ? 'bg-grn-100 text-grn-700 hover:bg-grn-100/70' : 'bg-col text-ink-400 hover:bg-col-hover',
        )}
      >
        <span className={cn('h-[7px] w-[7px] rounded-full', live ? 'animate-pulse bg-grn-500' : 'bg-ink-300')} />
        LIVE
      </button>

      <div ref={menuRef} className="flex items-center gap-0.5">
        {/* Notifications */}
        <div className="relative">
          <IconBtn title="Notifications" active={menu === 'bell'} onClick={() => setMenu(menu === 'bell' ? null : 'bell')}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            )}
          </IconBtn>

          <AnimatePresence>
            {menu === 'bell' && (
              <Dropdown className="w-[350px]">
                <div className="flex items-center justify-between border-b border-line-soft px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold text-ink-900">Notifications</p>
                  <button onClick={() => setReadAll(true)} className="text-[12px] font-medium text-brand-700 transition-colors hover:underline">
                    Mark all as read
                  </button>
                </div>
                <ul className="scroll-slim max-h-[340px] overflow-y-auto py-1">
                  {NOTIFS.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          setMenu(null);
                          if (n.issueKey) onOpenIssueKey(n.issueKey);
                          else if (n.view) onNavigate(n.view);
                        }}
                        className="w-full text-left transition-colors hover:bg-surface"
                      >
                        <span className="flex items-start gap-2.5 px-3.5 py-2.5">
                          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', n.tint)}>
                            <n.icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink-900">{n.title}</span>
                            <span className="block truncate text-[12px] text-ink-500">{n.desc}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-[11px] text-ink-400">{n.time}</span>
                            {n.unread && !readAll && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line-soft px-3.5 py-2 text-center">
                  <button
                    onClick={() => {
                      setMenu(null);
                      onNavigate('issues');
                    }}
                    className="text-[12.5px] font-medium text-brand-700 transition-colors hover:underline"
                  >
                    View all activity
                  </button>
                </div>
              </Dropdown>
            )}
          </AnimatePresence>
        </div>

        <IconBtn title="Help & shortcuts" onClick={onOpenHelp}>
          <CircleHelp size={17} />
        </IconBtn>
        <IconBtn title="Project settings" onClick={onOpenSettings}>
          <Settings size={16} />
        </IconBtn>

        {/* Profile */}
        <div className="relative">
          <button onClick={() => setMenu(menu === 'avatar' ? null : 'avatar')} className="ml-0.5 rounded-full transition-transform hover:scale-105" title={me.name}>
            <Avatar user={me} size={26} ring={false} />
          </button>

          <AnimatePresence>
            {menu === 'avatar' && (
              <Dropdown className="w-[280px]">
                <div className="flex items-center gap-3 border-b border-line-soft px-3.5 py-3">
                  <Avatar user={me} size={36} ring={false} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{me.name}</p>
                    <p className="truncate text-[12px] text-ink-500">{me.email}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenu(null);
                      notify('Profile page', 'Manage your avatar & display name soon');
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenu(null);
                      onOpenSettings();
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                  >
                    Account settings
                  </button>
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(`nexus_${me.initials.toLowerCase()}_${Math.random().toString(36).slice(2, 14)}`).catch(() => {});
                      setMenu(null);
                      notify('Personal token generated', 'Copied to clipboard — store it safely');
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[13px] text-ink-900 transition-colors hover:bg-surface"
                  >
                    Personal tokens
                  </button>
                </div>
                <div className="border-t border-line-soft py-1">
                  <button
                    onClick={() => {
                      setMenu(null);
                      onLogout();
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-100/60"
                  >
                    Log out
                  </button>
                </div>
              </Dropdown>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children, title, onClick, active }: { children: React.ReactNode; title: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-line-soft hover:text-ink-900',
      )}
      title={title}
    >
      {children}
    </button>
  );
}

function Dropdown({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.985 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn('absolute right-0 top-10 z-50 overflow-hidden rounded-lg border border-line-soft bg-white shadow-overlay', className)}
    >
      {children}
    </motion.div>
  );
}
