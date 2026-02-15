import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, ArrowRight, Sparkles, Home, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import vendibookLogo from '@/assets/vendibook-logo.png';

const Hero = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'rent' | 'buy'>('rent');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    params.set('mode', mode === 'buy' ? 'sale' : 'rent');
    navigate(`/search?${params.toString()}`);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
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
          setLocation(city && state ? `${city}, ${state}` : city || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } catch {
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/[0.06] rounded-full blur-[120px]" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      
      {/* Fine grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container relative z-10 max-w-4xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center">
          {/* Logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-20 sm:h-24 w-auto mx-auto mb-8"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,81,36,0.2))' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Headline */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The marketplace for
            <br />
            <span className="gradient-text-warm">food business.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Food trucks, trailers, shared kitchens, and vendor spaces — verified assets, instant booking, flexible payments.
          </motion.p>

          {/* Search card */}
          <motion.div
            className="max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Rent / Buy toggle */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <button
                onClick={() => setMode('rent')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'rent'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Rent
              </button>
              <button
                onClick={() => setMode('buy')}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'buy'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Buy
              </button>
            </div>

            {/* Search input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 group-hover:border-primary/30">
                <MapPin className="absolute left-4 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="City or zip…"
                  className="w-full h-14 pl-12 pr-28 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    onClick={handleGeolocation}
                    disabled={isLocating}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent disabled:opacity-50"
                    aria-label="Use current location"
                  >
                    <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                  </button>
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    <Search className="w-4 h-4 mr-1.5" />
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dual CTA */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/search?mode=rent')}
              className="rounded-full px-8 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2 transition-all"
            >
              Browse Rentals
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/search?mode=sale')}
              className="rounded-full px-8 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2 transition-all"
            >
              Shop for Sale
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/list')}
              className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              List for Free
            </Button>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Verified listings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Secure payments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Instant booking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Buy now, pay later
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
