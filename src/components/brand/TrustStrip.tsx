import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PayPalMonogram, PlaidLogo } from '@/components/brand/ProviderLogos';
import { getPayPalConfig, loadPayPalSdk, type PayPalRuntimeConfig } from '@/lib/paypalClient';
import { useAuth } from '@/contexts/AuthContext';
import { useSellerVerifiedBadge } from '@/hooks/useSellerVerifiedBadge';

interface TrustStripProps {
  /** Show the Plaid identity row (gated by the verified-seller flag upstream). */
  showPlaid?: boolean;
  href?: string;
  className?: string;
}

/**
 * Premium "black shine" trust strip.
 * Glassmorphic surface, hairline edge light, slow specular sweep on hover,
 * and divided provider rails — Apple/OpenAI-grade restraint, no gimmicks.
 */
export const TrustStrip = ({
  showPlaid = true,
  href = '#trust-and-security',
  className,
}: TrustStripProps) => {
  const [paypal, setPaypal] = useState<PayPalRuntimeConfig | null>(null);
  const [paypalError, setPaypalError] = useState(false);

  useEffect(() => {
    let active = true;
    getPayPalConfig()
      .then((cfg) => {
        if (!active) return;
        setPaypal(cfg);
        // Warm the real SDK so the first checkout mounts instantly.
        if (cfg.enabled) void loadPayPalSdk().catch(() => undefined);
      })
      .catch(() => {
        if (active) setPaypalError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const paypalDetail = paypalError
    ? 'PayPal checkout temporarily unavailable'
    : !paypal
      ? 'Connecting to PayPal…'
      : !paypal.enabled
        ? 'PayPal checkout not configured'
        : paypal.environment === 'live'
          ? 'Live payments processed by PayPal'
          : 'Test mode — processed by PayPal sandbox';

  const paypalTone: RailTone = paypalError || (paypal && !paypal.enabled)
    ? 'warn'
    : paypal?.enabled
      ? 'live'
      : 'idle';

  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative isolate block overflow-hidden rounded-[26px]',
        'border border-white/[0.08] bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-transparent',
        'shadow-[0_1px_0_0_hsl(0_0%_100%/0.06)_inset,0_24px_60px_-28px_hsl(0_0%_0%/0.9)]',
        'backdrop-blur-xl transition-all duration-500',
        'hover:border-white/[0.16] hover:shadow-[0_1px_0_0_hsl(0_0%_100%/0.10)_inset,0_30px_70px_-26px_hsl(0_0%_0%/0.95)]',
        className,
      )}
      aria-label="How Vendibook processes payments and identity checks"
    >
      {/* top hairline light */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60"
      />
      {/* ambient ember bloom */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl transition-opacity duration-700 group-hover:opacity-100 opacity-50"
      />
      {/* specular sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent opacity-0 transition-all duration-[1200ms] ease-out group-hover:left-[110%] group-hover:opacity-100"
      />

      <div className="relative flex flex-col divide-y divide-white/[0.06] sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
        <Rail
          logo={<PayPalMonogram className="h-[18px] w-auto" />}
          title="Online checkout"
          detail={paypalDetail}
          tone={paypalTone}
        />
        {showPlaid && (
          <Rail
            logo={<PlaidLogo surface="dark" className="h-[14px] w-auto" />}
            title="Identity checks"
            detail="Powered by Plaid*"
          />
        )}
        <div className="flex flex-1 items-center gap-3 px-6 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <ShieldCheck className="h-[18px] w-[18px] text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-tight text-foreground">Payment protection</p>
            <p className="truncate text-xs text-muted-foreground">
              Funds held until the deal is confirmed
            </p>
          </div>
        </div>
      </div>
    </motion.a>
  );
};

type RailTone = 'idle' | 'live' | 'warn';

const Rail = ({
  logo,
  title,
  detail,
  tone = 'idle',
}: {
  logo: React.ReactNode;
  title: string;
  detail: string;
  tone?: RailTone;
}) => (
  <div className="flex flex-1 items-center gap-3 px-6 py-4">
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors duration-500 group-hover:border-white/20">
      {logo}
      {tone !== 'idle' && (
        <span
          aria-hidden
          className={cn(
            'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-background',
            tone === 'live' ? 'bg-emerald-400' : 'bg-amber-400',
          )}
        />
      )}
    </span>
    <div className="min-w-0">
      <p className="text-[13px] font-medium tracking-tight text-foreground">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  </div>
);

export default TrustStrip;
