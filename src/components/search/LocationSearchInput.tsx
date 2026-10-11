import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Navigation, ChevronDown, AlertCircle, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
  text: string;
  context?: string;
  city?: string;
  state?: string;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

type LocationStatus = 'idle' | 'loading' | 'ready' | 'no-match' | 'error' | 'denied';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; coordinates: [number, number] } | null) => void;
  selectedCoordinates: [number, number] | null;
  placeholder?: string;
  className?: string;
  /** Optional: show inline radius selector when location is selected */
  showRadiusSelector?: boolean;
  /** Current radius value (miles) */
  radius?: number;
  /** Callback when radius changes */
  onRadiusChange?: (radius: number) => void;
}

/** Fetches geocode suggestions. Coordinates always come back as [lng, lat]. */
const geocode = async (query: string, limit = 5): Promise<{ results: GeocodeResult[]; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('geocode-location', {
    body: { query, limit },
  });
  if (error) return { results: [], error: 'GEOCODING_UNAVAILABLE' };
  return { results: (data?.results as GeocodeResult[]) || [], error: data?.error };
};

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  selectedCoordinates,
  placeholder = "City, state, or zip code",
  className,
  showRadiusSelector = false,
  radius = 25,
  onRadiusChange,
}) => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Guards against out-of-order responses overwriting fresher ones.
  const requestSeq = useRef(0);
  // Skips the next fetch after a programmatic value change (suggestion pick).
  const skipNextFetch = useRef(false);

  const listboxId = React.useId();

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setStatus('idle');
      setStatusMessage(null);
      setIsOpen(false);
      return;
    }

    const seq = ++requestSeq.current;
    setStatus('loading');
    setStatusMessage(null);

    const { results, error } = await geocode(trimmed);
    if (seq !== requestSeq.current) return; // stale response

    if (error) {
      setSuggestions([]);
      setStatus('error');
      setStatusMessage(
        error === 'GEOCODING_KEY_RESTRICTED'
          ? 'Location lookup is temporarily unavailable. You can still type a city, state, or ZIP.'
          : "We couldn't reach location search. Type a city, state, or ZIP and press Enter."
      );
      setIsOpen(true);
      return;
    }

    setSuggestions(results);
    setActiveIndex(-1);
    setStatus(results.length ? 'ready' : 'no-match');
    setIsOpen(true);
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!selectedCoordinates) runSearch(value);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, selectedCoordinates, runSearch]);

  // Close dropdowns on outside click. The suggestion panel is portalled to
  // <body>, so it is not a DOM descendant of containerRef — check it too.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideField = containerRef.current?.contains(target);
      const insidePanel = listRef.current?.contains(target);
      if (!insideField && !insidePanel) setIsOpen(false);
      if (radiusRef.current && !radiusRef.current.contains(target)) {
        setShowRadiusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelectorAll('[role="option"]')[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const commitSuggestion = (suggestion: GeocodeResult) => {
    skipNextFetch.current = true;
    onChange(suggestion.placeName.replace(/,\s*USA$/i, ''));
    onLocationSelect({ name: suggestion.placeName, coordinates: suggestion.center });
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    setStatus('idle');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (selectedCoordinates) onLocationSelect(null);
  };

  /** Enter/blur on free text: resolve the best match so search still gets coordinates. */
  const resolveTypedText = async () => {
    const trimmed = value.trim();
    if (!trimmed || selectedCoordinates || trimmed.length < MIN_QUERY_LENGTH) return;

    if (suggestions.length > 0) {
      commitSuggestion(suggestions[0]);
      return;
    }
    setStatus('loading');
    const { results } = await geocode(trimmed, 1);
    if (results.length > 0) commitSuggestion(results[0]);
    else {
      setStatus('no-match');
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length) setIsOpen(true);
      setActiveIndex((i) => (suggestions.length ? (i + 1) % suggestions.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (suggestions.length ? (i <= 0 ? suggestions.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        commitSuggestion(suggestions[activeIndex]);
      } else if (!selectedCoordinates && value.trim()) {
        e.preventDefault();
        void resolveTypedText();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    onLocationSelect(null);
    setSuggestions([]);
    setIsOpen(false);
    setStatus('idle');
    setStatusMessage(null);
    inputRef.current?.focus();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setStatusMessage('Your browser does not support location detection.');
      setIsOpen(true);
      return;
    }

    setIsGettingLocation(true);
    setStatusMessage(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      // Edge function accepts "lat,lng"; coordinates are stored as [lng, lat].
      const { results } = await geocode(`${latitude},${longitude}`, 1);

      if (results.length > 0) {
        const r = results[0];
        skipNextFetch.current = true;
        onChange((r.placeName || r.text).replace(/,\s*USA$/i, ''));
        onLocationSelect({ name: r.placeName || 'Current location', coordinates: [longitude, latitude] });
      } else {
        skipNextFetch.current = true;
        onChange('Current location');
        onLocationSelect({ name: 'Current location', coordinates: [longitude, latitude] });
      }
      setIsOpen(false);
      setSuggestions([]);
      setStatus('idle');
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError | undefined)?.code;
      if (code === 1) {
        setStatus('denied');
        setStatusMessage('Location access is blocked. Allow it in your browser settings, or type a city or ZIP.');
      } else if (code === 3) {
        setStatus('error');
        setStatusMessage('Finding your location timed out. Try again or type a city or ZIP.');
      } else {
        setStatus('error');
        setStatusMessage("We couldn't determine your location. Type a city, state, or ZIP instead.");
      }
      setIsOpen(true);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleRadiusSelect = (r: number) => {
    onRadiusChange?.(r);
    setShowRadiusDropdown(false);
  };

  const showInlineRadius = showRadiusSelector && selectedCoordinates;
  const showPanel =
    isOpen && (suggestions.length > 0 || status === 'no-match' || status === 'error' || status === 'denied');

  // The field can live inside overflow-hidden cards, sheets and sticky bars.
  // Rendering the panel into <body> with fixed coordinates guarantees it is
  // never clipped or stacked behind the mobile filter sheet.
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (!showPanel) {
      setPanelRect(null);
      return;
    }
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < 260 && r.top > spaceBelow;
      setPanelRect({
        top: openUp ? r.top - 4 : r.bottom + 4,
        left: r.left,
        width: r.width,
        openUp,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [showPanel]);

  const panelMaxHeight = panelRect
    ? Math.max(160, panelRect.openUp ? panelRect.top - 12 : window.innerHeight - panelRect.top - 12)
    : 288;


  return (
    <div className={cn("space-y-2", className)}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
            aria-label="Search by city, state, or ZIP code"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => (suggestions.length > 0 || statusMessage) && setIsOpen(true)}
            onBlur={() => { void resolveTypedText(); }}
            className={cn(
              "pl-3 pr-20",
              selectedCoordinates && "border-primary bg-primary/5"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
                aria-label="Clear location"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              title="Use my current location"
              aria-label="Use my current location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Suggestions / status panel */}
        {showPanel && (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Location suggestions"
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors flex items-start gap-3",
                  index === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.context && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.context}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {suggestions.length === 0 && status === 'no-match' && (
              <div className="px-4 py-3 flex items-start gap-3 text-sm text-muted-foreground">
                <SearchX className="h-4 w-4 mt-0.5 shrink-0" />
                <span>No places match “{value.trim()}”. Try a city, state, or 5-digit ZIP.</span>
              </div>
            )}

            {suggestions.length === 0 && (status === 'error' || status === 'denied') && statusMessage && (
              <div className="px-4 py-3 flex items-start gap-3 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{statusMessage}</span>
              </div>
            )}

            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm font-medium border-t border-border/60 hover:bg-muted transition-colors flex items-center gap-3"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Navigation className="h-4 w-4 text-primary shrink-0" />
              )}
              Use my current location
            </button>
          </div>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {status === 'loading'
            ? 'Searching locations'
            : status === 'ready'
              ? `${suggestions.length} location suggestions available`
              : statusMessage || ''}
        </span>
      </div>

      {/* Inline Radius Selector */}
      {showInlineRadius && (
        <div ref={radiusRef} className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Within:</span>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setShowRadiusDropdown(!showRadiusDropdown)}
                aria-label={`Search radius: ${radius} miles`}
              >
                {radius} mi
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showRadiusDropdown && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[120px]">
                  <div className="flex flex-wrap gap-1">
                    {RADIUS_OPTIONS.map((r) => (
                      <Badge
                        key={r}
                        variant={radius === r ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                        onClick={() => handleRadiusSelect(r)}
                      >
                        {r} mi
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick select badges */}
            <div className="hidden sm:flex gap-1">
              {[10, 25, 50].map((r) => (
                <Badge
                  key={r}
                  variant={radius === r ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors text-xs"
                  onClick={() => onRadiusChange?.(r)}
                >
                  {r} mi
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
