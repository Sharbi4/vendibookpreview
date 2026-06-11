import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { trackLeadEvent } from '@/lib/leadTracking';

const HeroSearchForm = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const baseUtm =
      'utm_source=homepage&utm_medium=hero&utm_campaign=homepage_search';
    const url = q
      ? `/search?q=${encodeURIComponent(q)}&${baseUtm}&utm_content=marketplace_panel`
      : `/search?${baseUtm}&utm_content=empty_marketplace_search`;
    trackLeadEvent('homepage_search_submit', {
      route: '/',
      query: q,
      source: 'home_hero_real_search',
    } as any);
    navigate(url);
  };

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Search food trucks and trailers"
      className="w-full max-w-xl flex items-stretch gap-2.5"
    >
      <div
        className="flex-1 min-w-0 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur pl-[22px] pr-4 ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-[#FF4B1F]/50 focus-within:shadow-[0_0_0_4px_rgba(255,75,31,0.12)] transition-shadow"
        style={{ height: 62, boxShadow: '0 12px 28px rgba(0,0,0,0.10)' }}
      >
        <Search className="w-5 h-5 text-neutral-500 shrink-0" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food truck"
          aria-label="Search food trucks or trailers"
          className="w-full min-w-0 bg-transparent text-base text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-full text-white text-base font-bold active:scale-[0.98] transition-all"
        style={{
          width: 126,
          height: 62,
          background: 'linear-gradient(135deg, #FF4B1F 0%, #FF6726 100%)',
          boxShadow: '0 14px 30px rgba(255,75,31,0.30)',
        }}
      >
        Search
      </button>
    </form>
  );
};

export default HeroSearchForm;
