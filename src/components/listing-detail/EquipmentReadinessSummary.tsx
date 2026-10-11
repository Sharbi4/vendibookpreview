import React from 'react';
import { Check, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListingSpecs } from '@/hooks/useListingSpecs';
import {
  READINESS_DISCLAIMER,
  READINESS_LABELS,
  sectionFilledCount,
  sectionsForListing,
  SpecField,
} from '@/lib/listings/readiness';
import { buildEquipmentSummary } from '@/lib/listings/publicSummary';

interface EquipmentReadinessSummaryProps {
  listingId: string;
  category?: string | null;
  mode?: string | null;
}

const formatValue = (field: SpecField, value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : null;
  return field.unit ? `${value} ${field.unit}` : String(value);
};

/**
 * Public, seller-confirmed equipment detail.
 *
 * The top panel is the curated readiness summary (power, water, hood, title,
 * condition). Below it, each confirmed section is listed in full. Unconfirmed
 * AI suggestions and private ownership data are never rendered here.
 */
export const EquipmentReadinessSummary: React.FC<EquipmentReadinessSummaryProps> = ({
  listingId,
  category,
  mode,
}) => {
  const { values, confirmedSections, readiness, loading } = useListingSpecs({
    listingId,
    category,
    mode,
  });

  if (loading) return null;

  const sections = sectionsForListing(category, mode).filter(
    (s) => !s.custom && confirmedSections.includes(s.key) && sectionFilledCount(s, values) > 0,
  );

  const summaryRows = buildEquipmentSummary({
    category,
    mode,
    values,
    confirmedSections,
    ownershipPublic: (values.ownership_public as Record<string, unknown>) ?? null,
  });
  const hasSummary = summaryRows.some((r) => !r.unknown);

  if (sections.length === 0 && !hasSummary) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Equipment and readiness</h2>
        <Badge variant="secondary">{READINESS_LABELS[readiness.level]}</Badge>
      </div>

      {hasSummary && (
        <dl className="mt-4 divide-y divide-border/50">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <dt className="w-full text-sm text-muted-foreground sm:w-56 sm:shrink-0">
                {row.label}
              </dt>
              <dd
                className={`text-sm ${row.unknown ? 'italic text-muted-foreground/80' : 'text-foreground'}`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {sections.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {sections.map((section) => {
            const bucket = values[section.key] ?? {};
            const rows = section.fields
              .map((f) => ({ field: f, text: formatValue(f, bucket[f.key]) }))
              .filter((r) => r.text !== null);
            if (rows.length === 0) return null;
            return (
              <div key={section.key}>
                <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
                <dl className="mt-2 space-y-1.5">
                  {rows.map(({ field, text }) => (
                    <div key={field.key} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <dt className="text-muted-foreground">{field.label}:</dt>
                      <dd className="text-foreground">{text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">{READINESS_DISCLAIMER}</p>
      </div>
    </section>
  );
};

export default EquipmentReadinessSummary;
