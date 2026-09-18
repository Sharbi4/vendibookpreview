import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleContinueButton from '@/components/auth/GoogleContinueButton';
import { useAuth } from '@/contexts/AuthContext';
import { SmartImage } from '@/components/ui/SmartImage';
import { formatListingPriceLabel } from '@/lib/listings/rentalPricing';
import { CATEGORY_LABELS } from '@/types/listing';
import type { V2CardListing } from './V2ListingCard';
import vendibookHeroLogo from '@/assets/vendibook-logo-upload.png.asset.json';

const CATEGORY_CHIPS = [
  { label: 'Food trucks', href: '/search?category=food_truck' },
  { label: 'Food trailers', href: '/search?category=food_trailer' },
  { label: 'Commercial kitchens', href: '/search?mode=rent&category=ghost_kitchen' },
  { label: 'Vendor spaces', href: '/search?mode=rent' },
];

const SLIDE_INTERVAL_MS = 6500;

export default function V2HomeHero({ slides }: { slides: V2CardListing[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<'sale' | 'rent'>('sale');
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count ? index % count : 0;

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, SLIDE_INTERVAL_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [count, paused]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ mode });
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  const current = count ? slides[safeIndex] : null;

  return (
    <section className="v2-home-hero">
      <div className="v2-home-hero-copy">
        <p className="v2-home-eyebrow">The marketplace for mobile food businesses</p>
        <h1 className="sr-only">Vendibook — buy, sell, and rent food trucks, trailers, and kitchens</h1>
        <img className="v2-home-hero-logo" src={vendibookHeroLogo.url} alt="Vendibook" />
        <p className="v2-home-lede">
          Real inventory nationwide, secure checkout, and easy financing.*
        </p>
        <p className="v2-home-finance-legal">
          *Financing is offered by third-party lenders and is subject to application, approval, and lender terms. Vendibook is not a lender.
        </p>

        <form className="v2-home-search" onSubmit={submit} role="search">
          <div className="v2-home-modes" role="group" aria-label="Search mode">
            <Button type="button" variant="ghost" className={mode === 'sale' ? 'is-active' : undefined} onClick={() => setMode('sale')} aria-pressed={mode === 'sale'}>Buy</Button>
            <Button type="button" variant="ghost" className={mode === 'rent' ? 'is-active' : undefined} onClick={() => setMode('rent')} aria-pressed={mode === 'rent'}>Rent</Button>
          </div>
          <div className="v2-home-searchbar">
            <div className="v2-home-field">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'rent' ? 'Search rentals, kitchens, vendor spaces, or a city' : 'Search food trucks, trailers, kitchens, or a city'}
                aria-label="Search listings"
              />
            </div>
            <Button type="submit" className="v2-home-searchgo">Search</Button>
          </div>
        </form>

        <div className="v2-home-entry-actions" aria-label="Sell or sign in">
          <Link
            to={user ? '/list' : '/auth?mode=signup&role=host&redirect=%2Flist'}
            className="v2-home-list-free"
          >
            <span>
              <small>For owners and dealers</small>
              <strong>List for free</strong>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          {!user && (
            <GoogleContinueButton
              returnPath="/"
              label="Sign in with Google"
              className="v2-home-google-login"
            />
          )}
        </div>

        <div className="v2-home-chips">
          {CATEGORY_CHIPS.map((chip) => <Link key={chip.label} to={chip.href}>{chip.label}</Link>)}
        </div>

      </div>

      {current && (
        <div
          className="v2-home-hero-listing v2-home-hero-slides"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured listings"
        >
          <Link to={`/listing/${current.id}`} className="v2-home-hero-slide-link" key={current.id}>
            <SmartImage src={current.image_urls?.[0] ?? null} alt={current.title} aspect="4/3" priority={safeIndex === 0} radiusClass="rounded-none" sizes="(max-width: 900px) 100vw, 560px" />
            <span className="v2-home-hero-listing-copy">
              <span className="v2-home-hero-listing-kicker">Featured on Vendibook</span>
              <strong>{current.title}</strong>
              <span>
                <MapPin aria-hidden="true" />
                {[current.city, current.state].filter(Boolean).join(', ')}
                <i aria-hidden="true">·</i>
                {current.category ? CATEGORY_LABELS[current.category as keyof typeof CATEGORY_LABELS] : 'Listing'}
              </span>
              <b>{formatListingPriceLabel(current as never)}</b>
            </span>
          </Link>

          {count > 1 && (
            <>
              <div className="v2-home-hero-slide-nav">
                <button type="button" onClick={() => go(safeIndex - 1)} aria-label="Previous featured listing">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button type="button" onClick={() => go(safeIndex + 1)} aria-label="Next featured listing">
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
              <div className="v2-home-hero-slide-dots" role="tablist" aria-label="Choose featured listing">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIndex}
                    aria-label={`Show ${s.title}`}
                    className={i === safeIndex ? 'is-active' : undefined}
                    onClick={() => go(i)}
                  >
                    {i === safeIndex && !paused && (
                      <span key={`${s.id}-${safeIndex}`} className="v2-home-hero-slide-progress" style={{ animationDuration: `${SLIDE_INTERVAL_MS}ms` }} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
