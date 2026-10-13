import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Command, Database, Rocket, SquareKanban } from 'lucide-react';
import { Modal } from './ui';
import { cn } from '../utils/cn';

interface Step {
  icon: React.ElementType;
  gradient: string;
  ring: string;
  title: string;
  desc: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    icon: Rocket,
    gradient: 'from-brand-500 to-brand-800',
    ring: 'bg-brand-50 text-brand-600',
    title: 'Welcome aboard',
    desc: 'Your agile workspace is live — boards, sprints, roadmaps and reports, all wired to a real ASP.NET Core + Supabase backend.',
    points: ['7 fully working views', 'Demo data included — everything is clickable'],
  },
  {
    icon: SquareKanban,
    gradient: 'from-grn-500 to-teal-700',
    ring: 'bg-grn-100 text-grn-700',
    title: 'Drag, drop, done',
    desc: 'Move cards across the board, then plan sprints by dragging issues straight from the backlog into a sprint.',
    points: ['Fractional ranks — every drop persists', 'WIP limits warn you when lanes overflow'],
  },
  {
    icon: Command,
    gradient: 'from-pur-400 to-pur-600',
    ring: 'bg-pur-100 text-pur-600',
    title: 'Fly with the keyboard',
    desc: 'Open the command palette from anywhere and jump between views, search issues, or create one in seconds.',
    points: ['⌘K palette · c new issue · ? cheat sheet', 'Keys 1–7 switch between views'],
  },
  {
    icon: Database,
    gradient: 'from-org-500 to-red-600',
    ring: 'bg-org-100 text-org-700',
    title: 'Real backend, real data',
    desc: 'You are in mock mode. Point VITE_API_URL at the bundled .NET 9 API and every action lands in Supabase Postgres.',
    points: ['12 documented REST endpoints', 'Ready-made SQL schema, seed & Dockerfile'],
  },
];

export function WelcomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="overflow-hidden rounded-xl">
        {/* Hero band */}
        <div className={cn('relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br transition-colors duration-500', s.gradient)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm"
            >
              <s.icon size={30} />
            </motion.div>
          </AnimatePresence>
          {[...Array(3)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white/20"
              style={{ width: 10 + i * 14, height: 10 + i * 14, left: `${18 + i * 28}%` }}
              animate={{ y: [-60, 190] }}
              transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 1.4 }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 pb-3">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={cn('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70')}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 pb-6 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-[20px] font-bold tracking-[-0.015em] text-ink-900">{s.title}</h2>
              <p className="mt-2 text-[13.5px] leading-[21px] text-ink-600">{s.desc}</p>
              <ul className="mt-3.5 space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[13px] text-ink-700">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full', s.ring)}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex items-center justify-between">
            <button onClick={onClose} className="text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-700">
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={() => setStep((v) => v - 1)} className="h-9 rounded-md px-3.5 text-[13px] font-medium text-ink-700 transition-colors hover:bg-line-soft">
                  Back
                </button>
              )}
              <button
                onClick={() => (last ? onClose() : setStep((v) => v + 1))}
                className="flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
              >
                {last ? 'Get started' : 'Next'}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
