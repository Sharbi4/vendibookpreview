import { Navigation, Wand2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  return (
    <div className={`relative group ${className || ''}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/25 via-primary/10 to-primary/25 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
      <div className={`relative flex items-center bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
        isInputFocused ? 'border-primary/40 shadow-lg shadow-primary/10' : 'border-border group-hover:border-primary/30'
      }`}>
        {isAIParsing && (
          <Wand2 className="absolute left-4 w-5 h-5 text-primary animate-pulse" />
        )}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            className={`w-full h-14 ${isAIParsing ? 'pl-12' : 'pl-5'} pr-36 bg-transparent text-foreground text-[16px] sm:text-sm focus:outline-none`}
          />
          {!location && !isInputFocused && (
            <div className={`absolute inset-0 flex items-center ${isAIParsing ? 'pl-12' : 'pl-5'} pr-36 pointer-events-none overflow-hidden`}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  className="text-muted-foreground/40 text-[16px] sm:text-sm truncate"
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
        <div className="absolute right-2 flex items-center gap-2">
          <button
            onClick={toggleVoiceSearch}
            disabled={isConnectingMic}
            className={`p-2.5 rounded-xl transition-colors ${
              isRecording
                ? 'text-destructive bg-destructive/10 hover:bg-destructive/20 animate-pulse'
                : 'text-muted-foreground hover:text-primary hover:bg-accent'
            } disabled:opacity-50`}
            aria-label={isRecording ? 'Stop voice search' : 'Voice search'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={handleGeolocation}
            disabled={isLocating}
            className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded-xl hover:bg-accent disabled:opacity-50"
            aria-label="Use current location"
          >
            <Navigation className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSearchInput;
