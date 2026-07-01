import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Truck, Container, ChefHat, Store, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListingCategory } from '@/types/listing';

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
}

export const CategoryPillStrip = ({
  activeCategory,
  onCategoryChange,
  instantBookOnly,
  onInstantBookToggle,
  verifiedHostsOnly,
  onVerifiedToggle}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'l' | 'r') => {
    scrollRef.current?.scrollBy({ left: dir === 'l' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll('l')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="snap-rail snap-rail-center scrollbar-hide flex gap-2 overflow-x-auto py-1 px-1 md:px-10 gpu-layer"
      >
        {CATEGORY_PILLS.map(({ key, label, icon: Icon }) => {
          const active = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => onCategoryChange(key)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[78px] px-3 py-2 rounded-xl transition-all shrink-0 border',
                active
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
            </button>
          );
        })}

        <div className="w-px bg-border/60 mx-1 my-2 shrink-0" />

        <button
          onClick={() => onInstantBookToggle(!instantBookOnly)}
          className={cn(
            'flex flex-col items-center justify-center gap-1 min-w-[78px] px-3 py-2 rounded-xl transition-all shrink-0 border',
            instantBookOnly
              ? 'border-amber-500/60 bg-amber-500/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Zap className={cn('h-5 w-5', instantBookOnly && 'text-amber-500')} />
          <span className="text-[11px] font-medium whitespace-nowrap">Instant Book</span>
        </button>

        <button
          onClick={() => onVerifiedToggle(!verifiedHostsOnly)}
          className={cn(
            'flex flex-col items-center justify-center gap-1 min-w-[78px] px-3 py-2 rounded-xl transition-all shrink-0 border',
            verifiedHostsOnly
              ? 'border-emerald-500/60 bg-emerald-500/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <ShieldCheck className={cn('h-5 w-5', verifiedHostsOnly && 'text-emerald-500')} />
          <span className="text-[11px] font-medium whitespace-nowrap">Verified</span>
        </button>
      </div>

      <button
        onClick={() => scroll('r')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
