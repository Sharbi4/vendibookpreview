import { Link } from 'react-router-dom';
import {
  Coffee,
  IceCreamCone,
  Pizza,
  Flame,
  Snowflake,
  CupSoda,
  CookingPot,
  ArrowRight,
} from 'lucide-react';
import { SPECIALTY_DEFS, type SpecialtyKey } from '@/lib/listings/specialty';

const ICONS: Record<SpecialtyKey, typeof Coffee> = {
  coffee: Coffee,
  ice_cream: IceCreamCone,
  pizza: Pizza,
  bbq: Flame,
  snow_cone: Snowflake,
  beverage: CupSoda,
  mobile_kitchen: CookingPot,
};

const BLURBS: Record<SpecialtyKey, string> = {
  coffee: 'Espresso & beverage builds',
  ice_cream: 'Soft serve & freezer units',
  pizza: 'Wood-fired, deck & conveyor ovens',
  bbq: 'Smokers & barbecue pits',
  snow_cone: 'Shaved ice & snow cone setups',
  beverage: 'Tap, bar & drink trailers',
  mobile_kitchen: 'Full commercial cooking lines',
};

/**
 * Reusable cross-category navigation ("Browse by Business Type", Phase 6).
 * Crawlable HTML links between the national specialty hubs so specialty
 * authority compounds across categories.
 */
const BrowseByBusinessType = ({ exclude }: { exclude?: SpecialtyKey }) => {
  const keys = (Object.keys(SPECIALTY_DEFS) as SpecialtyKey[]).filter((k) => k !== exclude);
  return (
    <section aria-labelledby="business-type-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="business-type-heading" className="text-xl md:text-2xl font-semibold text-foreground">
          Browse by business type
        </h2>
        <p className="text-sm text-muted-foreground">
          Specialty marketplaces for buyers who know exactly what they want to build.
        </p>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {keys.map((k) => {
          const Icon = ICONS[k];
          return (
            <li key={k}>
              <Link
                to={SPECIALTY_DEFS[k].hubPath}
                className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground group-hover:text-primary transition-colors">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground leading-snug">
                  {SPECIALTY_DEFS[k].pluralTitle}
                </span>
                <span className="text-xs text-muted-foreground">{BLURBS[k]}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Browse <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default BrowseByBusinessType;
