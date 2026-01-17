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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.1)] safe-area-bottom">
      <div className="flex items-center gap-2 p-3 pb-safe">
        {/* Filters Button */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10 rounded-lg gap-2 relative"
          onClick={onFiltersClick}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {/* Sort Button with Drawer */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 rounded-lg gap-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="truncate">{currentSortLabel}</span>
            </Button>
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
