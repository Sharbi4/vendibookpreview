import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, SlidersHorizontal, Truck, ChevronRight, Sparkles,
  Map as MapIcon, X, Plus, UserPlus, Info, ArrowRight, Utensils,
  Building2, ShoppingBag, Zap, Mic, MicOff, Loader2,
} from 'lucide-react';
import AppDropdownMenu from '@/components/layout/AppDropdownMenu';
import { FilterPanel, FilterValues } from '@/components/search/FilterPanel';
import { EmptyStateEmailCapture } from '@/components/search/EmptyStateEmailCapture';
import InlineNewsletterCard from '@/components/search/InlineNewsletterCard';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listing/ListingCard';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import SearchResultsMap from '@/components/search/SearchResultsMap';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Listing } from '@/types/listing';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import vendibookLogo from '@/assets/vendibook-logo.png';
import TrendingDropdown from '@/components/search/TrendingDropdown';
import { useScribe } from '@elevenlabs/react';
import { toast } from '@/hooks/use-toast';
import FloatingConciergeButton from '@/components/FloatingConciergeButton';

const CATEGORIES = [
  { value: '', label: 'All', icon: Zap },
  { value: 'food_truck', label: 'Food Trucks', icon: Truck },
  { value: 'food_trailer', label: 'Trailers', icon: Truck },
  { value: 'ghost_kitchen', label: 'Kitchens', icon: Building2 },
  { value: 'vendor_space', label: 'Vendor Spaces', icon: MapPin },
];

const PAGE_SIZE = 20;

interface SearchResponse {
  listings: Listing[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const Homepage2 = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [locationText, setLocationText] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'rent' | 'sale' | ''>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'distance'>('newest');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({
    minPrice: '',
    maxPrice: '',
    instantBookOnly: false,
    featuredOnly: false,
    deliveryCapable: false,
    amenities: [],
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnectingMic, setIsConnectingMic] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  
  const { apiKey, isLoading: mapLoading, error: mapError } = useGoogleMapsToken();

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as any,
    onCommittedTranscript: (data: any) => {
      if (data.text?.trim()) {
        setQuery((prev: string) => (prev ? prev + ' ' : '') + data.text.trim());
      }
    },
  });

  // Close trending dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowTrending(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  };

  const fetchListings = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const body: Record<string, unknown> = {
        page: pageNum,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
      };
      if (query.trim()) body.query = query.trim();
      if (mode) body.mode = mode;
      if (category) body.category = category;
      if (coordinates) {
        body.latitude = coordinates[1];
        body.longitude = coordinates[0];
        body.radius_miles = 100;
      }
      // Apply filters
      if (filters.minPrice) body.min_price = Number(filters.minPrice);
      if (filters.maxPrice) body.max_price = Number(filters.maxPrice);
      if (filters.instantBookOnly) body.instant_book_only = true;
      if (filters.featuredOnly) body.featured_only = true;
      if (filters.deliveryCapable) body.delivery_capable = true;
      if (filters.amenities.length > 0) body.amenities = filters.amenities;

      const { data, error } = await supabase.functions.invoke('search-listings', { body });
      if (error) throw error;
      const result = data as SearchResponse;
      setListings(result.listings || []);
      setTotalCount(result.total_count || 0);
      setTotalPages(result.total_pages || 0);
    } catch (err) {
      console.error('Search error:', err);
      setListings([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [query, mode, category, coordinates, sortBy, filters]);

  // Auto-fetch on initial load
  useEffect(() => { fetchListings(1); }, []);

  // Re-fetch when mode, category, sortBy, or filters change
  useEffect(() => {
    if (hasSearched) { setPage(1); fetchListings(1); }
  }, [mode, category, sortBy, filters]);

  const handleSearch = () => { setPage(1); fetchListings(1); };

  const toggleVoiceSearch = useCallback(async () => {
    if (isRecording) {
      scribe.disconnect();
      setIsRecording(false);
      setTimeout(() => { setPage(1); fetchListings(1); }, 300);
      return;
    }

    setIsConnectingMic(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) throw new Error('Failed to get voice token');
      
      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsRecording(true);
    } catch (err) {
      console.error('Voice search error:', err);
      toast({ title: 'Could not start voice search', description: 'Please check microphone permissions', variant: 'destructive' });
    } finally {
      setIsConnectingMic(false);
    }
  }, [isRecording, scribe, fetchListings]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchListings(newPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryChip = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const clearFilters = () => {
    setQuery(''); setLocationText(''); setCoordinates(null);
    setCategory(''); setMode(''); setSortBy('newest'); setPage(1);
    setFilters({ minPrice: '', maxPrice: '', instantBookOnly: false, featuredOnly: false, deliveryCapable: false, amenities: [] });
    fetchListings(1);
  };

  const clearFilterPanel = () => {
    setFilters({ minPrice: '', maxPrice: '', instantBookOnly: false, featuredOnly: false, deliveryCapable: false, amenities: [] });
  };

  const applyFilters = () => {
    setPage(1);
    fetchListings(1);
  };

  const getPaginationRange = () => {
    const range: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
      if (page < totalPages - 2) range.push('ellipsis');
      range.push(totalPages);
    }
    return range;
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden scroll-smooth">
      {/* ══ FULL-PAGE GRADIENT BACKGROUND ══ */}
      <div className="fixed inset-0 z-0">
        {/* Base eggshell / off-white */}
        <div className="absolute inset-0 bg-background" />
        {/* Very subtle warm orbs */}
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[hsl(14,100%,57%)]/[0.04] blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 40, -40, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-32 w-[800px] h-[800px] rounded-full bg-[hsl(40,100%,49%)]/[0.03] blur-[170px]"
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[hsl(14,80%,50%)]/[0.03] blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -25, 35, 0], y: [0, 35, -25, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut', delay: 2 }}
          className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(25,95%,55%)]/[0.02] blur-[140px]"
        />
      </div>

      {/* ══ CUSTOM HEADER WITH INTEGRATED SEARCH ══ */}
      <header className="sticky top-5 z-50 w-[calc(100%-1rem)] lg:w-fit lg:max-w-[calc(100%-2rem)] mx-auto rounded-2xl shadow-lg shadow-black/10 mb-3">
        <div className="relative rounded-2xl">
          {/* Header gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)] rounded-2xl overflow-hidden" />
          {/* Animated shine */}
          <div className="absolute inset-0 hp2-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent overflow-hidden rounded-2xl" />
          {/* Glass overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/5" />

          <div className="relative max-w-7xl mx-auto px-4">
            {/* Top row: Logo + Search + Actions */}
            <div className="flex items-center justify-between gap-3 h-14">
              {/* Favicon / Logo */}
              <Link to="/" className="shrink-0 flex items-center gap-2">
                <img src={vendibookFavicon} alt="Vendibook" className="h-9 w-auto drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] sm:hidden" />
                <img src={vendibookLogo} alt="Vendibook" className="hidden sm:block h-28 w-auto drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }} />
              </Link>

              {/* Search bar — 3D glass field in header */}
              <div className="flex-1 flex items-center gap-2 max-w-2xl">
                <div ref={searchWrapperRef} className="relative flex-1 group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-white/20 via-white/10 to-white/20 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500 pointer-events-none" />
                  <div className="relative rounded-xl bg-white/12 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_12px_-2px_rgba(0,0,0,0.25)] group-focus-within:bg-white/18 group-focus-within:border-white/35 group-focus-within:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_20px_-4px_rgba(0,0,0,0.35),0_0_15px_-3px_rgba(255,255,255,0.15)] transition-all duration-300 flex items-center">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      onFocus={() => setShowTrending(true)}
                      placeholder={isRecording ? 'Listening...' : 'Search food trucks, kitchens, spaces...'}
                      className="relative w-full h-10 pl-8 pr-12 rounded-xl bg-transparent text-white text-sm placeholder:text-white/50 focus:outline-none transition-all"
                    />
                    {/* Mic button */}
                    <button
                      onClick={toggleVoiceSearch}
                      disabled={isConnectingMic}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isRecording
                          ? 'bg-red-500/80 text-white animate-pulse'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                      title={isRecording ? 'Stop listening' : 'Voice search'}
                    >
                      {isConnectingMic ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isRecording ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {/* Trending dropdown */}
                  <AnimatePresence>
                    <TrendingDropdown
                      isVisible={showTrending && !query.trim()}
                      onClose={() => setShowTrending(false)}
                    />
                  </AnimatePresence>
                </div>
                <div className="min-w-0 w-24 sm:w-auto md:min-w-[170px]">
                  <LocationSearchInput
                    value={locationText}
                    onChange={setLocationText}
                    onLocationSelect={(loc) => setCoordinates(loc?.coordinates ?? null)}
                    selectedCoordinates={coordinates}
                    placeholder="Location"
                    className="[&_.space-y-2]:space-y-0 [&_input]:h-10 [&_input]:rounded-xl [&_input]:bg-white/15 [&_input]:backdrop-blur-xl [&_input]:border [&_input]:border-white/25 [&_input]:text-white [&_input]:text-sm [&_input]:placeholder:text-white/60 [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-white/40 [&_input]:focus:bg-white/20 [&_svg]:text-white/70 [&_button]:text-white/70"
                  />
                </div>
                {/* Search button — icon only */}
                <Button
                  variant="dark-shine"
                  size="icon"
                  onClick={handleSearch}
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="dark-shine" size="sm" className="hidden sm:flex h-9 rounded-xl text-xs font-semibold px-4">
                  <Link to="/list">
                    Create Listing
                  </Link>
                </Button>
                <Button asChild variant="dark-shine" size="sm" className="hidden sm:flex h-9 rounded-xl text-xs font-semibold px-4">
                  <Link to="/auth">
                    Sign Up
                  </Link>
                </Button>
                <Button
                  variant="dark-shine"
                  size="sm"
                  onClick={() => setLearnMoreOpen(true)}
                  className="hidden sm:flex h-9 rounded-xl text-xs font-semibold px-4"
                >
                  Learn More
                </Button>
                {/* Hamburger menu — always visible far right */}
                <AppDropdownMenu variant="dark" />
              </div>
            </div>

            {/* Bottom row: Category chips + mode + sort */}
            <div className="flex items-center gap-3 pb-2 -mt-0.5">
              {/* Mode pills — equal width, premium */}
              <div className="flex h-8 rounded-full overflow-hidden border border-white/20 bg-white/10 backdrop-blur-xl shrink-0 p-[2px] gap-[2px]">
                {(['', 'rent', 'sale'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`w-12 sm:w-14 text-[11px] sm:text-xs font-semibold rounded-full transition-all duration-200 ${
                      mode === m
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m === '' ? 'All' : m === 'rent' ? 'Rent' : 'Buy'}
                  </button>
                ))}
              </div>

              {/* Category chips — scrollable with scroll-position indicator */}
              <div className="flex-1 min-w-0 relative">
                <div
                  ref={categoryScrollRef}
                  onScroll={handleCategoryScroll}
                  className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChip(cat.value)}
                      className={`relative whitespace-nowrap px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all rounded-t-lg ${
                        category === cat.value
                          ? 'text-white font-bold'
                          : 'text-white/60 hover:text-white/90'
                      }`}
                    >
                      <cat.icon className="w-3 h-3" />
                      {cat.label}
                      {category === cat.value && (
                        <motion.div
                          layoutId="category-tab"
                          className="absolute bottom-0 left-1 right-1 h-[2px] bg-white rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  ))}
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    onApply={applyFilters}
                    onClear={() => { clearFilterPanel(); setTimeout(() => fetchListings(1), 0); }}
                    autoApply
                  />
                </div>
                {/* Scroll position indicator — moves opposite to scroll direction */}
                <div className="h-[2px] bg-white/10 rounded-full mt-0.5">
                  <motion.div
                    className="h-full bg-white/40 rounded-full"
                    style={{ width: '30%' }}
                    animate={{ x: `${(1 - scrollProgress) * 233}%` }}
                    transition={{ type: 'tween', duration: 0.15 }}
                  />
                </div>
              </div>

              {/* Result count */}
              <span className="text-xs text-white/60 hidden md:inline whitespace-nowrap font-medium shrink-0">
                {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MAIN LAYOUT ══ */}
      <div className="relative z-10 flex">
        {/* ── CONTENT ── */}
        <div className="flex-1 min-w-0">
          <div ref={resultsRef} className="scroll-mt-32 max-w-6xl mx-auto px-4 pt-6 pb-6">
            {/* Sort bar + map toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground/70">
                {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>
              <div className="flex items-center gap-2">
                {/* Mobile map toggle — next to sort */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`lg:hidden flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border transition-all ${
                    showMap
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-background text-foreground/70 hover:bg-muted'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Map
                </button>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-8 w-36 text-xs rounded-lg border-border bg-background">
                    <SlidersHorizontal className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price ↑</SelectItem>
                    <SelectItem value="price_high">Price ↓</SelectItem>
                    <SelectItem value="distance">Nearest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Listings 2x2 Grid */}
              <div className={`lg:col-span-3 ${showMap ? 'hidden lg:block' : ''}`}>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-72 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-sm overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
                      </motion.div>
                    ))}
                  </div>
                ) : listings.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {listings.map((listing, i) => (
                          <React.Fragment key={listing.id}>
                            <motion.div
                              initial={{ opacity: 0, y: 30, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                              whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25, ease: 'easeOut' } }}
                              className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-2xl hover:shadow-[hsl(14,100%,57%)]/10 hover:border-[hsl(14,100%,57%)]/30 transition-[box-shadow,border-color] duration-300"
                            >
                              <ListingCard listing={listing} />
                            </motion.div>
                            {/* Insert newsletter card after 2nd listing */}
                            {i === 1 && listings.length > 2 && <InlineNewsletterCard />}
                          </React.Fragment>
                        ))}
                      </AnimatePresence>
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-8 mb-4">
                        <Pagination>
                          <PaginationContent>
                            {page > 1 && (
                              <PaginationItem>
                                <PaginationPrevious onClick={() => handlePageChange(page - 1)} className="cursor-pointer rounded-full bg-white/60 backdrop-blur border border-white/50" />
                              </PaginationItem>
                            )}
                            {getPaginationRange().map((p, idx) =>
                              p === 'ellipsis' ? (
                                <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
                              ) : (
                                <PaginationItem key={p}>
                                  <PaginationLink isActive={p === page} onClick={() => handlePageChange(p as number)} className="cursor-pointer rounded-full bg-white/60 backdrop-blur border border-white/50">
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            )}
                            {page < totalPages && (
                              <PaginationItem>
                                <PaginationNext onClick={() => handlePageChange(page + 1)} className="cursor-pointer rounded-full bg-white/60 backdrop-blur border border-white/50" />
                              </PaginationItem>
                            )}
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyStateEmailCapture
                    locationText={locationText}
                    category={category}
                    mode={mode}
                    onClearFilters={clearFilters}
                  />
                )}
              </div>

              {/* Map Panel — Glass Frame */}
              <div className={`lg:col-span-2 ${showMap ? '' : 'hidden lg:block'}`}>
                <div className="sticky top-32 h-[calc(100vh-9rem)] rounded-2xl overflow-hidden shadow-2xl shadow-black/10">
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/30 via-transparent to-[hsl(40,100%,49%)]/30 z-0" />
                  <div className="relative z-10 h-full rounded-2xl overflow-hidden border border-white/50 bg-white/20 backdrop-blur-xl">
                    <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-xl border border-white/50 text-xs font-bold text-gray-900 shadow-sm">
                      {totalCount} listings nearby
                    </div>
                    <SearchResultsMap
                      listings={listings as any}
                      mapToken={apiKey}
                      isLoading={mapLoading || isLoading}
                      error={mapError}
                      userLocation={coordinates}
                      searchRadius={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>

        {/* ── QUICK START STICKY TAB + FLOATING PANEL ── */}
        {/* Sticky tab on right edge */}
        {!learnMoreOpen && (
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setLearnMoreOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 px-2 py-3 bg-foreground text-background text-[11px] font-bold rounded-l-xl shadow-lg shadow-black/20 hover:px-3 transition-all"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Quick Start
          </motion.button>
        )}

        <AnimatePresence>
          {learnMoreOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
                onClick={() => setLearnMoreOpen(false)}
              />
              
              {/* Floating Panel */}
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-[7.5rem] right-3 z-50 max-h-[calc(100vh-8.5rem)] w-full max-w-sm bg-white/60 dark:bg-black/60 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/15 overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(14,100%,57%)]/20 to-[hsl(40,100%,49%)]/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-[hsl(14,100%,57%)]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground text-base">Quick Start</h2>
                      <p className="text-xs text-muted-foreground">Get started with Vendibook</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLearnMoreOpen(false)}
                    className="h-8 w-8 rounded-full border-border"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* Sign Up CTA */}
                  <div className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border-2 border-border shadow-lg shadow-black/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] flex items-center justify-center mb-3 shadow-lg shadow-[hsl(14,100%,57%)]/25">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground mb-1">Join Vendibook</h4>
                    <p className="text-xs text-muted-foreground mb-4">Create an account to save favorites, book instantly, and more.</p>
                    <Button asChild variant="dark-shine" size="sm" className="w-full rounded-xl text-xs font-semibold">
                      <Link to="/auth">Sign Up Free</Link>
                    </Button>
                  </div>

                  {/* Create Listing CTA */}
                  <div className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border-2 border-border shadow-lg shadow-black/5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(40,100%,49%)] to-[hsl(14,100%,57%)] flex items-center justify-center mb-3 shadow-lg shadow-[hsl(40,100%,49%)]/25">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground mb-1">List Your Asset</h4>
                    <p className="text-xs text-muted-foreground mb-4">Rent or sell your food truck, kitchen, or equipment.</p>
                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold border-border">
                      <Link to="/list">
                        Create Listing <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  </div>

                  {/* How It Works */}
                  <div className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border-2 border-border shadow-lg shadow-black/5">
                    <h4 className="font-bold text-sm text-foreground mb-3">How It Works</h4>
                    <div className="space-y-3">
                      {[
                        { icon: Search, title: 'Search', desc: 'Find assets near you' },
                        { icon: MapPin, title: 'Book', desc: 'Reserve instantly or request' },
                        { icon: Sparkles, title: 'Launch', desc: 'Show up & start serving' },
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(14,100%,57%)]/15 to-[hsl(40,100%,49%)]/15 flex items-center justify-center shrink-0 mt-0.5">
                            <step.icon className="w-3.5 h-3.5 text-[hsl(14,100%,57%)]" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-foreground">{step.title}</p>
                            <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs mt-4 border-border font-semibold">
                      <Link to="/how-it-works">
                        Learn More <ChevronRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  </div>

                  {/* Quick stats */}
                  <div className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border-2 border-border shadow-lg shadow-black/5">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: '500+', label: 'Listings' },
                        { value: '50+', label: 'Cities' },
                        { value: '4.8★', label: 'Rating' },
                        { value: '24h', label: 'Avg Response' },
                      ].map((stat, i) => (
                        <div key={i} className="text-center">
                          <p className="text-lg font-black bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] bg-clip-text text-transparent">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hp2-shimmer {
          animation: hp2shimmer 4s ease-in-out infinite;
        }
        @keyframes hp2shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        /* Premium smooth scrolling */
        html { scroll-behavior: smooth; }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <FloatingConciergeButton />
    </div>
  );
};

export default Homepage2;
