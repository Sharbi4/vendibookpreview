import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListingSpecs } from '@/hooks/useListingSpecs';
import {
  READINESS_DISCLAIMER,
  READINESS_LABELS,
  sectionFilledCount,
  sectionsForListing,
  SpecField,
} from '@/lib/listings/readiness';

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
 * Public, seller-confirmed equipment detail. Unconfirmed suggestions are never
 * rendered here.
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
    (s) => confirmedSections.includes(s.key) && sectionFilledCount(s, values) > 0,
  );

  if (sections.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Equipment and readiness</h2>
        <Badge variant="secondary">{READINESS_LABELS[readiness.level]}</Badge>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
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

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{READINESS_DISCLAIMER}</p>
    </section>
  );
};

export default EquipmentReadinessSummary;
