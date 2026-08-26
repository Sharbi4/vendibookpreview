import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Save, MessageSquare, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleContinueButton } from '@/components/auth/GoogleContinueButton';

const RETURN_PATH = '/list-with-vendi';

const points = [
  { icon: Save, text: 'Every answer, photo, and detail autosaves to your account as you go.' },
  { icon: MessageSquare, text: 'Close the tab anytime — pick the conversation back up where you left off.' },
  { icon: ShieldCheck, text: 'Your draft stays private to you until you choose to publish.' },
];

/**
 * Auth gate shown before the List with Vendi interview begins.
 * The conversation collects listing data and media, so it may only start for a
 * signed-in owner — the draft and every uploaded file belong to their user id
 * from the very first answer.
 */
const VendiAuthGate: React.FC = () => (
  <div className="relative min-h-[80vh] overflow-hidden bg-[#08080a] px-4 py-16 text-white/90">
    <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.18),transparent_65%)] blur-3xl" />
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">List with Vendi</p>
      <h1 className="mt-3 text-2xl font-semibold leading-snug text-white">
        Sign in to start your free Vendi listing
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        We’ll save everything as you go — so you can step away and come back without losing a word.
      </p>

      <div className="mt-7 space-y-3">
        <GoogleContinueButton className="w-full" returnPath={RETURN_PATH} />
        <Button
          asChild
          variant="outline"
          className="w-full border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
        >
          <Link to={`/auth?redirect=${encodeURIComponent(RETURN_PATH)}`}>
            <Mail className="mr-2 h-4 w-4" />
            Continue with email
          </Link>
        </Button>
        <p className="text-center text-xs text-white/45">
          New to Vendibook?{' '}
          <Link
            to={`/auth?mode=signup&redirect=${encodeURIComponent(RETURN_PATH)}`}
            className="text-[#ff7a1a] underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>
        </p>
      </div>

      <ul className="mt-8 space-y-3 border-t border-white/10 pt-6">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-sm text-white/60">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7a1a]" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-white/40">
        Prefer the step-by-step wizard?{' '}
        <Link to="/list/start?path=self" className="underline underline-offset-4 hover:text-white/70">
          Build it myself
        </Link>
      </p>
    </motion.div>
  </div>
);

export default VendiAuthGate;
