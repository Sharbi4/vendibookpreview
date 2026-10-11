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
  <div className="sale-light relative min-h-[80vh] overflow-hidden bg-background px-4 py-16 text-foreground">
    <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.12),transparent_65%)] blur-3xl" />
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-md rounded-[28px] border border-border bg-card p-8 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_26px_60px_-30px_rgba(24,20,16,0.30)]"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">List with Vendi</p>
      <h1 className="mt-3 text-2xl font-semibold leading-snug text-foreground">
        Sign in to start your free Vendi listing
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We’ll save everything as you go — so you can step away and come back without losing a word.
      </p>

      <div className="mt-7 space-y-3">
        <GoogleContinueButton className="w-full" returnPath={RETURN_PATH} />
        <Button
          asChild
          variant="outline"
          className="w-full"
        >
          <Link to={`/auth?redirect=${encodeURIComponent(RETURN_PATH)}`}>
            <Mail className="mr-2 h-4 w-4" />
            Continue with email
          </Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          New to Vendibook?{' '}
          <Link
            to={`/auth?mode=signup&redirect=${encodeURIComponent(RETURN_PATH)}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>
        </p>
      </div>

      <ul className="mt-8 space-y-3 border-t border-border pt-6">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-sm text-muted-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Prefer the step-by-step wizard?{' '}
        <Link to="/list/start?path=self" className="underline underline-offset-4 hover:text-foreground">
          Build it myself
        </Link>
      </p>
    </motion.div>
  </div>
);

export default VendiAuthGate;
