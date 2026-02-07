import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChefHat, Truck, Calendar as CalendarIcon, ChevronDown, Store, Handshake, Sparkles } from 'lucide-react';
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

  const openZendeskChat = () => {
    if (window.zE) {
      try {
        window.zE('messenger', 'open');
      } catch (error) {
        console.debug('Zendesk messenger open:', error);
      }
    }
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

      <div className="relative z-10 container max-w-5xl mx-auto px-4 text-center">
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

        {/* Two-Path Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="grid md:grid-cols-5 gap-4 md:gap-6"
        >
          {/* Path 1: Browse - Clear Glass - Takes 3 columns */}
          <div
            className="md:col-span-3 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white text-lg">Browse</h3>
                <p className="text-xs text-white/70">Search our verified marketplace</p>
              </div>
            </div>

            {/* Mode Toggles */}
            <div className="flex justify-start mb-4">
              <div className="inline-flex items-center gap-1 p-1 bg-white/10 rounded-full border border-white/10">
                <button
                  onClick={() => setActiveTab('rent')}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    activeTab === 'rent'
                      ? "bg-white text-foreground shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Store className="h-4 w-4" />
                  Rent
                </button>
                <button
                  onClick={() => setActiveTab('buy')}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    activeTab === 'buy'
                      ? "bg-white text-foreground shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Truck className="h-4 w-4" />
                  Buy
                </button>
              </div>
            </div>

            {/* Search Fields */}
            <div className="space-y-3">
              {/* Location Input */}
              <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                <label className="block text-[10px] uppercase tracking-wider text-white/60 font-semibold text-left mb-0.5">
                  Location
                </label>
                <LocationSearchInput
                  value={location}
                  onChange={setLocation}
                  onLocationSelect={handleLocationSelect}
                  selectedCoordinates={selectedLocation?.coordinates || null}
                  placeholder="City, Zip, or current location"
                  className="[&_input]:border-0 [&_input]:shadow-none [&_input]:bg-transparent [&_input]:py-1 [&_input]:text-sm [&_input]:font-medium [&_input]:text-white [&_input]:placeholder:text-white/50 [&>div]:space-y-0"
                />
              </div>

              {/* Asset Type & Dates Row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Asset Type */}
                <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <label className="block text-[10px] uppercase tracking-wider text-white/60 font-semibold text-left mb-0.5">
                    Type
                  </label>
                  <div className="flex items-center gap-2 relative">
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-white focus:ring-0 text-sm font-medium outline-none cursor-pointer appearance-none truncate pr-4"
                    >
                      <option value="all" className="text-foreground">Everything</option>
                      <option value="food_truck" className="text-foreground">Food Trucks</option>
                      <option value="food_trailer" className="text-foreground">Trailers</option>
                      <option value="ghost_kitchen" className="text-foreground">Kitchens</option>
                      <option value="vendor_space" className="text-foreground">Vendor Spaces</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-white/60 absolute right-0 pointer-events-none" />
                  </div>
                </div>

                {/* Dates (Rent only) */}
                <AnimatePresence mode="wait">
                  {activeTab === 'rent' ? (
                    <motion.div
                      key="dates"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/10 rounded-xl px-3 py-2 border border-white/10"
                    >
                      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                        <PopoverTrigger asChild>
                          <button className="w-full text-left">
                            <span className="block text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-0.5">
                              Dates
                            </span>
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-4 w-4 text-white/60 flex-shrink-0" />
                              <span className={cn("text-sm font-medium truncate", dateRange?.from ? "text-white" : "text-white/50")}>
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
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 flex items-center justify-center"
                    >
                      <span className="text-xs text-white/50">No dates needed</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Button - Orange to match */}
              <Button
                onClick={handleSearch}
                size="lg"
                className="w-full rounded-xl h-12 bg-orange-500 hover:bg-orange-400 text-white font-semibold shadow-lg shadow-orange-500/25"
              >
                <Search className="h-5 w-5 mr-2" />
                Search the Marketplace
              </Button>
            </div>
          </div>

          {/* Path 2: Let Us Match You - Clear Glass with Orange Accents - Takes 2 columns */}
          <div 
            className="md:col-span-2 rounded-3xl p-5 md:p-6 shadow-2xl border border-white/20 flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Handshake className="h-5 w-5 text-orange-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white text-lg">Let Us Match You</h3>
                <p className="text-xs text-white/70">Done-for-you concierge service</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center text-left space-y-4">
              <div>
                <h4 className="text-xl md:text-2xl font-semibold text-white mb-2">
                  Don't have time to search?
                </h4>
                <p className="text-white/80 text-sm md:text-base leading-relaxed">
                  Our experts will manually find the best deal for your specific needs. Tell us what you're looking for, and we'll do the legwork.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-white/90">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  <span>Personalized asset recommendations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  <span>Price negotiation on your behalf</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400 flex-shrink-0" />
                  <span>No sign-up required</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={openZendeskChat}
              size="lg"
              className="w-full rounded-xl h-12 bg-orange-500 hover:bg-orange-400 text-white font-semibold shadow-lg shadow-orange-500/25 mt-4"
            >
              <Handshake className="h-5 w-5 mr-2" />
              Match Me
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default HeroRentalSearch;
