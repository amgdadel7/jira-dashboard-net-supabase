import { useState } from 'react';
import { AlertTriangle, Check, Keyboard, RotateCcw, Save } from 'lucide-react';
import { Field, Modal, ModalClose } from './ui';
import { notify } from '../utils/toastBus';
import { cn } from '../utils/cn';

interface Props {
  currentName: string;
  live: boolean;
  onToggleLive: () => void;
  onRename: (name: string) => void;
  onOpenShortcuts: () => void;
  onClose: () => void;
}

export function ProjectSettingsModal({ currentName, live, onToggleLive, onRename, onOpenShortcuts, onClose }: Props) {
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const v = name.trim();
    if (!v || v === currentName) return;
    onRename(v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const resetWorkspace = () => {
    try {
      localStorage.clear();
    } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink-900">Project settings</h2>
          <p className="text-[12px] text-ink-500">Atlas Platform · company-managed</p>
        </div>
        <ModalClose onClose={onClose} />
      </div>

      <div className="scroll-slim max-h-[60vh] space-y-6 overflow-y-auto px-6 py-5">
        {/* General */}
        <section>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">General</p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Project name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && save()}
                  className="w-full rounded-md border border-line bg-white px-2.5 py-[7px] text-[13.5px] text-ink-900 outline-none transition-all hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </Field>
            </div>
            <button
              onClick={save}
              disabled={!name.trim() || name.trim() === currentName}
              className={cn(
                'flex h-[34px] items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-white transition-all',
                saved ? 'bg-grn-500' : name.trim() && name.trim() !== currentName ? 'bg-brand-600 hover:bg-brand-700' : 'cursor-not-allowed bg-ink-300',
              )}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </section>

        {/* Board behaviour */}
        <section>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">Board behaviour</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-surface">
              <div>
                <p className="text-[13.5px] font-medium text-ink-900">Realtime live sync</p>
                <p className="text-[12px] text-ink-400">Simulated teammates move cards — maps to a Supabase channel</p>
              </div>
              <button
                onClick={onToggleLive}
                role="switch"
                aria-checked={live}
                className={cn('relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200', live ? 'bg-brand-600' : 'bg-ink-300')}
              >
                <span className={cn('absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform duration-200', live ? 'translate-x-[21px]' : 'translate-x-[3px]')} />
              </button>
            </div>
            <button
              onClick={() => {
                onOpenShortcuts();
                notify('Keyboard shortcut', 'Press ? anytime to reopen this sheet');
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-surface"
            >
              <span>
                <span className="block text-[13.5px] font-medium text-ink-900">Keyboard shortcuts</span>
                <span className="block text-[12px] text-ink-400">Open the cheat sheet</span>
              </span>
              <Keyboard size={16} className="text-ink-400" />
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-lg border border-red-500/30 bg-red-100/40 p-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-600" />
            <p className="text-[12.5px] font-bold text-red-600">Danger zone</p>
          </div>
          <p className="mt-1.5 text-[12px] leading-[18px] text-ink-700">
            Clears every local override — custom project name, checklists, starred board, tour state — and reloads with fresh demo data.
          </p>
          <button
            onClick={resetWorkspace}
            className="mt-2.5 flex h-8 items-center gap-1.5 rounded-md bg-red-500 px-3 text-[12.5px] font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.98]"
          >
            <RotateCcw size={13} />
            Reset workspace
          </button>
        </section>
      </div>
    </Modal>
  );
}
