import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNextAction,
  type Role,
  type TransactionPhase,
} from '@/lib/transactionVocabulary';

interface NextActionBannerProps {
  phase: TransactionPhase;
  role: Role;
  className?: string;
}

/**
 * One-line "what to do next" banner derived from the unified
 * transaction vocabulary. Render near the top of any booking
 * or transaction card so users never have to guess what's next.
 */
export const NextActionBanner = ({
  phase,
  role,
  className,
}: NextActionBannerProps) => {
  const copy = getNextAction(phase, role);
  if (!copy) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm',
        className,
      )}
    >
      <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <span className="text-foreground/90 leading-snug">{copy}</span>
    </div>
  );
};

export default NextActionBanner;
