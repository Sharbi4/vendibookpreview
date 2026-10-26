import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, Zap, Crown, DollarSign, Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AMENITY_OPTIONS = [
  { value: 'generator', label: 'Generator' },
  { value: 'electrical_hookup', label: 'Electric Hookup' },
  { value: 'water_hookup', label: 'Water Hookup' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'parking_available', label: 'Parking' },
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'hood_system', label: 'Hood System' },
  { value: 'three_compartment_sink', label: '3 Compartment Sink' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'security', label: '24/7 Security' },
  { value: 'lighting', label: 'Night Lighting' },
];

export interface FilterValues {
  minPrice: string;
  maxPrice: string;
  instantBookOnly: boolean;
  featuredOnly: boolean;
  deliveryCapable: boolean;
  amenities: string[];
  radiusMiles: string;
}

interface FilterPanelProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onApply: () => void;
  onClear: () => void;
  autoApply?: boolean;
}

export const FilterPanel = ({ filters, onChange, onApply, onClear, autoApply = false }: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFirstRender = useRef(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Auto-apply filters when they change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autoApply) {
      onApply();
    }
  }, [filters, autoApply]);

  const activeCount = [
    filters.minPrice || filters.maxPrice ? 1 : 0,
    filters.instantBookOnly ? 1 : 0,
    filters.featuredOnly ? 1 : 0,
    filters.deliveryCapable ? 1 : 0,
    filters.amenities.length > 0 ? 1 : 0,
    filters.radiusMiles && filters.radiusMiles !== '25' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleToggleAmenity = (amenity: string) => {
    const updated = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    onChange({ ...filters, amenities: updated });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        ref={buttonRef}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 h-11 lg:h-8 px-3 py-1.5 rounded-lg text-sm lg:text-xs font-medium border transition-all ${
          activeCount > 0
            ? 'bg-white text-gray-900 border-white/80 shadow-lg shadow-black/10 font-bold'
            : 'bg-white/10 backdrop-blur border-white/20 text-white/80 hover:text-white hover:bg-white/20'
        }`}
      >
        <SlidersHorizontal className="w-3 h-3" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 w-4 h-4 rounded-full bg-[hsl(14,100%,57%)] text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>

      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ '--filter-top': `${dropdownPos.top}px`, '--filter-left': `${dropdownPos.left}px` } as React.CSSProperties}
            role="dialog" aria-modal="true" aria-label="Filters" className="fixed z-[200] bottom-0 left-0 right-0 max-h-[85dvh] flex flex-col rounded-t-2xl lg:rounded-2xl lg:bottom-auto lg:right-auto lg:top-[var(--filter-top)] lg:left-[var(--filter-left)] lg:w-80 bg-card text-card-foreground border border-border shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Filters</h3>
              <Button variant="ghost" size="icon" aria-label="Close filters" onClick={() => setIsOpen(false)} className="h-11 w-11">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="min-h-0 p-4 space-y-5 overflow-y-auto overscroll-contain">
              {/* Price Range */}
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5" /> Price Range
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
                    className="h-11 text-base rounded-lg"
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
                    className="h-11 text-base rounded-lg"
                  />
                </div>
              </div>

              {/* Search Radius */}
              <div>
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Search Radius
                </Label>
                <Select
                  value={filters.radiusMiles || '25'}
                  onValueChange={(v) => onChange({ ...filters, radiusMiles: v })}
                >
                  <SelectTrigger className="h-11 text-base rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[250]">
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                    <SelectItem value="100">100 miles</SelectItem>
                    <SelectItem value="250">250 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Toggles */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">Quick Filters</Label>
                
                <label className="flex min-h-11 items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={filters.instantBookOnly}
                    onCheckedChange={(v) => onChange({ ...filters, instantBookOnly: !!v })}
                  />
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm text-foreground group-hover:text-foreground">Instant Book Only</span>
                  </div>
                </label>

                <label className="flex min-h-11 items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={filters.featuredOnly}
                    onCheckedChange={(v) => onChange({ ...filters, featuredOnly: !!v })}
                  />
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm text-foreground group-hover:text-foreground">Featured Listings</span>
                  </div>
                </label>

                <label className="flex min-h-11 items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={filters.deliveryCapable}
                    onCheckedChange={(v) => onChange({ ...filters, deliveryCapable: !!v })}
                  />
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-sm text-foreground group-hover:text-foreground">Delivery Available</span>
                  </div>
                </label>
              </div>

              {/* Amenities */}
              <div>
                <Label className="text-xs font-semibold text-foreground mb-2 block">Features & Amenities</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <label key={amenity.value} className="flex min-h-11 items-center gap-2 cursor-pointer group">
                      <Checkbox
                        checked={filters.amenities.includes(amenity.value)}
                        onCheckedChange={() => handleToggleAmenity(amenity.value)}
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground">{amenity.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] border-t border-border bg-card">
              <Button
                variant="ghost"
                onClick={() => { onClear(); }}
                className="h-11 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
              <Button
                size="sm"
                variant="dark-shine"
                onClick={() => { onApply(); setIsOpen(false); }}
                className="h-11 rounded-xl text-sm font-semibold px-6"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
};
