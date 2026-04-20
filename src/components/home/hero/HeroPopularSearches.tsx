import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

const POPULAR = [
  { label: 'Food trucks under $30K', q: 'food truck', mode: 'sale' },
  { label: 'Trailers in Texas', q: 'trailer Texas', mode: 'sale' },
  { label: 'Commissary kitchens', q: 'commissary kitchen', mode: 'rent' },
  { label: 'Vendor spaces', q: 'vendor space', mode: 'rent' },
];

const HeroPopularSearches = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      className="w-full max-w-2xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
    >
      <div className="flex items-center gap-2 mb-2 justify-center">
        <TrendingUp className="w-3 h-3 text-foreground/40" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Popular searches
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {POPULAR.map(({ label, q, mode }) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              navigate(`/search?q=${encodeURIComponent(q)}&mode=${mode}`)
            }
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-foreground/5 hover:bg-foreground/10 border border-border/40 hover:border-foreground/20 text-foreground/80 hover:text-foreground transition-all"
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default HeroPopularSearches;
