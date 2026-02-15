import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar as CalendarIcon, ChevronDown, Sparkles, Navigation, ShoppingCart, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import heroImage from '@/assets/hero-food-truck.jpg';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { useAuth } from '@/contexts/AuthContext';

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<'rent' | 'buy'>('rent');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    if (category) params.set('category', category);
    if (mode === 'buy') params.set('mode', 'sale');
    if (mode === 'rent') params.set('mode', 'rent');
    if (dateRange?.from) params.set('start', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('end', format(dateRange.to, 'yyyy-MM-dd'));
    navigate(`/search?${params.toString()}`);
  };

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || '';
            const state = data.address?.state || '';
            const locationName = city && state ? `${city}, ${state}` : city || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            setLocation(locationName);
          } catch {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        },
        () => setLocation('')
      );
    }
  };

  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Warm gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      <div className="container relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Headline */}
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <img src={vendibookLogo} alt="Vendibook" className="h-96 sm:h-[30rem] md:h-[36rem] w-auto mx-auto mb-5 drop-shadow-lg" />
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-4">
            Rent it. Buy it. Find your spot.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
            From turnkey rentals and trucks for sale to premium food truck parks—launch your food business this weekend with verified assets and spaces.
          </p>
        </div>

        {/* Two glassmorphic cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5 max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
          {/* Left: Browse card (wider) */}
          <div
            className="lg:col-span-3 rounded-2xl border border-white/20 p-5 sm:p-6 shadow-2xl"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            {/* Card header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Browse</h2>
                <p className="text-white/60 text-xs">Search our verified marketplace</p>
              </div>
            </div>

            {/* Rent / Buy toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setMode('rent')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'rent'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white/80 border border-transparent'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Rent
              </button>
              <button
                onClick={() => setMode('buy')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'buy'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/60 hover:text-white/80 border border-transparent'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Buy
              </button>
            </div>

            {/* Location input */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mb-1.5 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="City, Zip, or current location"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                />
                <button
                  onClick={handleGeolocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  aria-label="Use current location"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Type + Dates row */}
            <div className={`grid ${mode === 'rent' ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`}>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mb-1.5 block">Type</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-3 pr-8 rounded-xl bg-white/10 border border-white/15 text-white text-sm focus:outline-none focus:border-white/40 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-gray-900">Everything</option>
                    <option value="food_truck" className="bg-gray-900">Food Trucks</option>
                    <option value="food_trailer" className="bg-gray-900">Food Trailers</option>
                    <option value="commercial_kitchen" className="bg-gray-900">Shared Kitchens</option>
                    <option value="vendor_space" className="bg-gray-900">Vendor Spaces</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                </div>
              </div>
              {mode === 'rent' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mb-1.5 block">Dates</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full h-11 px-3 rounded-xl bg-white/10 border border-white/15 text-sm text-left flex items-center gap-2 hover:border-white/30 transition-colors"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-white/40" />
                        {dateRange?.from ? (
                          <span className="text-white">
                            {format(dateRange.from, 'MMM d')}
                            {dateRange.to ? ` - ${format(dateRange.to, 'MMM d')}` : ''}
                          </span>
                        ) : (
                          <span className="text-white/40">Add dates</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[60]" align="start">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range);
                          if (range?.from && range?.to) {
                            setIsCalendarOpen(false);
                          }
                        }}
                        numberOfMonths={2}
                        disabled={(date) => date < new Date()}
                        className={cn('p-3 pointer-events-auto')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Search CTA */}
            <Button
              onClick={handleSearch}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/30"
            >
              <Search className="w-4 h-4 mr-2" />
              Search the Marketplace
            </Button>
          </div>

          {/* Right: Concierge card */}
          <div
            className="lg:col-span-2 rounded-2xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            {/* Card header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Let Us Match You</h2>
                <p className="text-white/60 text-xs">Done-for-you concierge service</p>
              </div>
            </div>

            <h3 className="text-white font-bold text-xl mb-3">Don't have time to search?</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Our experts will manually find the best deal for your specific needs. Tell us what you're looking for, and we'll do the legwork.
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-6 flex-1">
              {[
                'Personalized asset recommendations',
                'Price negotiation on your behalf',
                'No sign-up required',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5 text-sm text-white/80">
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Match Me CTA */}
            <Button
              onClick={() => {
                // Open Zendesk chat or navigate to concierge
                if (window.zE) {
                  try { window.zE('messenger', 'open'); } catch { /* noop */ }
                } else {
                  navigate('/concierge');
                }
              }}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-lg shadow-primary/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Match Me
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
