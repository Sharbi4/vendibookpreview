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
      className="w-full max-w-xl flex items-stretch gap-2"
    >
      <div className="flex-1 flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-4 h-12 shadow-sm ring-1 ring-black/10 focus-within:ring-2 focus-within:ring-primary/60">
        <Search className="w-4 h-4 text-neutral-500 shrink-0" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search food trucks or trailers..."
          aria-label="Search food trucks or trailers"
          className="w-full min-w-0 bg-transparent text-base text-neutral-900 placeholder:text-neutral-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-semibold px-5 h-12 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
      >
        Search
      </button>
    </form>
  );
};

export default HeroSearchForm;
