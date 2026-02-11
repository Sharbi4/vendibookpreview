import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, SlidersHorizontal, Truck, ChevronRight, Sparkles, Map as MapIcon, X } from 'lucide-react';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'food_trailer', label: 'Food Trailer' },
  { value: 'commercial_kitchen', label: 'Kitchen' },
  { value: 'vendor_space', label: 'Vendor Space' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'pop_up_space', label: 'Pop-Up' },
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
  // Filter state
  const [query, setQuery] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<'rent' | 'sale' | ''>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'distance'>('newest');
  const [page, setPage] = useState(1);

  // Data state
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Map state
  const [showMap, setShowMap] = useState(false);
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

  // Initial load
  useEffect(() => {
    fetchListings(1);
  }, []);

  // Re-fetch when sort changes
  useEffect(() => {
    if (hasSearched) {
      setPage(1);
      fetchListings(1);
    }
  }, [sortBy]);

  const handleSearch = () => {
    setPage(1);
    fetchListings(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchListings(newPage);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryChip = (cat: string) => {
    setCategory(cat);
    setPage(1);
    // Auto-search on chip click
    setTimeout(() => fetchListings(1), 0);
  };

  const clearFilters = () => {
    setQuery('');
    setLocationText('');
    setCoordinates(null);
    setCategory('');
    setMode('');
    setSortBy('newest');
    setPage(1);
    fetchListings(1);
  };

  // Build pagination range
  const getPaginationRange = () => {
    const range: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (page > 3) range.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        range.push(i);
      }
      if (page < totalPages - 2) range.push('ellipsis');
      range.push(totalPages);
    }
    return range;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Gradient Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FF5124] via-[#E64A19] to-[#FFB800]">
        {/* Animated shine */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        {/* Decorative orbs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-yellow-300/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight text-center mb-2" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
            Discover Food Business Assets
          </h1>
          <p className="text-white/80 text-center text-sm md:text-base mb-8 max-w-xl mx-auto">
            Search food trucks, trailers, kitchens &amp; vendor spaces near you
          </p>

          {/* Inline search row */}
          <div className="flex flex-col md:flex-row gap-3 max-w-4xl mx-auto">
            <div className="flex-1 min-w-0">
              <LocationSearchInput
                value={locationText}
                onChange={setLocationText}
                onLocationSelect={(loc) => setCoordinates(loc?.coordinates ?? null)}
                selectedCoordinates={coordinates}
                placeholder="City, state, or zip"
                className="h-12 bg-white/90 backdrop-blur border-0 rounded-xl shadow-lg text-foreground"
              />
            </div>

            <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); }}>
              <SelectTrigger className="h-12 w-full md:w-44 bg-white/90 backdrop-blur border-0 rounded-xl shadow-lg text-foreground">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.filter(c => c.value).map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mode toggle */}
            <div className="flex h-12 rounded-xl overflow-hidden shadow-lg">
              {(['', 'rent', 'sale'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-foreground text-background'
                      : 'bg-white/90 text-foreground hover:bg-white'
                  }`}
                >
                  {m === '' ? 'All' : m === 'rent' ? 'Rent' : 'Sale'}
                </button>
              ))}
            </div>

            <Button
              onClick={handleSearch}
              className="h-12 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 shadow-lg font-semibold"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* ── Filter / Sort Bar ── */}
      <div ref={resultsRef} className="sticky top-16 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChip(cat.value)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  category === cat.value
                    ? 'bg-gradient-to-r from-[#FF5124] to-[#FFB800] text-white shadow-md'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40 h-9 text-xs rounded-full bg-muted/60 border-0">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_low">Price: Low → High</SelectItem>
              <SelectItem value="price_high">Price: High → Low</SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
            </SelectContent>
          </Select>

          {/* Result count */}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {totalCount} {totalCount === 1 ? 'result' : 'results'}
          </span>

          {/* Mobile map toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden rounded-full"
            onClick={() => setShowMap(!showMap)}
          >
            <MapIcon className="w-4 h-4 mr-1" />
            {showMap ? 'List' : 'Map'}
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel — Listings */}
          <div className={`lg:col-span-3 ${showMap ? 'hidden lg:block' : ''}`}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-72 rounded-2xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {listings.map((listing, i) => (
                      <motion.div
                        key={listing.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        whileHover={{ y: -4 }}
                        className="transition-shadow hover:shadow-xl rounded-2xl"
                      >
                        <ListingCard listing={listing} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 mb-4">
                    <Pagination>
                      <PaginationContent>
                        {page > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(page - 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                        {getPaginationRange().map((p, idx) =>
                          p === 'ellipsis' ? (
                            <PaginationItem key={`e-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink
                                isActive={p === page}
                                onClick={() => handlePageChange(p as number)}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        {page < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => handlePageChange(page + 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              /* ── Empty State ── */
              <div className="relative flex flex-col items-center justify-center py-24 px-6">
                {/* Animated gradient orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-[#FF5124]/15 blur-3xl animate-pulse" />
                  <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-[#FFB800]/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="relative mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF5124]/20 to-[#FFB800]/20 flex items-center justify-center">
                    <Truck className="w-10 h-10 text-[#FF5124]" />
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-foreground mb-2">No listings found here yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6 text-sm">
                  Try expanding your search area, adjusting your filters, or browse all available listings.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={clearFilters} className="rounded-full">
                    <X className="w-4 h-4 mr-1" /> Clear Filters
                  </Button>
                  <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                    <Link to="/browse">Browse All</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Learn More Module ── */}
            <div className="mt-8 mb-4 backdrop-blur-xl bg-muted/40 border border-border/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold mb-4">How Vendibook Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Search, title: 'Search', desc: 'Find food trucks, kitchens & spaces near you' },
                  { icon: MapPin, title: 'Book', desc: 'Reserve instantly or send a request to the host' },
                  { icon: Sparkles, title: 'Launch', desc: 'Show up and start serving — it\'s that simple' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5124]/15 to-[#FFB800]/15 flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-[#FF5124]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="mt-5 rounded-full">
                <Link to="/how-it-works">
                  Learn More <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Panel — Map */}
          <div className={`lg:col-span-2 ${showMap ? '' : 'hidden lg:block'}`}>
            <div className="sticky top-32 h-[calc(100vh-9rem)] rounded-2xl overflow-hidden border border-border/50 backdrop-blur-xl bg-muted/20">
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

      <Footer />

      {/* shimmer keyframe style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Homepage2;
