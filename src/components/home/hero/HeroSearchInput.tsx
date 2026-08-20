import { Navigation, Wand2, Mic, MicOff, Search } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';

interface HeroSearchInputProps {
  location: string;
  setLocation: (v: string) => void;
  isLocating: boolean;
  isAIParsing: boolean;
  placeholderIndex: number;
  isInputFocused: boolean;
  setIsInputFocused: (v: boolean) => void;
  isRecording: boolean;
  isConnectingMic: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  toggleVoiceSearch: () => void;
  handleAISearch: () => void;
  handleGeolocation: () => void;
  placeholders: string[];
  className?: string;
}

const HeroSearchInput = ({
  location,
  setLocation,
  isLocating,
  isAIParsing,
  placeholderIndex,
  isInputFocused,
  setIsInputFocused,
  isRecording,
  isConnectingMic,
  inputRef,
  toggleVoiceSearch,
  handleAISearch,
  handleGeolocation,
  placeholders,
  className,
}: HeroSearchInputProps) => {
  const onSubmit = () => {
    trackLeadEvent('homepage_search_submit', {
      route: '/',
      query: location.trim(),
      source: 'home_hero_search_button',
    });
    handleAISearch();
  };

  return (
    <div className={`relative group ${className || ''}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-foreground/10 via-foreground/5 to-foreground/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
      <div className={`relative flex items-center bg-card border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
        isInputFocused ? 'border-foreground/30 shadow-lg shadow-foreground/5' : 'border-border/80 group-hover:border-foreground/25'
      }`}>
        {isAIParsing && (
          <Wand2 className="absolute left-4 w-5 h-5 text-foreground/60 animate-pulse z-10" />
        )}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                trackLeadEvent('homepage_search_submit', {
                  route: '/',
                  query: location.trim(),
                  source: 'home_hero_enter_key',
                });
                handleAISearch();
              }
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            aria-label="Search food trucks and trailers"
            className={`w-full h-14 ${isAIParsing ? 'pl-12' : 'pl-5'} pr-2 bg-transparent text-foreground text-[16px] sm:text-sm focus:outline-none`}
          />
          {!location && !isInputFocused && (
            <div className={`absolute inset-0 flex items-center ${isAIParsing ? 'pl-12' : 'pl-5'} pr-2 pointer-events-none overflow-hidden`}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  className="text-muted-foreground text-[16px] sm:text-sm truncate"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {placeholders[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Demoted helpers: mic + locate */}
        <div className="flex items-center gap-0.5 pr-1.5">
          <button
            type="button"
            onClick={toggleVoiceSearch}
            disabled={isConnectingMic}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'text-destructive bg-destructive/10 hover:bg-destructive/20 animate-pulse'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-accent'
            } disabled:opacity-50`}
            aria-label={isRecording ? 'Stop voice search' : 'Voice search'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLocating}
            className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors rounded-lg hover:bg-accent disabled:opacity-50"
            aria-label="Use current location"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        {/* Primary submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isAIParsing}
          aria-label="Search listings"
          className="shrink-0 h-11 sm:h-12 m-1 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search Listings</span>
          <span className="sm:hidden">Search</span>
        </button>
      </div>
    </div>
  );
};

export default HeroSearchInput;
