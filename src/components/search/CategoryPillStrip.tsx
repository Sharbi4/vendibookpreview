import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Truck, Container, ChefHat, Store, Zap, ShieldCheck, Coffee, IceCreamCone, Pizza, Flame, Snowflake, CupSoda, CookingPot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListingCategory } from '@/types/listing';
import { SPECIALTY_VEHICLE_SHORT_LABELS, type SpecialtyKey, type SpecialtyVehicle } from '@/lib/listings/specialty';

// Specialty collection shortcuts — these set the same deep-link state
// (specialty query + vehicle category + sale mode) used by hub headers and
// listing-card chips, so navigation stays consistent across the marketplace.
const SPECIALTY_PILLS: { key: SpecialtyKey; vehicle: SpecialtyVehicle; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'coffee', vehicle: 'truck', icon: Coffee },
  { key: 'coffee', vehicle: 'trailer', icon: Coffee },
  { key: 'ice_cream', vehicle: 'truck', icon: IceCreamCone },
  { key: 'ice_cream', vehicle: 'trailer', icon: IceCreamCone },
  { key: 'pizza', vehicle: 'truck', icon: Pizza },
  { key: 'pizza', vehicle: 'trailer', icon: Pizza },
  { key: 'bbq', vehicle: 'truck', icon: Flame },
  { key: 'bbq', vehicle: 'trailer', icon: Flame },
  { key: 'snow_cone', vehicle: 'truck', icon: Snowflake },
  { key: 'snow_cone', vehicle: 'trailer', icon: Snowflake },
  { key: 'beverage', vehicle: 'truck', icon: CupSoda },
  { key: 'beverage', vehicle: 'trailer', icon: CupSoda },
  { key: 'mobile_kitchen', vehicle: 'truck', icon: CookingPot },
  { key: 'mobile_kitchen', vehicle: 'trailer', icon: CookingPot },
];

interface PillItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_PILLS: PillItem[] = [
  { key: 'all', label: 'All', icon: ShieldCheck },
  { key: 'food_truck', label: 'Food Trucks', icon: Truck },
  { key: 'food_trailer', label: 'Food Trailers', icon: Container },
  { key: 'ghost_kitchen', label: 'Shared Kitchens', icon: ChefHat },
  { key: 'vendor_space', label: 'Vendor Spaces', icon: Store }];

interface Props {
  activeCategory: string;
  onCategoryChange: (key: string) => void;
  instantBookOnly: boolean;
  onInstantBookToggle: (v: boolean) => void;
  verifiedHostsOnly: boolean;
  onVerifiedToggle: (v: boolean) => void;
  /** Currently applied specialty browse state, if the search matches one. */
  activeSpecialty?: { key: SpecialtyKey; vehicle: SpecialtyVehicle } | null;
  onSpecialtySelect?: (key: SpecialtyKey, vehicle: SpecialtyVehicle) => void;
  /** Clears the active specialty filter (query + vehicle category + mode). */
  onSpecialtyClear?: () => void;
}

export const CategoryPillStrip = ({
  activeCategory,
  onCategoryChange,
  instantBookOnly,
  onInstantBookToggle,
  verifiedHostsOnly,
  onVerifiedToggle,
  activeSpecialty,
  onSpecialtySelect,
  onSpecialtyClear}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'l' | 'r') => {
    scrollRef.current?.scrollBy({ left: dir === 'l' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll('l')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-white/80 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/[0.12]"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="snap-rail snap-rail-center scrollbar-hide flex items-end gap-1 overflow-x-auto scroll-smooth py-1 px-1 md:px-10 gpu-layer"
      >
        {CATEGORY_PILLS.map(({ key, label, icon: Icon }) => {
          const active = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => onCategoryChange(key)}
              className={cn(
                'group/pill relative flex flex-col items-center justify-center gap-1.5 min-w-[82px] px-3 pt-2 pb-2.5 rounded-2xl border-0 shrink-0 transition-all duration-200 ease-out',
                active
                  ? 'text-foreground'
                  : 'text-foreground/75 hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-colors duration-200', active ? 'text-primary' : 'opacity-90 group-hover/pill:opacity-100')} />
              <span className="text-[11.5px] font-semibold tracking-tight whitespace-nowrap">{label}</span>
              <span
                className={cn(
                  'absolute inset-x-2.5 bottom-0 h-[2px] rounded-full transition-all duration-200',
                  active ? 'bg-primary opacity-100' : 'bg-foreground/30 opacity-0 group-hover/pill:opacity-100',
                )}
              />
            </button>
          );
        })}

        <div className="w-px bg-white/10 mx-2 my-2 shrink-0" />

        {onSpecialtySelect && SPECIALTY_PILLS.map(({ key, vehicle, icon: Icon }) => {
          const active = activeSpecialty?.key === key && activeSpecialty?.vehicle === vehicle;
          return (
            <button
              key={`${key}-${vehicle}`}
              onClick={() => (active && onSpecialtyClear ? onSpecialtyClear() : onSpecialtySelect(key, vehicle))}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out self-center',
                active
                  ? 'border-primary/50 bg-primary/12 text-foreground'
                  : 'border-white/12 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.07]'
              )}
              aria-pressed={active}
            >
              <Icon className={cn('h-4 w-4', active && 'text-primary')} />
              <span>{SPECIALTY_VEHICLE_SHORT_LABELS[key][vehicle]}</span>
            </button>
          );
        })}

        {/* Always-visible clear control whenever a specialty filter is applied —
            same pill geometry as the specialty pills it resets. */}
        {onSpecialtyClear && activeSpecialty && (
          <button
            onClick={onSpecialtyClear}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-primary/50 bg-primary/12 text-foreground text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out self-center hover:bg-primary/20"
            aria-label="Clear specialty filters"
          >
            <X className="h-4 w-4 text-primary" />
            <span>Clear specialty filters</span>
          </button>
        )}

        <div className="w-px bg-white/10 mx-2 my-2 shrink-0" />

        <button
          onClick={() => onInstantBookToggle(!instantBookOnly)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out self-center',
            instantBookOnly
              ? 'border-primary/50 bg-primary/12 text-foreground'
              : 'border-white/12 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.07]'
          )}
        >
          <Zap className={cn('h-4 w-4', instantBookOnly && 'text-primary')} />
          <span>Instant Book</span>
        </button>

        <button
          onClick={() => onVerifiedToggle(!verifiedHostsOnly)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 ease-out self-center',
            verifiedHostsOnly
              ? 'border-emerald-500/50 bg-emerald-500/12 text-foreground'
              : 'border-white/12 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.07]'
          )}
        >
          <ShieldCheck className={cn('h-4 w-4', verifiedHostsOnly && 'text-emerald-500')} />
          <span>Identity Verified</span>
        </button>
      </div>

      <button
        onClick={() => scroll('r')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-white/80 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/[0.12]"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
