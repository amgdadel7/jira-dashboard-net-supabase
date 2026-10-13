import { Keyboard } from 'lucide-react';
import { Modal, ModalClose } from './ui';

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Global',
    items: [
      { keys: ['⌘', 'K'], label: 'Open the command palette' },
      { keys: ['C'], label: 'Create issue' },
      { keys: ['?'], label: 'Toggle this cheat sheet' },
      { keys: ['Esc'], label: 'Close dialogs and menus' },
    ],
  },
  {
    title: 'Navigate',
    items: [
      { keys: ['1'], label: 'Go to Board' },
      { keys: ['2'], label: 'Go to Backlog' },
      { keys: ['3'], label: 'Go to All issues' },
      { keys: ['4'], label: 'Go to Roadmap' },
      { keys: ['5'], label: 'Go to Reports' },
      { keys: ['6'], label: 'Go to Backend & DB' },
      { keys: ['7'], label: 'Go to For you' },
    ],
  },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Keyboard size={16} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-ink-900">Keyboard shortcuts</h2>
            <p className="text-[12px] text-ink-500">Work the board without touching the mouse</p>
          </div>
        </div>
        <ModalClose onClose={onClose} />
      </div>

      <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">{g.title}</p>
            <ul className="space-y-1">
              {g.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 rounded-md px-2 py-[7px] transition-colors hover:bg-surface">
                  <span className="text-[13px] text-ink-700">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k) => (
                      <kbd key={k} className="flex h-[22px] min-w-[22px] items-center justify-center rounded-md border border-line bg-surface px-1.5 text-[11px] font-semibold text-ink-700 shadow-[0_1px_0_rgba(9,30,66,0.16)]">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line-soft bg-surface px-6 py-3 text-center text-[11.5px] text-ink-400">
        Shortcuts are disabled while typing in any field
      </div>
    </Modal>
  );
}
