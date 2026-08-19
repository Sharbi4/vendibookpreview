import { useMemo } from 'react';
import {
  Ruler,
  Scale,
  Gauge,
  Calendar,
  Truck,
  Link2,
  Plug,
  Zap,
  Droplets,
  Flame,
  Wrench,
} from 'lucide-react';
import { SaleCard } from './SaleCard';
import { useListingSpecs } from '@/hooks/useListingSpecs';
import { formatDimensionSummary, formatFeetInches } from '@/lib/listings/dimensions';

interface SaleQuickSpecsProps {
  listing: any;
}

interface Row {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^not sure$/i.test(s) || /^none$/i.test(s)) return null;
  return s;
};

/**
 * Compact "Quick specs" grid for a for-sale listing.
 *
 * Pulls the durable columns off `listings` and merges the seller-confirmed
 * `listing_specs` buckets (vehicle / trailer / utilities / dimensions) so
 * buyers see GVWR, axles, hitch, power, water and propane in one place.
 * Rows only render when data exists.
 */
export const SaleQuickSpecs = ({ listing }: SaleQuickSpecsProps) => {
  const { values, loading } = useListingSpecs({
    listingId: listing?.id,
    category: listing?.category,
    mode: listing?.mode,
  });

  const rows = useMemo<Row[]>(() => {
    const v = (values || {}) as Record<string, Record<string, unknown>>;
    const vehicle = v.vehicle ?? {};
    const trailer = v.trailer ?? {};
    const utilities = v.utilities ?? {};
    const dims = v.dimensions ?? {};
    const space = v.space ?? {};

    const out: Row[] = [];
    const push = (label: string, value: string | null, icon: Row['icon']) => {
      if (value) out.push({ label, value, icon });
    };

    // Year / make / model
    const year = num(listing?.year_built) ?? num(vehicle.year) ?? num(dims.kitchen_build_year);
    push('Year', year ? String(year) : null, Calendar);

    // Dimensions
    const summary = formatDimensionSummary(
      listing?.length_inches,
      listing?.width_inches,
      listing?.height_inches,
    );
    const fallbackLen = num(trailer.length_ft) ?? num(space.overall_length_ft) ?? num(space.box_length_ft);
    const fallbackWidth = num(trailer.width_ft) ?? num(space.width_ft);
    const fallbackHeight = num(trailer.interior_height_ft) ?? num(space.height_ft);
    const fallbackSummary = [
      fallbackLen ? `${fallbackLen}' L` : null,
      fallbackWidth ? `${fallbackWidth}' W` : null,
      fallbackHeight ? `${fallbackHeight}' H` : null,
    ]
      .filter(Boolean)
      .join(' × ');
    push('Dimensions', summary || fallbackSummary || null, Ruler);

    // Individual dimensions when a full summary isn't available
    if (!summary && !fallbackSummary) {
      push('Length', formatFeetInches(listing?.length_inches), Ruler);
      push('Width', formatFeetInches(listing?.width_inches), Ruler);
      push('Height', formatFeetInches(listing?.height_inches), Ruler);
    }

    // Weight + GVWR
    const weight = num(listing?.weight_lbs) ?? num(trailer.dry_weight_lbs);
    push('Weight', weight ? `${weight.toLocaleString()} lbs` : null, Scale);
    const gvwr = num(vehicle.gvwr_lbs) ?? num(trailer.gvwr_lbs);
    push('GVWR', gvwr ? `${gvwr.toLocaleString()} lbs` : null, Gauge);

    // Mileage / drivetrain
    const mileage = num(listing?.mileage);
    push('Mileage', mileage ? `${mileage.toLocaleString()} mi` : null, Truck);
    push('Fuel', text(listing?.fuel_type) ?? text(vehicle.fuel_type), Flame);
    push('Transmission', text(vehicle.transmission), Wrench);

    // Trailer running gear
    const axles = num(trailer.axles);
    push('Axles', axles ? String(axles) : null, Truck);
    push('Hitch', text(trailer.hitch_type), Link2);
    push('Ball size', text(trailer.ball_size), Link2);

    // Electrical
    push('Electrical service', text(utilities.shore_power), Plug);
    const genPresent = utilities.generator_present === true;
    const genLabel = text(utilities.generator_model) ?? (genPresent ? 'On board' : null);
    push('Generator', genLabel, Zap);

    // Water + propane
    const fresh = num(utilities.fresh_water_gal);
    const grey = num(utilities.grey_water_gal);
    push('Fresh water', fresh ? `${fresh} gal` : null, Droplets);
    push('Waste water', grey ? `${grey} gal` : null, Droplets);
    const tanks = num(utilities.propane_tank_count);
    const tankSize = text(utilities.propane_tank_size);
    const propane = tanks
      ? `${tanks} tank${tanks > 1 ? 's' : ''}${tankSize ? ` · ${tankSize}` : ''}`
      : tankSize;
    push('Propane', propane, Flame);

    return out;
  }, [values, listing]);

  if (loading || rows.length === 0) return null;

  return (
    <SaleCard padding="lg" className="space-y-3">
      <h2 className="text-lg font-semibold">Quick specs</h2>
      <div className="grid sm:grid-cols-2 gap-x-10">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-center gap-3 py-2.5 border-b border-border/60"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-right">{row.value}</span>
            </div>
          );
        })}
      </div>
    </SaleCard>
  );
};

export default SaleQuickSpecs;
