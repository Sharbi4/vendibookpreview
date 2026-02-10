import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChefHat, Truck, Calendar as CalendarIcon, ChevronDown, Store, Handshake, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { AuthWalkthrough } from '@/components/auth/AuthWalkthrough';
import vendibookLogo from '@/assets/vendibook-logo.png';

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
      params.set('radius', '100');
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

  const formatDateRange = () => {
    if (!dateRange?.from) return "Add dates";
    if (!dateRange.to) return format(dateRange.from, "MMM d");
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM d");
    }
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-vendibook-cream via-background to-muted/30">
      {/* Decorative background orbs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 -right-32 w-[30rem] h-[30rem] bg-vendibook-orange/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-primary/3 rounded-full blur-3xl" />
      
      {/* Animated orange glow that drifts across the hero */}
      <motion.div
        className="absolute w-[35rem] h-[35rem] rounded-full blur-[120px] opacity-[0.12]"
        style={{ background: 'radial-gradient(circle, hsl(var(--vendibook-orange)), transparent 70%)' }}
        animate={{
          x: ['-20%', '60%', '20%', '-20%'],
          y: ['-10%', '30%', '-20%', '-10%'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-[25rem] h-[25rem] rounded-full blur-[100px] opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
        animate={{
          x: ['50%', '-30%', '40%', '50%'],
          y: ['20%', '-15%', '35%', '20%'],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Logo & Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-10 md:mb-14"
        >
          <img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-56 md:h-72 w-auto mx-auto mb-6 transition-transform duration-300 hover:scale-105"
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-4">
            Rent it. Buy it. <span className="gradient-text-warm">Find your spot.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            From turnkey rentals and trucks for sale to premium food truck parks—launch your food business this weekend.
          </p>
        </motion.div>

        {/* Two-Path Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="grid lg:grid-cols-5 gap-6"
        >
          {/* Left: Search Card - Glassmorphism */}
          <div className="lg:col-span-3 glass-premium rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground text-lg">Browse</h3>
                <p className="text-xs text-muted-foreground">Search our verified marketplace</p>
              </div>
            </div>

            {/* Mode Toggles */}
            <div className="flex justify-start mb-4">
              <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-full border border-border/30">
                <button
                  onClick={() => setActiveTab('rent')}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    activeTab === 'rent'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
              <div className="bg-muted/40 rounded-xl px-3 py-2 border border-border">
                <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-0.5">
                  Location
                </label>
                <LocationSearchInput
                  value={location}
                  onChange={setLocation}
                  onLocationSelect={handleLocationSelect}
                  selectedCoordinates={selectedLocation?.coordinates || null}
                  placeholder="City, Zip, or current location"
                  className="[&_input]:border-0 [&_input]:shadow-none [&_input]:bg-transparent [&_input]:py-1 [&_input]:text-sm [&_input]:font-medium [&_input]:text-foreground [&_input]:placeholder:text-muted-foreground/60 [&>div]:space-y-0"
                />
              </div>

              {/* Asset Type & Dates Row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Asset Type */}
                <div className="bg-muted/40 rounded-xl px-3 py-2 border border-border">
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-0.5">
                    Type
                  </label>
                  <div className="flex items-center gap-2 relative">
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-foreground focus:ring-0 text-sm font-medium outline-none cursor-pointer appearance-none truncate pr-4"
                    >
                      <option value="all">Everything</option>
                      <option value="food_truck">Food Trucks</option>
                      <option value="food_trailer">Trailers</option>
                      <option value="ghost_kitchen">Kitchens</option>
                      <option value="vendor_space">Vendor Spaces</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-0 pointer-events-none" />
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
                      className="bg-muted/40 rounded-xl px-3 py-2 border border-border"
                    >
                      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                        <PopoverTrigger asChild>
                          <button className="w-full text-left">
                            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                              Dates
                            </span>
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className={cn("text-sm font-medium truncate", dateRange?.from ? "text-foreground" : "text-muted-foreground/60")}>
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
                      className="bg-muted/20 rounded-xl px-3 py-2 border border-border flex items-center justify-center"
                    >
                      <span className="text-xs text-muted-foreground">No dates needed</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                variant="dark-shine"
                size="lg"
                className="w-full rounded-xl h-12"
              >
                <Search className="h-5 w-5 mr-2" />
                Search the Marketplace
              </Button>
            </div>
          </div>

          {/* Right: Walkthrough Animation */}
          <div className="lg:col-span-2 glass-premium rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground text-lg">Why Vendibook?</h3>
                <p className="text-xs text-muted-foreground">See how it works</p>
              </div>
            </div>

            <div className="flex-1">
              <AuthWalkthrough />
            </div>
          </div>
        </motion.div>

        {/* Match Me CTA - Compact bar below */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 glass-premium rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">Don't have time to search?</h4>
              <p className="text-sm text-muted-foreground">Our experts will find the best deal for your needs — no sign-up required.</p>
            </div>
          </div>
          <Button
            onClick={openZendeskChat}
            variant="dark-shine"
            size="lg"
            className="rounded-xl whitespace-nowrap flex-shrink-0"
          >
            <Handshake className="h-5 w-5 mr-2" />
            Match Me
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroRentalSearch;
