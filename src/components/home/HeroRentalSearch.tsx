import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChefHat, Truck, Calendar as CalendarIcon, ChevronDown, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-food-truck.jpg';
import type { DateRange } from 'react-day-picker';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';

// --- Sub-Components ---

const SearchTab = ({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: any; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
      active
        ? "bg-white text-foreground shadow-md"
        : "bg-white/10 text-white/80 hover:bg-white/20"
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

// --- Main Component ---

const HeroRentalSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; coordinates: [number, number] } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<'rent' | 'buy'>('rent');
  const [assetType, setAssetType] = useState('all');
  const [isDateOpen, setIsDateOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    if (selectedLocation) {
      params.set('lat', selectedLocation.coordinates[1].toString());
      params.set('lng', selectedLocation.coordinates[0].toString());
      params.set('radius', '100'); // Default 100 mile radius
    }
    if (dateRange?.from) params.set('start', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('end', format(dateRange.to, 'yyyy-MM-dd'));
    if (assetType !== 'all') params.set('category', assetType);
    params.set('mode', activeTab === 'rent' ? 'rent' : 'sale');
    navigate(`/search?${params.toString()}`);
  };

  const handleLocationSelect = (loc: { name: string; coordinates: [number, number] } | null) => {
    setSelectedLocation(loc);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange?.from) return "Add dates";
    if (!dateRange.to) return format(dateRange.from, "MMM d");
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM d");
    }
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden mx-0 my-0 md:m-4 rounded-none md:rounded-[40px] lg:rounded-[60px] z-0">
      {/* Background Image with refined gradient */}
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="Food truck at sunset" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 text-center">
        {/* Headline Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
            Rent it. Buy it. Find your spot.
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light">
            From turnkey rentals and trucks for sale to premium food truck parks—launch your food business this weekend with verified assets and spaces.
          </p>
        </motion.div>

        {/* Search Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          {/* Mode Toggles */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 p-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <SearchTab
                active={activeTab === 'rent'}
                label="Rent"
                icon={Store}
                onClick={() => setActiveTab('rent')}
              />
              <SearchTab
                active={activeTab === 'buy'}
                label="Buy"
                icon={Truck}
                onClick={() => setActiveTab('buy')}
              />
            </div>
          </div>

          {/* Search Bar - The "Island" */}
          <div className="bg-white rounded-2xl md:rounded-full shadow-2xl p-3 md:p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0">
            {/* Location Input with Geolocation */}
            <div className="flex-1 px-2 py-1 md:py-0 md:border-r border-border">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-0.5 px-2 pt-2">
                Location
              </label>
              <LocationSearchInput
                value={location}
                onChange={setLocation}
                onLocationSelect={handleLocationSelect}
                selectedCoordinates={selectedLocation?.coordinates || null}
                placeholder="City, Zip, or use current location"
                className="[&_input]:border-0 [&_input]:shadow-none [&_input]:bg-transparent [&_input]:py-1.5 [&_input]:text-base [&_input]:font-medium [&>div]:space-y-0"
              />
            </div>

            {/* Asset Type Selector */}
            <div className="flex-1 px-4 py-3 md:py-2 md:border-r border-border">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-0.5">
                Type
              </label>
              <div className="flex items-center gap-2 relative">
                {assetType === 'ghost_kitchen' ? (
                  <ChefHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-foreground focus:ring-0 text-base font-medium outline-none cursor-pointer appearance-none truncate pr-4"
                >
                  <option value="all">Everything</option>
                  <option value="food_truck">Food Trucks</option>
                  <option value="food_trailer">Trailers</option>
                  <option value="ghost_kitchen">Commercial Kitchens</option>
                  <option value="vendor_space">Vendor Spaces</option>
                </select>
                <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-0 pointer-events-none" />
              </div>
            </div>

            {/* Date Range Input (Only for Rentals) */}
            <AnimatePresence>
              {activeTab === 'rent' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 px-4 py-3 md:py-2 md:border-r border-border overflow-hidden"
                >
                  <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full text-left">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                          Dates
                        </span>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className={cn("text-base font-medium truncate", dateRange?.from ? "text-foreground" : "text-muted-foreground/60")}>
                            {formatDateRange()}
                          </span>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        disabled={(date) => date < new Date()}
                        numberOfMonths={2}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Button */}
            <div className="p-1">
              <Button
                onClick={handleSearch}
                size="lg"
                className="rounded-full h-12 w-full md:h-14 md:w-auto md:px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <Search className="h-5 w-5 md:mr-2" />
                <span className="md:hidden">Search</span>
                <span className="hidden md:inline">Find Spaces</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default HeroRentalSearch;
