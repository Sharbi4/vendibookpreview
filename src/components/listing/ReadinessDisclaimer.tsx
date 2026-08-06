import React from 'react';
import { Info } from 'lucide-react';
import { READINESS_DISCLAIMER } from '@/lib/listings/readiness';
import { cn } from '@/lib/utils';

/**
 * Reusable seller-information disclaimer. Vendibook never claims a listing is
 * verified, certified or inspected by us.
 */
export const ReadinessDisclaimer: React.FC<{ className?: string }> = ({ className }) => (
  <p
    className={cn(
      'flex items-start gap-2 text-xs leading-relaxed text-muted-foreground',
      className,
    )}
  >
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span>{READINESS_DISCLAIMER}</span>
  </p>
);

export default ReadinessDisclaimer;
