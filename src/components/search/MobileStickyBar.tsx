import { SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';

interface MobileStickyBarProps {
  activeFiltersCount: number;
  sortBy: 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance';
  onSortChange: (value: string) => void;
  onFiltersClick: () => void;
  hasLocation: boolean;
  hasSearchQuery: boolean;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export const MobileStickyBar = ({
  activeFiltersCount,
  sortBy,
  onSortChange,
  onFiltersClick,
  hasLocation,
  hasSearchQuery,
}: MobileStickyBarProps) => {
  const sortOptions = [
    ...SORT_OPTIONS,
    ...(hasLocation ? [{ value: 'distance', label: 'Distance' }] : []),
    ...(hasSearchQuery ? [{ value: 'relevance', label: 'Relevance' }] : []),
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Newest';

  const hidden = useHideOnScroll(48);

  return (
    <div
      data-hidden={hidden}
      className="sticky-autohide gpu-layer fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-2 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-1.5 rounded-full border border-white/12 bg-background/80 p-1.5 shadow-[0_10px_34px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl">
        {/* Filters Button */}
        <button
          type="button"
          className="relative flex-1 h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-white/[0.07] no-tap-highlight"
          onClick={onFiltersClick}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="ml-0.5 h-5 min-w-5 px-1 bg-primary text-primary-foreground text-[11px] rounded-full inline-flex items-center justify-center font-semibold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <span className="h-6 w-px bg-white/12 shrink-0" aria-hidden />

        {/* Sort Button with Drawer */}
        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              className="flex-1 h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-white/[0.07] no-tap-highlight"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="truncate">{currentSortLabel}</span>
            </button>
          </DrawerTrigger>

          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Sort by</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors",
                    sortBy === option.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};

export default MobileStickyBar;
