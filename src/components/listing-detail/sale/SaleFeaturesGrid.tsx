import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleCard } from './SaleCard';
import { AMENITIES_BY_CATEGORY, type ListingCategory } from '@/types/listing';

interface SaleFeaturesGridProps {
  category: ListingCategory;
  amenities?: string[] | null;
  /** Features shown before the "Show all" toggle. */
  previewCount?: number;
}

/**
 * Compact grouped feature grid for the sale listing body.
 * Collapses to a short preview with a single "Show all" toggle.
 */
export const SaleFeaturesGrid = ({
  category,
  amenities,
  previewCount = 12,
}: SaleFeaturesGridProps) => {
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => {
    if (!amenities?.length) return [];
    const catGroups = AMENITIES_BY_CATEGORY[category] ?? [];
    return catGroups
      .map((g) => ({
        label: g.label,
        items: g.items.filter((i) => amenities.includes(i.id)),
      }))
      .filter((g) => g.items.length > 0);
  }, [category, amenities]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) return null;

  // Trim groups to the preview budget when collapsed.
  let budget = expanded ? Number.POSITIVE_INFINITY : previewCount;
  const visible = groups
    .map((g) => {
      const items = g.items.slice(0, Math.max(0, budget));
      budget -= items.length;
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);

  return (
    <SaleCard padding="lg" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Equipment &amp; features</h2>
        <span className="text-xs text-muted-foreground">{total} included</span>
      </div>

      <div className="space-y-4">
        {visible.map((group) => (
          <div key={group.label}>
            <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 mt-1 shrink-0 text-primary" />
                  <span className="leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {total > previewCount && (
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `Show all ${total} features`}
          <ChevronDown
            className={`h-4 w-4 ml-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
      )}
    </SaleCard>
  );
};

export default SaleFeaturesGrid;
