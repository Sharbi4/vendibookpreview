import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

export interface MockCta {
  /** Top in % of visible (cropped) image height */
  top: number;
  left: number;
  width: number;
  height: number;
  href: string;
  label: string;
  event?: string;
}

export interface SearchOverlay {
  top: number;
  left: number;
  width: number;
  height: number;
  placeholder?: string;
  /** Mode appended to the resulting /search URL. Defaults to 'rent'. */
  mode?: 'rent' | 'sale' | 'all';
}

interface Props {
  imageUrl: string;
  alt: string;
  ctas: MockCta[];
  searchOverlay?: SearchOverlay;
  /** Y-pixel where the visible area ends (defaults to full native height). */
  visibleBottomPx?: number;
  /** Y-pixel where the visible area starts. Use this to crop the mockup's own
   * browser/page header off the top of the image. Defaults to 0. */
  visibleTopPx?: number;
}

const NATIVE_WIDTH = 941;
const NATIVE_HEIGHT = 1672;

const MockHeroPanel = ({
  imageUrl,
  alt,
  ctas,
  searchOverlay,
  visibleBottomPx = NATIVE_HEIGHT,
  visibleTopPx = 0,
}: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const visibleHeight = Math.max(1, visibleBottomPx - visibleTopPx);
  const aspectRatio = `${NATIVE_WIDTH} / ${visibleHeight}`;

  // Existing CTA/overlay percentages are calibrated against visibleBottomPx
  // from the top of the native image. Re-map them to the cropped frame.
  const remapTop = (pct: number) =>
    ((pct / 100) * visibleBottomPx - visibleTopPx) / visibleHeight * 100;
  const remapHeight = (pct: number) =>
    (pct / 100) * visibleBottomPx / visibleHeight * 100;

  // Image is rendered at 100% of the frame width; shift it up so the cropped
  // top falls outside the frame.
  const imageTopOffsetPct = -(visibleTopPx / visibleHeight) * 100;

  const submitSearch = () => {
    const q = query.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (searchOverlay?.mode && searchOverlay.mode !== 'all') params.set('mode', searchOverlay.mode);
    trackLeadEvent('homepage_search_submit', {
      route: '/',
      query: q,
      source: 'home_hero_mock_search',
    } as any);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch();
    }
  };

  return (
    <div className="relative w-full mx-auto max-w-[480px] sm:max-w-[520px] md:max-w-[560px] px-2 sm:px-0">
      <div
        className="relative w-full overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-2xl"
        style={{ aspectRatio }}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="absolute inset-x-0 w-full select-none pointer-events-none"
          style={{ top: `${imageTopOffsetPct}%` }}
          draggable={false}
        />
        {ctas.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-label={c.label}
            onClick={() => {
              if (c.event) trackLeadEvent(c.event as any, { source: 'home_hero', route: '/' });
              if (c.href.startsWith('http')) window.location.href = c.href;
              else navigate(c.href);
            }}
            className="absolute rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            style={{
              top: `${remapTop(c.top)}%`,
              left: `${c.left}%`,
              width: `${c.width}%`,
              height: `${remapHeight(c.height)}%`,
            }}
          />
        ))}
        {searchOverlay && (
          <div
            className="absolute flex items-stretch gap-1 z-10"
            style={{
              top: `${remapTop(searchOverlay.top)}%`,
              left: `${searchOverlay.left}%`,
              width: `${searchOverlay.width}%`,
              height: `${remapHeight(searchOverlay.height)}%`,
            }}
          >
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-3 sm:px-4 shadow-sm ring-1 ring-black/5">
              <Search className="w-4 h-4 text-neutral-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder={searchOverlay.placeholder || 'Search food trucks, trailers, kitchens…'}
                aria-label="Search listings"
                className="w-full min-w-0 bg-transparent text-[16px] sm:text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={submitSearch}
              aria-label="Search"
              className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold px-3 sm:px-4 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockHeroPanel;
