import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/ui/SmartImage';
import { formatListingPriceLabel } from '@/lib/listings/rentalPricing';
import { CATEGORY_LABELS } from '@/types/listing';
import type { V2CardListing } from './V2ListingCard';

const CATEGORY_CHIPS = [
  { label: 'Food trucks', href: '/search?category=food_truck' },
  { label: 'Food trailers', href: '/search?category=food_trailer' },
  { label: 'Commercial kitchens', href: '/search?mode=rent&category=ghost_kitchen' },
  { label: 'Vendor spaces', href: '/search?mode=rent' },
];

export default function V2HomeHero({ leadListing }: { leadListing?: V2CardListing | null }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'sale' | 'rent'>('sale');
  const [query, setQuery] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ mode });
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="v2-home-hero">
      <div className="v2-home-hero-copy">
        <p className="v2-home-eyebrow">The marketplace for mobile food businesses</p>
        <h1>Buy, sell, and rent food trucks, trailers, and kitchens.</h1>
        <p className="v2-home-lede">
          Real inventory nationwide, secure PayPal checkout, and financing options where available.
        </p>

        <form className="v2-home-search" onSubmit={submit} role="search">
          <div className="v2-home-modes" role="group" aria-label="Search mode">
            <Button type="button" variant="ghost" className={mode === 'sale' ? 'is-active' : undefined} onClick={() => setMode('sale')} aria-pressed={mode === 'sale'}>Buy</Button>
            <Button type="button" variant="ghost" className={mode === 'rent' ? 'is-active' : undefined} onClick={() => setMode('rent')} aria-pressed={mode === 'rent'}>Rent</Button>
          </div>
          <div className="v2-home-field">
            <Search aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Truck, trailer, kitchen, or city" aria-label="Search listings" />
          </div>
          <Button type="submit" className="v2-home-btn">Search<ArrowRight aria-hidden="true" /></Button>
        </form>

        <div className="v2-home-chips">
          {CATEGORY_CHIPS.map((chip) => <Link key={chip.label} to={chip.href}>{chip.label}</Link>)}
        </div>
      </div>

      {leadListing && (
        <Link to={`/listing/${leadListing.id}`} className="v2-home-hero-listing">
          <SmartImage src={leadListing.image_urls?.[0] ?? null} alt={leadListing.title} aspect="4/3" priority radiusClass="rounded-none" sizes="(max-width: 900px) 100vw, 560px" />
          <span className="v2-home-hero-listing-copy">
            <span className="v2-home-hero-listing-kicker">Explore the marketplace</span>
            <strong>{leadListing.title}</strong>
            <span>
              <MapPin aria-hidden="true" />
              {[leadListing.city, leadListing.state].filter(Boolean).join(', ')}
              <i aria-hidden="true">·</i>
              {leadListing.category ? CATEGORY_LABELS[leadListing.category as keyof typeof CATEGORY_LABELS] : 'Listing'}
            </span>
            <b>{formatListingPriceLabel(leadListing as never)}</b>
          </span>
        </Link>
      )}
    </section>
  );
}
