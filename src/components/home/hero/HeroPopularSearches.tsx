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
      <div className="flex items-center gap-2 mb-2.5 justify-center">
        <TrendingUp className="w-3 h-3 text-foreground/40" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Popular searches
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {POPULAR.map(({ label, q, mode }, i) => (
          <motion.button
            key={label}
            type="button"
            onClick={() =>
              navigate(`/search?q=${encodeURIComponent(q)}&mode=${mode}`)
            }
            className="vb-popular-pill relative group px-3.5 py-1.5 rounded-full text-xs font-semibold text-foreground transition-all duration-300 cursor-pointer overflow-hidden"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 + i * 0.07 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
          >
            {/* Animated conic gradient border — Lovable-style */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none vb-pill-border"
              style={{
                padding: '2px',
                background:
                  'conic-gradient(from var(--vb-angle, 0deg), #ff5124, #ff6b3d, #ffba08, #ff9f1c, #ff5124, #ff3d8a, #ff5124)',
                WebkitMask:
                  'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            {/* Outer soft glow halo (intensifies on hover) */}
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full pointer-events-none opacity-30 group-hover:opacity-70 blur-md transition-opacity duration-300"
              style={{
                background:
                  'conic-gradient(from var(--vb-angle, 0deg), rgba(255,81,36,0.55), rgba(255,186,8,0.4), rgba(255,61,138,0.4), rgba(255,81,36,0.55))',
              }}
            />
            {/* Hover shimmer sweep */}
            <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />
            </span>
            {/* Background fill — slightly warm dark */}
            <span className="absolute inset-0 rounded-full bg-background/85 group-hover:bg-background/70 transition-colors duration-300" />
            <span className="relative tracking-tight">{label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default HeroPopularSearches;
