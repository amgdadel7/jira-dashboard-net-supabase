import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck, SquareKanban, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Front door — in live mode this is where Supabase Auth plugs in
 * (magic link: supabase.auth.signInWithOtp({ email })). The demo passes
 * any name through to the workspace.
 */
export function LoginScreen({ onSignIn }: { onSignIn: (name: string) => void }) {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent'>('form');

  const submit = () => {
    if (!email.trim() || !email.includes('@')) return;
    setPhase('sending');
    setTimeout(() => setPhase('sent'), 900);
  };

  const continueDemo = () => {
    const name = email.includes('@') ? email.split('@')[0].replace(/[._-]/g, ' ') : 'Layla Haddad';
    onSignIn(name.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Layla Haddad');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-pur-400/20 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-white/10 shadow-inner ring-1 ring-white/25">
              <svg viewBox="0 0 32 32" width="18" height="18"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
            </span>
            <span className="text-[18px] font-bold tracking-[-0.02em] text-white">Nexus Software</span>
          </div>

          <div className="max-w-md">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[34px] font-bold leading-[42px] tracking-[-0.02em] text-white"
            >
              Move work forward,
              <br />
              sprint after sprint.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-[15px] leading-[24px] text-white/70"
            >
              The agile board your team already knows — boards, backlogs, roadmaps and reports, powered by an ASP.NET Core API on Supabase Postgres.
            </motion.p>

            <div className="mt-8 space-y-3">
              {[
                { icon: SquareKanban, text: 'Drag-and-drop boards with live sync' },
                { icon: Zap, text: 'Realtime updates through Supabase channels' },
                { icon: ShieldCheck, text: 'Row-level security, keys stay server-side' },
              ].map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 text-[13.5px] font-medium text-white/85"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                    <f.icon size={15} />
                  </span>
                  {f.text}
                </motion.div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-white/40">Atlas Platform · Sprint 14 in progress</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-brand-500 to-brand-800">
              <svg viewBox="0 0 32 32" width="15" height="15"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
            </span>
            <span className="text-[17px] font-bold text-ink-900">Nexus Software</span>
          </div>

          {phase !== 'sent' ? (
            <>
              <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink-900">Log in to continue</h2>
              <p className="mt-1 text-[13.5px] text-ink-500">We'll email you a magic link — no password needed.</p>

              <div className="mt-6 space-y-3">
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="you@company.com"
                    className="h-[42px] w-full rounded-md border border-line bg-white pl-9 pr-3 text-[14px] text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:bg-surface focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <button
                  onClick={submit}
                  disabled={!email.includes('@') || phase === 'sending'}
                  className={cn(
                    'flex h-[42px] w-full items-center justify-center gap-2 rounded-md text-[14px] font-semibold text-white shadow-sm transition-all',
                    email.includes('@') ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.99]' : 'cursor-not-allowed bg-ink-300',
                  )}
                >
                  {phase === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {phase === 'sending' ? 'Sending link…' : 'Continue with email'}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-line-soft" />
                  <span className="text-[11.5px] font-medium text-ink-400">OR</span>
                  <span className="h-px flex-1 bg-line-soft" />
                </div>

                <button
                  onClick={continueDemo}
                  className="flex h-[42px] w-full items-center justify-center gap-2 rounded-md border border-line bg-white text-[14px] font-semibold text-ink-900 transition-all hover:bg-surface active:scale-[0.99]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-gradient-to-br from-brand-500 to-brand-800">
                    <svg viewBox="0 0 32 32" width="10" height="10"><path d="M9.5 22 16 9l6.5 13h-3.9L16 16.8l-2.6 5.2z" fill="#fff" /></svg>
                  </span>
                  Explore the demo workspace
                </button>
              </div>

              <p className="mt-6 text-center text-[11.5px] leading-[18px] text-ink-400">
                Powered by Supabase Auth · protected by row-level security.
                <br />
                In live mode the magic link signs you into the real workspace.
              </p>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-grn-100 text-grn-500">
                <CheckCircle2 size={26} />
              </span>
              <h2 className="mt-4 text-[20px] font-semibold text-ink-900">Check your inbox</h2>
              <p className="mt-1.5 text-[13.5px] leading-[20px] text-ink-500">
                We sent a sign-in link to <span className="font-semibold text-ink-900">{email}</span>.
                <br />
                It expires in 15 minutes.
              </p>
              <button
                onClick={continueDemo}
                className="mt-6 flex h-[42px] w-full items-center justify-center gap-2 rounded-md bg-brand-600 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.99]"
              >
                Continue to the workspace
                <ArrowRight size={15} />
              </button>
              <button onClick={() => setPhase('form')} className="mt-3 text-[12.5px] font-medium text-ink-400 hover:text-ink-700">
                Use a different email
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
