import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublishBlockerDetail } from '@/lib/vendi-listing/script';

interface PrePublishChecklistProps {
  blockers: PublishBlockerDetail[];
  /** Reopens the exact interview question that resolves a blocker. */
  onGoToQuestion: (questionId: string) => void;
  className?: string;
}

/**
 * Pre-publish checklist for "List with Vendi".
 *
 * Shows every missing publish requirement in plain language and links each one
 * to the exact question that fixes it, so the seller never has to guess which
 * answer is missing. The requirements come from the shared publish-parity
 * module, so this list is always identical to the manual wizard's gate.
 */
export const PrePublishChecklist = ({ blockers, onGoToQuestion, className }: PrePublishChecklistProps) => {
  if (!blockers.length) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border border-emerald-600/25 bg-emerald-500/[0.07] px-4 py-3',
          className,
        )}
      >
        <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" aria-hidden />
        <p className="text-sm text-foreground/90">Everything required to publish is answered.</p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="vendi-prepublish-heading"
      className={cn('rounded-2xl border border-destructive/25 bg-destructive/[0.05] p-4 sm:p-5', className)}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-none text-destructive" aria-hidden />
        <h3 id="vendi-prepublish-heading" className="text-sm font-semibold tracking-[-0.01em]">
          {blockers.length} thing{blockers.length === 1 ? '' : 's'} left before you can publish
        </h3>
      </div>
      <ul className="mt-3 space-y-1.5">
        {blockers.map((b) => (
          <li
            key={`${b.id}-${b.message}`}
            className="flex items-start gap-3 rounded-xl bg-background/60 px-3 py-2"
          >
            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-destructive/70" />
            <span className="min-w-0 flex-1 text-sm leading-relaxed text-foreground/90">{b.message}</span>
            {b.questionId && (
              <button
                type="button"
                onClick={() => onGoToQuestion(b.questionId as string)}
                className="flex-none rounded-full px-2 py-0.5 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Fix this
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PrePublishChecklist;
