import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

import type { StatusTone } from './statusTone';

export type { StatusTone };

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-[#F3EEE7] text-[#1C1B1A]', dot: 'bg-[#8A847B]' },
  ok: { pill: 'bg-[#E9F3EC] text-[#1F6B43]', dot: 'bg-[#2E8B57]' },
  warn: { pill: 'bg-[#FBF1DC] text-[#7A4F00]', dot: 'bg-[#C98A0B]' },
  alert: { pill: 'bg-[#FCEBEA] text-[#9F1F15]', dot: 'bg-[#D92D20]' },
  accent: { pill: 'bg-[#FFEEE7] text-[#B93A12]', dot: 'bg-[#FF5124]' },
  muted: { pill: 'bg-transparent text-[#8A847B] ring-1 ring-inset ring-[#E2DBD0]', dot: 'bg-[#B5AEA4]' },
};

export interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  /** Leading status dot. On by default. */
  dot?: boolean;
  className?: string;
}

/** Compact status label: "Live", "Draft", "Paid", "Past due". Text carries the meaning; colour supports it. */
export function StatusPill({ tone = 'neutral', children, dot = true, className }: StatusPillProps) {
  const t = TONES[tone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold leading-4', t.pill, className)}>
      {dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
