import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Plus, ShieldCheck, FileCheck, UserCheck, CalendarCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import vendibookLogo from '@/assets/vendibook-logo.png';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import HeroVendiButton from './HeroVendiButton';
import HeroPopularSearches from './HeroPopularSearches';
import { useHeroSearch } from './useHeroSearch';

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: 'Secure payments' },
  { icon: UserCheck, label: 'Verified profiles' },
  { icon: FileCheck, label: 'Document collection' },
  { icon: CalendarCheck, label: 'Booking requests' },
  { icon: CreditCard, label: 'Financing options' },
];

// Preload the logo as early as possible
if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = vendibookLogo;
  document.head.appendChild(link);
}

const HeroValueProp = () => {
  const navigate = useNavigate();
  const search = useHeroSearch();

  return (
    <section className="relative min-h-[92svh] sm:min-h-[92vh] flex items-center justify-center bg-background py-12 sm:py-16 md:py-20" style={{ overflow: 'clip' }}>
      <HeroBackground />

      <div className="container relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* ╔═══ BRAND STAGE PANEL ═══╗ */}
        <motion.div
          className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden"
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background:
              'linear-gradient(180deg, hsl(0 0% 13%) 0%, hsl(0 0% 11%) 35%, hsl(0 0% 9.5%) 65%, hsl(0 0% 12%) 100%), ' +
              'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 70%)',
            boxShadow:
              '0 1px 0 0 rgba(255,255,255,0.12) inset, ' +
              '0 -1px 0 0 rgba(0,0,0,0.5) inset, ' +
              '0 30px 80px -24px rgba(0,0,0,0.85), ' +
              '0 8px 24px -12px rgba(255,81,36,0.10)',
          }}
        >
          {/* Panel border (2px gradient via mask) */}
          <div
            className="absolute inset-0 rounded-[28px] sm:rounded-[36px] pointer-events-none"
            style={{
              padding: '2px',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0.06) 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Satin diagonal sheen sweep */}
          <div
            className="absolute inset-0 rounded-[28px] sm:rounded-[36px] pointer-events-none opacity-[0.5]"
            style={{
              background:
                'linear-gradient(115deg, transparent 0%, transparent 35%, rgba(255,255,255,0.035) 50%, transparent 65%, transparent 100%)',
            }}
          />

          {/* Inner ambient warm glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[60%] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at top, rgba(255,81,36,0.07) 0%, rgba(255,186,8,0.03) 35%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Subtle top-edge highlight */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)',
            }}
          />

          {/* Content */}
          <div className="relative px-5 sm:px-8 md:px-12 py-10 sm:py-14 md:py-16 text-center flex flex-col items-center">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 sm:mb-8 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/75">
                Verified <span className="text-foreground/30 mx-1">·</span> Insured <span className="text-foreground/30 mx-1">·</span> Built for food businesses
              </span>
            </motion.div>

            {/* Logo brand stage */}
            <motion.div
              className="relative mb-6 sm:mb-8"
              style={{ overflow: 'visible' }}
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Layer 1 — wide soft satin halo (outer luminous wash) */}
              <motion.div
                className="absolute z-0 pointer-events-none left-1/2 top-1/2"
                style={{
                  width: '260%',
                  height: '220%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,220,180,0.12) 22%, rgba(255,81,36,0.08) 45%, transparent 75%)',
                  filter: 'blur(50px)',
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2, delay: 0.35, ease: 'easeOut' }}
              />

              {/* Layer 2 — concentrated bright core (anchors the logo) */}
              <motion.div
                className="absolute z-0 pointer-events-none left-1/2 top-1/2"
                style={{
                  width: '160%',
                  height: '160%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(ellipse 50% 45% at 50% 50%, rgba(255,255,255,0.32) 0%, rgba(255,220,180,0.20) 25%, rgba(255,81,36,0.12) 50%, transparent 70%)',
                  filter: 'blur(28px)',
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.6, delay: 0.4, ease: 'easeOut' }}
              />

              {/* Layer 3 — horizontal satin band sweep (silk highlight) */}
              <motion.div
                className="absolute z-0 pointer-events-none left-1/2 top-1/2"
                style={{
                  width: '240%',
                  height: '80%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.07) 35%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.07) 65%, transparent 100%)',
                  filter: 'blur(18px)',
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.6, delay: 0.5, ease: 'easeOut' }}
              />

              {/* Layer 4 — subtle diagonal satin shimmer (slow drift) */}
              <motion.div
                className="absolute z-0 pointer-events-none left-1/2 top-1/2"
                style={{
                  width: '180%',
                  height: '180%',
                  transform: 'translate(-50%, -50%)',
                  background:
                    'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.05) 48%, rgba(255,220,180,0.06) 52%, transparent 70%)',
                  filter: 'blur(12px)',
                  borderRadius: '50%',
                }}
                animate={{
                  x: ['-2%', '2%', '-2%'],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src={vendibookLogo}
                alt="Vendibook"
                width={1536}
                height={1024}
                fetchPriority="high"
                loading="eager"
                decoding="sync"
                className="relative z-[1] h-40 sm:h-52 md:h-60 lg:h-72 w-auto"
                style={{
                  filter:
                    'drop-shadow(0 4px 16px rgba(0,0,0,0.6)) ' +
                    'drop-shadow(0 0 36px rgba(255,255,255,0.22)) ' +
                    'drop-shadow(0 0 72px rgba(255,81,36,0.16))',
                }}
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.05] tracking-tight mb-4 sm:mb-5 max-w-3xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
            >
              The marketplace for{' '}
              <span className="relative inline-block">
                <span className="gradient-text-warm">food business.</span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-[2px] rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,81,36,0.55), rgba(255,186,8,0.4), transparent)',
                  }}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  transition={{ duration: 1, delay: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-7 sm:mb-9 leading-relaxed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              Rent, buy, host, or sell food trucks, trailers, shared kitchens, and vendor spaces — with secure payments, document collection, and built-in booking tools.
            </motion.p>

            {/* Search + Vendi */}
            <motion.div
              className="w-full max-w-xl space-y-3 mb-7 sm:mb-9"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <HeroSearchInput {...search} />
              <HeroVendiButton />
              <HeroPopularSearches />
            </motion.div>

            {/* Triple CTA row */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7 sm:mb-9"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => navigate('/search')}
                className="rounded-full px-7 gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <Search className="w-4 h-4" />
                Browse Listings
              </Button>
              <Button
                variant="glass-cta"
                size="lg"
                onClick={() => navigate('/list')}
                className="rounded-full px-7 gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                List Your Asset
              </Button>
              <button
                onClick={() => navigate('/how-it-works')}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
              >
                How it works
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.div>

            {/* Trust row — structured pills */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2.5 max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
            >
              {TRUST_SIGNALS.map((signal, i) => {
                const Icon = signal.icon;
                return (
                  <motion.span
                    key={signal.label}
                    className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/85 hover:text-foreground transition-colors duration-300 cursor-default"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 + i * 0.06 }}
                  >
                    <Icon className="w-3 h-3 text-foreground/55" strokeWidth={2} />
                    {signal.label}
                  </motion.span>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroValueProp;
