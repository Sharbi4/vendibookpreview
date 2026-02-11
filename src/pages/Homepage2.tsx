import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, SlidersHorizontal, Truck, ChevronRight, Sparkles,
  Map as MapIcon, X, Plus, UserPlus, Info, ArrowRight, Utensils,
  Building2, ShoppingBag, Zap, Menu,
} from 'lucide-react';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listing/ListingCard';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import SearchResultsMap from '@/components/search/SearchResultsMap';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Link } from 'react-router-dom';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import vendibookLogo from '@/assets/vendibook-logo.png';

const CATEGORIES = [
  { value: '', label: 'All', icon: Zap },
  { value: 'food_truck', label: 'Food Trucks', icon: Truck },
  { value: 'food_trailer', label: 'Trailers', icon: Truck },
  { value: 'commercial_kitchen', label: 'Kitchens', icon: Building2 },
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
  const [query, setQuery] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'rent' | 'sale' | ''>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'distance'>('newest');
  const [page, setPage] = useState(1);

  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { apiKey, isLoading: mapLoading, error: mapError } = useGoogleMapsToken();

  const resultsRef = useRef<HTMLDivElement>(null);

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
  }, [query, mode, category, coordinates, sortBy]);

  useEffect(() => { fetchListings(1); }, []);

  useEffect(() => {
    if (hasSearched) { setPage(1); fetchListings(1); }
  }, [sortBy]);

  const handleSearch = () => { setPage(1); fetchListings(1); };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchListings(newPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryChip = (cat: string) => {
    setCategory(cat);
    setPage(1);
    setTimeout(() => fetchListings(1), 0);
  };

  const clearFilters = () => {
    setQuery(''); setLocationText(''); setCoordinates(null);
    setCategory(''); setMode(''); setSortBy('newest'); setPage(1);
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
    <div className="min-h-screen relative overflow-x-hidden">
      {/* ══ FULL-PAGE GRADIENT BACKGROUND ══ */}
      <div className="fixed inset-0 z-0">
        {/* Base warm gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(14,100%,96%)] via-[hsl(30,100%,95%)] to-[hsl(40,100%,93%)]" />
        {/* Vibrant animated orbs */}
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[hsl(14,100%,57%)]/20 blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -50, 60, 0], y: [0, 40, -40, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-32 w-[800px] h-[800px] rounded-full bg-[hsl(40,100%,49%)]/15 blur-[170px]"
        />
        <motion.div
          animate={{ x: [0, 30, -40, 0], y: [0, -30, 50, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[hsl(14,80%,50%)]/12 blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -25, 35, 0], y: [0, 35, -25, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut', delay: 2 }}
          className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(25,95%,55%)]/10 blur-[140px]"
        />
      </div>

      {/* ══ CUSTOM HEADER WITH INTEGRATED SEARCH ══ */}
      <header className="sticky top-0 z-50 w-full">
        <div className="relative overflow-hidden">
          {/* Header gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)] via-[hsl(20,90%,50%)] to-[hsl(40,100%,49%)]" />
          {/* Animated shine */}
          <div className="absolute inset-0 hp2-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          {/* Glass overlay */}
          <div className="absolute inset-0 backdrop-blur-md bg-black/5" />

          <div className="relative max-w-7xl mx-auto px-4">
            {/* Top row: Logo + Search + Actions */}
            <div className="flex items-center gap-4 h-16">
              {/* Favicon / Logo */}
              <Link to="/" className="shrink-0 flex items-center gap-2">
                <img src={vendibookFavicon} alt="Vendibook" className="h-9 w-auto drop-shadow-lg sm:hidden" />
                <img src={vendibookLogo} alt="Vendibook" className="hidden sm:block h-28 w-auto drop-shadow-lg brightness-0 invert" />
              </Link>

              {/* Search bar — glass field in header */}
              <div className="flex-1 flex items-center gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search food trucks, kitchens, spaces..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/15 backdrop-blur-xl border border-white/25 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all"
                  />
                </div>
                <div className="hidden md:block min-w-[170px]">
                  <LocationSearchInput
                    value={locationText}
                    onChange={setLocationText}
                    onLocationSelect={(loc) => setCoordinates(loc?.coordinates ?? null)}
                    selectedCoordinates={coordinates}
                    placeholder="Location"
                    className="h-10 rounded-xl bg-white/15 backdrop-blur-xl border-white/25 text-sm [&_input]:text-white [&_input]:placeholder:text-white/60"
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
                <Button asChild variant="dark-shine" size="sm" className="hidden sm:flex h-9 rounded-xl text-xs font-semibold">
                  <Link to="/list">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Listing
                  </Link>
                </Button>
                {/* Sign Up — desktop only */}
                <Button asChild variant="dark-shine" size="sm" className="hidden sm:flex h-9 rounded-xl text-xs font-semibold">
                  <Link to="/auth">
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Sign Up
                  </Link>
                </Button>
                {/* Learn More — mobile only (replaces sign up) */}
                {/* Learn More — small inline badge */}
                <Button
                  variant="dark-shine"
                  size="sm"
                  onClick={() => setLearnMoreOpen(!learnMoreOpen)}
                  className="hidden sm:flex h-8 rounded-xl text-[11px] font-medium gap-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  Learn More
                </Button>
                {/* Hamburger menu — always visible far right */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Dropdown menu — pops from right */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-4 top-[60px] z-50 w-52 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden"
                >
                  <div className="py-1.5">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <UserPlus className="w-4 h-4 text-white/70" /> Sign In
                    </Link>
                    <Link to="/list" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Plus className="w-4 h-4 text-white/70" /> Create Listing
                    </Link>
                    <Link to="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Info className="w-4 h-4 text-white/70" /> How It Works
                    </Link>
                    <Link to="/browse" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                      <Search className="w-4 h-4 text-white/70" /> Browse All
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom row: Category chips + mode + sort */}
            <div className="flex items-center justify-center gap-2.5 pb-2.5 -mt-0.5">
              {/* Category chips */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryChip(cat.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      category === cat.value
                        ? 'bg-white text-gray-900 border-white/80 shadow-lg shadow-black/10 font-bold'
                        : 'bg-white/10 backdrop-blur border-white/20 text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.label}
                  </motion.button>
                ))}
              </div>

              {/* Mode pills */}
              <div className="flex h-8 rounded-lg overflow-hidden border border-white/25 bg-white/10 backdrop-blur">
                {(['', 'rent', 'sale'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setTimeout(handleSearch, 0); }}
                    className={`px-3 text-xs font-semibold transition-all ${
                      mode === m
                        ? 'bg-white text-gray-900'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m === '' ? 'All' : m === 'rent' ? 'Rent' : 'Buy'}
                  </button>
                ))}
              </div>


              {/* Result count */}
              <span className="text-xs text-white/60 hidden md:inline whitespace-nowrap font-medium">
                {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>

              {/* Mobile map toggle */}
              <button onClick={() => setShowMap(!showMap)} className="lg:hidden p-1.5 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20">
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MAIN LAYOUT ══ */}
      <div className="relative z-10 flex">
        {/* ── CONTENT ── */}
        <div className="flex-1 min-w-0">
          <div ref={resultsRef} className="scroll-mt-32 max-w-6xl mx-auto px-4 pt-6 pb-6">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground/70">
                {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Listings 2x2 Grid */}
              <div className={`lg:col-span-3 ${showMap ? 'hidden lg:block' : ''}`}>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-72 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 animate-pulse shadow-sm" />
                    ))}
                  </div>
                ) : listings.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {listings.map((listing, i) => (
                          <motion.div
                            key={listing.id}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                            whileHover={{ y: -6, transition: { duration: 0.2 } }}
                            className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 hover:shadow-2xl hover:shadow-[hsl(14,100%,57%)]/10 hover:border-[hsl(14,100%,57%)]/30 transition-all duration-300"
                          >
                            <ListingCard listing={listing} />
                          </motion.div>
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
                  /* ── Empty State ── */
                  <div className="relative flex flex-col items-center justify-center py-28 px-6 rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-xl">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                        className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-[hsl(14,100%,57%)]/25 blur-[90px]"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
                        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }}
                        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[hsl(40,100%,49%)]/20 blur-[90px]"
                      />
                    </div>

                    <motion.div
                      animate={{ y: [0, -14, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className="relative mb-4"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/40 to-[hsl(40,100%,49%)]/40 blur-xl scale-150" />
                      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] flex items-center justify-center shadow-2xl shadow-[hsl(14,100%,57%)]/30">
                        <Truck className="w-12 h-12 text-white" />
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1.2 }}
                      className="absolute top-16 right-16"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(40,100%,49%)] to-[hsl(14,100%,57%)] flex items-center justify-center shadow-xl shadow-[hsl(40,100%,49%)]/25">
                        <Utensils className="w-7 h-7 text-white" />
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No listings found here yet</h3>
                    <p className="text-gray-600 text-center max-w-sm mb-8 text-sm">
                      Try expanding your search area, adjusting filters, or browse everything we have.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={clearFilters} className="rounded-xl bg-white/70 backdrop-blur border-gray-200 hover:bg-white text-gray-900">
                        <X className="w-4 h-4 mr-1" /> Clear Filters
                      </Button>
                      <Button asChild className="rounded-xl bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-black/20 border border-gray-700">
                        <Link to="/browse">Browse All</Link>
                      </Button>
                    </div>
                  </div>
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

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="hidden xl:flex flex-col w-[280px] shrink-0 sticky top-[7.5rem] h-[calc(100vh-8rem)] z-20">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Sign Up CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-lg shadow-black/5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] flex items-center justify-center mb-3 shadow-lg shadow-[hsl(14,100%,57%)]/25">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">Join Vendibook</h4>
              <p className="text-xs text-gray-600 mb-4">Create an account to save favorites, book instantly, and more.</p>
              <Button asChild size="sm" className="w-full rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-xs font-semibold shadow-lg shadow-black/15 border border-gray-700">
                <Link to="/auth">Sign Up Free</Link>
              </Button>
            </motion.div>

            {/* Create Listing CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-lg shadow-black/5"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(40,100%,49%)] to-[hsl(14,100%,57%)] flex items-center justify-center mb-3 shadow-lg shadow-[hsl(40,100%,49%)]/25">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">List Your Asset</h4>
              <p className="text-xs text-gray-600 mb-4">Rent or sell your food truck, kitchen, or equipment.</p>
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl bg-white/50 border-gray-200 hover:bg-white text-gray-900 text-xs font-semibold">
                <Link to="/list">
                  Create Listing <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </motion.div>

            {/* Learn More — expandable */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 overflow-hidden shadow-lg shadow-black/5"
            >
              <button
                onClick={() => setLearnMoreOpen(!learnMoreOpen)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)]/20 to-[hsl(40,100%,49%)]/20 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-[hsl(14,100%,57%)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900">How It Works</h4>
                  <p className="text-xs text-gray-500">Learn about Vendibook</p>
                </div>
                <motion.div animate={{ rotate: learnMoreOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {learnMoreOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {[
                        { icon: Search, title: 'Search', desc: 'Find assets near you' },
                        { icon: MapPin, title: 'Book', desc: 'Reserve instantly or request' },
                        { icon: Sparkles, title: 'Launch', desc: 'Show up & start serving' },
                      ].map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(14,100%,57%)]/15 to-[hsl(40,100%,49%)]/15 flex items-center justify-center shrink-0 mt-0.5">
                            <step.icon className="w-3.5 h-3.5 text-[hsl(14,100%,57%)]" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-gray-900">{step.title}</p>
                            <p className="text-[11px] text-gray-500">{step.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                      <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs mt-2 bg-white/50 border-gray-200 hover:bg-white text-gray-900 font-semibold">
                        <Link to="/how-it-works">
                          Learn More <ChevronRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl p-5 bg-white/60 backdrop-blur-2xl border border-white/50 shadow-lg shadow-black/5"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '500+', label: 'Listings' },
                  { value: '50+', label: 'Cities' },
                  { value: '4.8★', label: 'Rating' },
                  { value: '24h', label: 'Avg Response' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-lg font-black bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] bg-clip-text text-transparent">{stat.value}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </aside>
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
      `}</style>
    </div>
  );
};

export default Homepage2;
