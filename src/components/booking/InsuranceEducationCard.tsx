import { ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Exact partner-neutral URL requested by the business. Do not alter. */
export const FLIP_URL =
  'https://get.fliprogram.com/flip_annual?page=business%20activities&step=1';

interface Props {
  className?: string;
  /** Optional context line, e.g. "This host requires a certificate of insurance." */
  reason?: string;
}

/**
 * Neutral education card shown when Commercial General Liability / COI is
 * required by the host, or when the renter states they do not carry CGL.
 * Vendibook is not an insurer, agent or broker — copy must stay neutral and
 * must not imply a partnership.
 */
export function InsuranceEducationCard({ className, reason }: Props) {
  return (
    <aside
      className={cn(
        'rounded-2xl border border-border/70 bg-[hsl(var(--card))] p-5',
        className,
      )}
      aria-label="Food liability insurance information"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <h4 className="text-sm font-semibold text-foreground">
          Need liability coverage?
        </h4>
      </div>

      {reason && <p className="mt-2 text-sm text-muted-foreground">{reason}</p>}

      <p className="mt-2 text-sm text-muted-foreground">
        FLIP (Food Liability Insurance Program) is a third-party insurance provider that
        offers general liability coverage for food businesses. Vendibook is not the
        insurer, agent, or broker. Eligibility, coverage, and pricing are determined
        solely by FLIP. You may use any other provider that satisfies this host's
        requirement.
      </p>

      <Button asChild variant="outline" size="sm" className="mt-3">
        <a href={FLIP_URL} target="_blank" rel="noopener noreferrer nofollow">
          Explore food liability coverage
          <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
        </a>
      </Button>
    </aside>
  );
}

export default InsuranceEducationCard;
