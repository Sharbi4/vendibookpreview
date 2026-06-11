import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

export interface MockCta {
  /** Legacy overlay positioning fields — ignored now that CTAs render as real buttons. */
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  href: string;
  label: string;
  event?: string;
}

export interface SearchOverlay {
  /** Legacy overlay positioning fields — ignored now that the search bar is real. */
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  placeholder?: string;
  /** Mode appended to the resulting /search URL. Defaults to 'all'. */
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

  const handleCta = (c: MockCta) => {
    if (c.event) trackLeadEvent(c.event as any, { source: 'home_hero', route: '/' });
    if (c.href.startsWith('http')) window.location.href = c.href;
    else navigate(c.href);
  };

  const [primaryCta, ...secondaryCtas] = ctas;

  return (
    <div className="relative w-full">
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
      </div>

      {searchOverlay && (
        <div className="mt-4 flex items-stretch gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-4 h-12 shadow-sm ring-1 ring-black/10">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={searchOverlay.placeholder || 'Search food trucks, trailers, kitchens…'}
              aria-label="Search listings"
              className="w-full min-w-0 bg-transparent text-[16px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={submitSearch}
            aria-label="Search"
            className="shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-semibold px-5 h-12 hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            Search
          </button>
        </div>
      )}

      {ctas.length > 0 && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          {primaryCta && (
            <button
              type="button"
              onClick={() => handleCta(primaryCta)}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md"
            >
              {primaryCta.label}
            </button>
          )}
          {secondaryCtas.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => handleCta(c)}
              className="flex-1 h-12 rounded-full bg-white/10 text-white text-sm font-semibold ring-1 ring-white/20 hover:bg-white/15 active:scale-[0.99] transition-all backdrop-blur"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockHeroPanel;
