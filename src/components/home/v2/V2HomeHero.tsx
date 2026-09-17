import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

const CATEGORY_CHIPS = [
  { label: 'Food trucks', href: '/search?category=food_truck' },
  { label: 'Food trailers', href: '/search?category=food_trailer' },
  { label: 'Commercial kitchens', href: '/search?mode=rent&category=ghost_kitchen' },
  { label: 'Vendor spaces', href: '/search?mode=rent' },
];

export default function V2HomeHero() {
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
      <p className="v2-home-eyebrow">The marketplace for mobile food businesses</p>
      <h1>Buy, sell, and rent food trucks, trailers, and kitchens.</h1>
      <p className="v2-home-lede">
        Browse real listings from owners and dealers across the country, with secure PayPal
        checkout and transparent pricing.
      </p>

      <form className="v2-home-search" onSubmit={submit} role="search">
        <div className="v2-home-modes" role="group" aria-label="Search mode">
          <button
            type="button"
            className={mode === 'sale' ? 'is-active' : undefined}
            onClick={() => setMode('sale')}
            aria-pressed={mode === 'sale'}
          >
            Buy
          </button>
          <button
            type="button"
            className={mode === 'rent' ? 'is-active' : undefined}
            onClick={() => setMode('rent')}
            aria-pressed={mode === 'rent'}
          >
            Rent
          </button>
        </div>
        <div className="v2-home-field">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trucks, trailers, kitchens, or a city"
            aria-label="Search listings"
          />
        </div>
        <button type="submit" className="v2-home-btn">
          Search
          <ArrowRight aria-hidden="true" />
        </button>
      </form>

      <div className="v2-home-chips">
        {CATEGORY_CHIPS.map((chip) => (
          <Link key={chip.label} to={chip.href}>
            {chip.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
