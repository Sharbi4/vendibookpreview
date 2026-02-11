import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, SlidersHorizontal, Truck, ChevronRight, Sparkles,
  Map as MapIcon, X, Plus, UserPlus, Info, ArrowRight, Utensils,
  Building2, ShoppingBag, Zap,
} from 'lucide-react';
import Header from '@/components/layout/Header';
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

const CATEGORIES = [
  { value: '', label: 'All', icon: Zap },
  { value: 'food_truck', label: 'Food Trucks', icon: Truck },
  { value: 'food_trailer', label: 'Trailers', icon: Truck },
  { value: 'commercial_kitchen', label: 'Kitchens', icon: Building2 },
  { value: 'vendor_space', label: 'Vendor Spaces', icon: MapPin },
  { value: 'equipment', label: 'Equipment', icon: Utensils },
  { value: 'pop_up_space', label: 'Pop-Ups', icon: ShoppingBag },
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
    <div className="min-h-screen bg-background relative">
      {/* ── Animated background gradient mesh (4 orbs) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[hsl(14,100%,57%)]/10 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -30, 40, 0], y: [0, 30, -30, 0], scale: [1, 0.9, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'easeInOut' }}
          className="absolute top-1/3 right-0 w-[700px] h-[700px] rounded-full bg-[hsl(40,100%,49%)]/8 blur-[160px]"
        />
        <motion.div
          animate={{ x: [0, 20, -30, 0], y: [0, -20, 40, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(14,80%,50%)]/7 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -15, 25, 0], y: [0, 25, -15, 0], scale: [1, 1.05, 0.95, 1] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut', delay: 3 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[450px] h-[450px] rounded-full bg-[hsl(25,90%,55%)]/6 blur-[130px]"
        />
      </div>

      <Header />

      <div className="relative z-10 flex">
        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 min-w-0">
          {/* ── Gradient Glass Search Strip ── */}
          <div className="sticky top-16 z-30">
            {/* Search bar with gradient background */}
            <div className="relative overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)]/18 via-[hsl(20,85%,48%)]/12 to-[hsl(40,100%,49%)]/18" />
              {/* Animated shine sweep */}
              <div className="absolute inset-0 animate-[shimmer_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
              {/* Glass layer */}
              <div className="absolute inset-0 backdrop-blur-2xl bg-background/40" />
              
              <div className="relative max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2.5">
                {/* Search input — glass */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search listings..."
                    className="w-full h-9 pl-9 pr-3 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  />
                </div>

                {/* Location — glass */}
                <div className="min-w-[160px] max-w-[200px]">
                  <LocationSearchInput
                    value={locationText}
                    onChange={setLocationText}
                    onLocationSelect={(loc) => setCoordinates(loc?.coordinates ?? null)}
                    selectedCoordinates={coordinates}
                    placeholder="Location"
                    className="h-9 rounded-full bg-white/15 backdrop-blur-xl border-white/20 text-sm"
                  />
                </div>

                {/* Mode pills — glass */}
                <div className="flex h-9 rounded-full overflow-hidden border border-white/20 backdrop-blur-xl bg-white/10">
                  {(['', 'rent', 'sale'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setTimeout(handleSearch, 0); }}
                      className={`px-3.5 text-xs font-medium transition-all ${
                        mode === m
                          ? 'bg-white/25 text-foreground shadow-inner'
                          : 'text-foreground/60 hover:text-foreground hover:bg-white/10'
                      }`}
                    >
                      {m === '' ? 'All' : m === 'rent' ? 'Rent' : 'Buy'}
                    </button>
                  ))}
                </div>

                {/* Sort — glass */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-36 text-xs rounded-full bg-white/15 backdrop-blur-xl border-white/20">
                    <SlidersHorizontal className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price ↑</SelectItem>
                    <SelectItem value="price_high">Price ↓</SelectItem>
                    <SelectItem value="distance">Nearest</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search button — frosted glass */}
                <Button
                  size="sm"
                  onClick={handleSearch}
                  className="h-9 rounded-full bg-white/20 backdrop-blur-xl border border-white/25 text-foreground hover:bg-white/30 px-5 text-xs font-semibold shadow-lg"
                >
                  Search
                </Button>

                {/* Mobile map toggle */}
                <Button variant="ghost" size="sm" className="lg:hidden h-9 rounded-full text-foreground/70" onClick={() => setShowMap(!showMap)}>
                  <MapIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Category chips — same gradient strip */}
            <div className="relative overflow-hidden border-b border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,100%,57%)]/10 via-[hsl(20,85%,48%)]/6 to-[hsl(40,100%,49%)]/10" />
              <div className="absolute inset-0 backdrop-blur-xl bg-background/50" />
              
              <div className="relative max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategoryChip(cat.value)}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                        category === cat.value
                          ? 'bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] text-white border-transparent shadow-lg shadow-[hsl(14,100%,57%)]/25'
                          : 'bg-white/12 backdrop-blur-xl border-white/15 text-foreground/70 hover:text-foreground hover:bg-white/20'
                      }`}
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </motion.button>
                  ))}
                </div>
                <span className="text-xs text-foreground/50 hidden sm:inline whitespace-nowrap">
                  {totalCount} {totalCount === 1 ? 'result' : 'results'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Content Grid — scroll-mt to avoid overlap ── */}
          <div ref={resultsRef} className="scroll-mt-40 max-w-6xl mx-auto px-4 pt-8 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Listings Grid */}
              <div className={`lg:col-span-3 ${showMap ? 'hidden lg:block' : ''}`}>
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-72 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15 animate-pulse" />
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
                            className="rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/30 shadow-sm hover:shadow-2xl hover:border-[hsl(14,100%,57%)]/20 transition-all duration-300"
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
                                <PaginationPrevious onClick={() => handlePageChange(page - 1)} className="cursor-pointer rounded-full" />
                              </PaginationItem>
                            )}
                            {getPaginationRange().map((p, idx) =>
                              p === 'ellipsis' ? (
                                <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
                              ) : (
                                <PaginationItem key={p}>
                                  <PaginationLink isActive={p === page} onClick={() => handlePageChange(p as number)} className="cursor-pointer rounded-full">
                                    {p}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            )}
                            {page < totalPages && (
                              <PaginationItem>
                                <PaginationNext onClick={() => handlePageChange(page + 1)} className="cursor-pointer rounded-full" />
                              </PaginationItem>
                            )}
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Enhanced Empty State ── */
                  <div className="relative flex flex-col items-center justify-center py-28 px-6 rounded-3xl backdrop-blur-2xl bg-white/5 border border-white/15">
                    {/* Richer gradient orbs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.3, 0.15] }}
                        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                        className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-[hsl(14,100%,57%)]/20 blur-[90px]"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
                        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }}
                        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[hsl(40,100%,49%)]/18 blur-[90px]"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08] }}
                        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 2 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[hsl(25,90%,55%)]/15 blur-[80px]"
                      />
                    </div>

                    {/* Floating truck icon with glow ring */}
                    <motion.div
                      animate={{ y: [0, -14, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className="relative mb-4"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/30 to-[hsl(40,100%,49%)]/30 blur-xl scale-150" />
                      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/20 to-[hsl(40,100%,49%)]/20 backdrop-blur-xl flex items-center justify-center border border-white/15">
                        <Truck className="w-12 h-12 text-[hsl(14,100%,57%)]" />
                      </div>
                    </motion.div>

                    {/* Second floating icon — offset & delayed */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1.2 }}
                      className="absolute top-16 right-16"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(40,100%,49%)]/15 to-[hsl(14,100%,57%)]/15 backdrop-blur flex items-center justify-center border border-white/10">
                        <Utensils className="w-7 h-7 text-[hsl(40,100%,49%)]" />
                      </div>
                    </motion.div>

                    <h3 className="text-2xl font-bold text-foreground mb-2">No listings found here yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-8 text-sm">
                      Try expanding your search area, adjusting filters, or browse everything we have.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={clearFilters} className="rounded-full backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/20">
                        <X className="w-4 h-4 mr-1" /> Clear Filters
                      </Button>
                      <Button asChild className="rounded-full bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] text-white hover:opacity-90 shadow-lg shadow-[hsl(14,100%,57%)]/25">
                        <Link to="/browse">Browse All</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Panel — Glass Frame */}
              <div className={`lg:col-span-2 ${showMap ? '' : 'hidden lg:block'}`}>
                <div className="sticky top-48 h-[calc(100vh-13rem)] rounded-2xl overflow-hidden shadow-2xl">
                  {/* Gradient border glow */}
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/25 via-transparent to-[hsl(40,100%,49%)]/25 z-0" />
                  <div className="relative z-10 h-full rounded-2xl overflow-hidden border border-white/20 backdrop-blur-xl bg-background/10">
                    {/* Result count overlay */}
                    <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full backdrop-blur-xl bg-background/60 border border-white/20 text-xs font-medium text-foreground/80">
                      {totalCount} listings
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

        {/* ── RIGHT SIDEBAR — deeper glass ── */}
        <aside className="hidden xl:flex flex-col w-[280px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20 border-l border-white/10">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Sign Up CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-4 backdrop-blur-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/12 to-[hsl(40,100%,49%)]/12 border border-white/15 shadow-lg"
            >
              <UserPlus className="w-5 h-5 text-[hsl(14,100%,57%)] mb-2" />
              <h4 className="font-semibold text-sm mb-1">Join Vendibook</h4>
              <p className="text-xs text-muted-foreground mb-3">Create an account to save favorites, book instantly, and more.</p>
              <Button asChild size="sm" className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs">
                <Link to="/auth">Sign Up Free</Link>
              </Button>
            </motion.div>

            {/* Create Listing CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-4 backdrop-blur-2xl bg-white/8 border border-white/15 shadow-lg"
            >
              <Plus className="w-5 h-5 text-[hsl(40,100%,49%)] mb-2" />
              <h4 className="font-semibold text-sm mb-1">List Your Asset</h4>
              <p className="text-xs text-muted-foreground mb-3">Rent or sell your food truck, kitchen, or equipment.</p>
              <Button asChild variant="outline" size="sm" className="w-full rounded-full border-white/20 bg-white/10 hover:bg-white/20 text-xs">
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
              className="rounded-2xl backdrop-blur-2xl bg-white/8 border border-white/15 overflow-hidden shadow-lg"
            >
              <button
                onClick={() => setLearnMoreOpen(!learnMoreOpen)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)]/20 to-[hsl(40,100%,49%)]/20 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-[hsl(14,100%,57%)]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">How It Works</h4>
                  <p className="text-xs text-muted-foreground">Learn about Vendibook</p>
                </div>
                <motion.div animate={{ rotate: learnMoreOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                            <p className="font-medium text-xs">{step.title}</p>
                            <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                      <Button asChild variant="outline" size="sm" className="w-full rounded-full text-xs mt-2 border-white/20 bg-white/10 hover:bg-white/20">
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
              className="rounded-2xl p-4 backdrop-blur-2xl bg-white/8 border border-white/15 shadow-lg"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '500+', label: 'Listings' },
                  { value: '50+', label: 'Cities' },
                  { value: '4.8★', label: 'Rating' },
                  { value: '24h', label: 'Avg Response' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-lg font-bold bg-gradient-to-r from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] bg-clip-text text-transparent">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
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
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Homepage2;
