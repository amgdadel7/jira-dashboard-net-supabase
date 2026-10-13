import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Database,
  Layers,
  List,
  Milestone,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Settings,
  Sparkles,
  SquareKanban,
} from 'lucide-react';
import type { Project } from '../types';
import { notify } from '../utils/toastBus';
import { cn } from '../utils/cn';

const OTHER_PROJECTS = [
  { key: 'PHX', name: 'Phoenix Mobile' },
  { key: 'ORB', name: 'Orbit API' },
];

export type ViewKey = 'forYou' | 'roadmap' | 'backlog' | 'issues' | 'board' | 'reports' | 'backend';

const ITEMS: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: 'forYou', label: 'For you', icon: Sparkles },
  { key: 'roadmap', label: 'Roadmap', icon: Milestone },
  { key: 'backlog', label: 'Backlog', icon: Layers },
  { key: 'issues', label: 'All issues', icon: List },
  { key: 'board', label: 'Board', icon: SquareKanban },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({
  project,
  view,
  onNavigate,
  collapsed,
  onToggleCollapse,
  apiMode,
  onOpenSettings,
}: {
  project: Project;
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  apiMode: 'live' | 'mock';
  onOpenSettings: () => void;
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcherOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [switcherOpen]);

  return (
    <aside
      className={cn(
        'relative z-30 flex h-full shrink-0 flex-col border-r border-line-soft bg-white transition-[width] duration-200 ease-out',
        collapsed ? 'w-[52px]' : 'w-[248px]',
      )}
    >
      {/* Project */}
      <div className={cn('border-b border-line-soft px-2 py-3', collapsed && 'px-1.5')}>
        <div ref={switcherRef} className="relative">
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className={cn('flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-line-soft', collapsed && 'justify-center')}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 shadow-sm">
              <svg viewBox="0 0 32 32" width="17" height="17"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold leading-[18px] text-ink-900">{project.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-500">{project.type}</span>
                </span>
                <ChevronDown size={14} className={cn('shrink-0 text-ink-400 transition-transform', switcherOpen && 'rotate-180')} />
              </>
            )}
          </button>
          {switcherOpen && !collapsed && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line-soft bg-white py-1 shadow-overlay">
              <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-400">Switch project</p>
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-800 text-[10px] font-bold text-white">A</span>
                <span className="flex-1 text-[13px] font-semibold text-ink-900">{project.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Current</span>
              </div>
              <div className="my-1 h-px bg-line-soft" />
              {OTHER_PROJECTS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setSwitcherOpen(false);
                    notify(`${p.name} is a read-only demo`, 'Atlas Platform has full interactivity');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-col-hover text-[10px] font-bold text-ink-500">{p.key[0]}</span>
                  <span className="flex-1 text-[13px] text-ink-900">{p.name}</span>
                  <span className="text-[10.5px] text-ink-300">{p.key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2.5">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-line-soft',
                collapsed && 'justify-center px-0',
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />}
              <Icon size={17} strokeWidth={active ? 2.3 : 2} className={cn('shrink-0 transition-colors', active ? 'text-brand-700' : 'text-ink-500 group-hover:text-ink-700')} />
              {!collapsed && label}
            </button>
          );
        })}

        <div className="my-3 h-px bg-line-soft" />
        {!collapsed && <p className="mb-1 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-400">Developer</p>}

        <button
          onClick={() => onNavigate('backend')}
          title={collapsed ? 'Backend & Data' : undefined}
          className={cn(
            'group relative flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-colors',
            view === 'backend' ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-line-soft',
            collapsed && 'justify-center px-0',
          )}
        >
          {view === 'backend' && <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" />}
          <Database size={17} className={cn('shrink-0', view === 'backend' ? 'text-brand-700' : 'text-ink-500 group-hover:text-ink-700')} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Backend &amp; DB</span>
              <span className={cn('h-[7px] w-[7px] rounded-full', apiMode === 'live' ? 'bg-grn-500' : 'bg-yel-500')} title={apiMode === 'live' ? 'Connected to .NET API' : 'Mock mode'} />
            </>
          )}
        </button>

        <SidebarExtra
          icon={Rocket}
          label="Deployments"
          collapsed={collapsed}
          onClick={() => notify('No deployments yet', 'Connect CI/CD from Backend & DB to see the pipeline')}
        />
        <SidebarExtra icon={Settings} label="Project settings" collapsed={collapsed} onClick={onOpenSettings} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-line-soft p-3">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-[12px] font-semibold text-ink-900">You're in a company-managed project</p>
            <p className="mt-1 text-[11.5px] leading-[16px] text-ink-500">
              Data syncs through the .NET Core API to Supabase Postgres with row-level security.
            </p>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('backend'); }} className="mt-1.5 inline-block text-[12px] font-medium text-brand-700 hover:underline">
              View connection
            </a>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-[13px] top-[60px] z-40 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line bg-white text-ink-500 opacity-0 shadow-sm transition-all hover:bg-brand-600 hover:text-white focus:opacity-100"
        style={{ opacity: undefined }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>
    </aside>
  );
}

function SidebarExtra({ icon: Icon, label, collapsed, onClick }: { icon: React.ElementType; label: string; collapsed: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium text-ink-700 transition-colors hover:bg-line-soft',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon size={17} className="shrink-0 text-ink-500 transition-colors group-hover:text-ink-700" />
      {!collapsed && label}
    </button>
  );
}
