import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChefHat, Truck, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-food-truck.jpg';

const HeroRentalSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [assetType, setAssetType] = useState('all');
  const [isDateOpen, setIsDateOpen] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    if (date) params.set('start', format(date, 'yyyy-MM-dd'));
    if (assetType !== 'all') params.set('category', assetType);
    params.set('mode', 'rent');
    navigate(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden m-4 rounded-[60px] z-0">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Food truck at sunset"
          className="w-full h-full object-cover"
        />
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 text-center">
        {/* The "Steve Jobs" Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Don't buy a food truck.{' '}
            <span className="text-primary">Rent one.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light">
            Launch your food business this weekend. Verified trucks, trailers, and kitchens available by the day or month.
          </p>
        </motion.div>

        {/* The Search Pill (Airbnb Style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-3xl md:rounded-full shadow-2xl p-4 md:p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0 max-w-3xl mx-auto"
        >
          {/* Location Input */}
          <div className="flex-1 px-4 py-3 md:py-2 md:border-r border-border">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-1">
              Where
            </label>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="City or Zip Code"
                className="w-full bg-transparent border-none p-0 text-foreground placeholder:text-muted-foreground focus:ring-0 text-sm font-medium outline-none"
              />
            </div>
          </div>

          {/* Asset Type Selector */}
          <div className="flex-1 px-4 py-3 md:py-2 md:border-r border-border">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-1">
              What
            </label>
            <div className="flex items-center gap-2">
              {assetType === 'ghost_kitchen' ? (
                <ChefHat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full bg-transparent border-none p-0 text-foreground focus:ring-0 text-sm font-medium outline-none cursor-pointer appearance-none"
              >
                <option value="all">Any Vehicle or Kitchen</option>
                <option value="food_truck">Food Truck</option>
                <option value="food_trailer">Food Trailer</option>
                <option value="ghost_kitchen">Commercial Kitchen</option>
                <option value="vendor_space">Vendor Spaces</option>
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex-1 px-4 py-3 md:py-2">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-left mb-1">
              When
            </label>
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-2 text-left">
                  <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "text-sm font-medium",
                    date ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {date ? format(date, "MMM d, yyyy") : "Add dates"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setIsDateOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            size="lg"
            className="rounded-full h-12 w-full md:h-14 md:w-14 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex-shrink-0"
          >
            <Search className="h-5 w-5" />
            <span className="md:hidden ml-2">Search</span>
            <span className="sr-only md:not-sr-only hidden">Search</span>
          </Button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white/60 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ID-Verified Hosts
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Secure Payments
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            24/7 Support
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroRentalSearch;
