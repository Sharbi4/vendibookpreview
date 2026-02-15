import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, ArrowRight, Sparkles, Home, ShoppingCart, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AI_PLACEHOLDERS = [
  'I need a taco truck in Miami this weekend',
  'Shared kitchen for rent near Houston',
  'Food trailer for sale under $30k',
  'Vendor space in Los Angeles',
  'Commercial kitchen in New York City',
  'Buy a food truck in Dallas',
];

const Hero = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'rent' | 'buy'>('rent');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % AI_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleAISearch = async () => {
    const query = location.trim();
    if (!query) {
      // Default search
      const params = new URLSearchParams();
      params.set('mode', mode === 'buy' ? 'sale' : 'rent');
      navigate(`/search?${params.toString()}`);
      return;
    }

    // If it looks like a natural language query (>3 words), use AI parsing
    const wordCount = query.split(/\s+/).length;
    if (wordCount >= 3) {
      setIsAIParsing(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-search-parse', {
          body: { query },
        });
        
        if (error) throw error;
        
        const params = new URLSearchParams();
        if (data.location) params.set('q', data.location);
        if (data.mode) params.set('mode', data.mode === 'sale' ? 'sale' : 'rent');
        if (data.category) params.set('category', data.category);
        
        navigate(`/search?${params.toString()}`);
      } catch (err) {
        console.error('AI search parse error:', err);
        // Fallback to basic search
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('mode', mode === 'buy' ? 'sale' : 'rent');
        navigate(`/search?${params.toString()}`);
      } finally {
        setIsAIParsing(false);
      }
    } else {
      // Simple location search
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('mode', mode === 'buy' ? 'sale' : 'rent');
      navigate(`/search?${params.toString()}`);
    }
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
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-primary/[0.07] rounded-full blur-[150px]"
        animate={{ scale: [1, 1.1, 1], opacity: [0.07, 0.1, 0.07] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[120px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-accent/[0.06] rounded-full blur-[100px]"
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:80px_80px]" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.6,
          }}
        />
      ))}

      <div className="container relative z-10 max-w-4xl mx-auto px-5 py-20 md:py-28">
        <div className="text-center">
          {/* Logo */}
          <motion.img
            src={vendibookLogo}
            alt="Vendibook"
            className="h-56 sm:h-72 w-auto mx-auto mb-8"
            style={{ filter: 'drop-shadow(0 0 40px rgba(255,81,36,0.25))' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Headline with character animation */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight mb-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            The marketplace for
            <br />
            <span className="relative inline-block">
              <span className="gradient-text-warm">food business.</span>
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.8 }}
              />
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Food trucks, trailers, shared kitchens, and vendor spaces — verified assets, instant booking, flexible payments.
          </motion.p>

          {/* AI Search Card */}
          <motion.div
            className="max-w-xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >


            {/* AI Search input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/25 via-primary/10 to-primary/25 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className={`relative flex items-center bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
                isInputFocused ? 'border-primary/40 shadow-lg shadow-primary/10' : 'border-border group-hover:border-primary/30'
              }`}>
                {isAIParsing ? (
                  <Wand2 className="absolute left-4 w-5 h-5 text-primary animate-pulse" />
                ) : (
                  <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder={AI_PLACEHOLDERS[placeholderIndex]}
                  className="w-full h-14 pl-12 pr-28 bg-transparent text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none"
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
                    onClick={handleAISearch}
                    size="sm"
                    disabled={isAIParsing}
                    className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
                  >
                    {isAIParsing ? (
                      <Wand2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isAIParsing ? 'Parsing…' : 'Search'}
                  </Button>
                </div>
              </div>
              
              {/* AI hint */}
              <motion.p
                className="text-[11px] text-muted-foreground/50 mt-2 flex items-center justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <Sparkles className="w-3 h-3 text-primary/40" />
                AI-powered — try natural language like "food truck in Austin for sale"
              </motion.p>
            </div>
          </motion.div>

          {/* Dual CTA */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
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
              List for Free
            </Button>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            {['Verified listings', 'Secure payments', 'Instant booking', 'Buy now, pay later'].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                {text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
