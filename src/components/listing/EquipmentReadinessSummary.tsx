import React from 'react';
import { Info } from 'lucide-react';
import { buildEquipmentSummary, SummaryInput } from '@/lib/listings/publicSummary';
import ReadinessDisclaimer from '@/components/listing/ReadinessDisclaimer';

interface Props extends SummaryInput {
  className?: string;
}

/**
 * Buyer-facing equipment readiness panel. Rendered only from seller-confirmed
 * structured fields — VendiBook makes no claim about condition or inspection.
 */
export const EquipmentReadinessSummary: React.FC<Props> = ({ className, ...input }) => {
  const rows = buildEquipmentSummary(input);
  const known = rows.filter((r) => !r.unknown);
  if (known.length === 0) return null;

  return (
    <section className={`rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm ${className ?? ''}`}>
      <h2 className="text-lg font-semibold text-foreground">Equipment readiness</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Details the seller has confirmed about this unit.
      </p>

      <dl className="mt-4 divide-y divide-border/50">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
            <dt className="w-full text-sm text-muted-foreground sm:w-56 sm:shrink-0">{row.label}</dt>
            <dd className={`text-sm ${row.unknown ? 'italic text-muted-foreground/80' : 'text-foreground'}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <ReadinessDisclaimer className="!m-0" />
      </div>
    </section>
  );
};

export default EquipmentReadinessSummary;
