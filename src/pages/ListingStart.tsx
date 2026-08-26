import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ConciergeBell,
  Clock,
  Lock,
  Rocket,
  Layers,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import FieldHelp from '@/components/common/FieldHelp';
import ListingPathChoice from '@/components/listing/ListingPathChoice';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { LISTING_ROUTES, authReturnTo } from '@/lib/listings/routes';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import {
  CONCIERGE_BENEFITS,
  LISTING_CONCIERGE,
} from '@/config/listingConcierge';

const BENEFITS = [
  { icon: Rocket, text: 'Free to publish' },
  { icon: Clock, text: 'Save and return anytime' },
  { icon: Layers, text: 'Add details later' },
  { icon: Lock, text: 'Private info stays private' },
];

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  price: string;
  badge?: string;
  blurb: string;
  benefits: string[];
  cta: string;
  onClick: () => void;
  emphasis?: boolean;
  children?: React.ReactNode;
}

const PathCard: React.FC<PathCardProps> = ({
  icon,
  title,
  price,
  badge,
  blurb,
  benefits,
  cta,
  onClick,
  emphasis,
  children,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className={`relative flex flex-col rounded-3xl border bg-card p-6 sm:p-8 ${
      emphasis
        ? 'border-primary/30 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_18px_40px_-28px_rgba(24,20,16,0.35)]'
        : 'border-border shadow-[0_1px_2px_rgba(24,20,16,0.04)]'
    }`}
  >
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
        {icon}
      </span>
      {badge && (
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {badge}
        </span>
      )}
    </div>

    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
    <p className="mt-1 text-base font-semibold text-foreground">{price}</p>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{blurb}</p>

    <ul className="mt-5 flex-1 space-y-2.5">
      {benefits.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm text-foreground/90">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>

    <Button
      size={emphasis ? 'cta' : 'lg'}
      variant={emphasis ? 'cta' : 'outline'}
      onClick={onClick}
      className={emphasis ? 'mt-7 w-full' : 'mt-7 h-12 w-full rounded-2xl text-base'}
    >
      {cta}
      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
    </Button>

    {children}
  </motion.div>
);

/**
 * `/list` — the front door for new listings. Creates no draft and charges
 * nothing; it only routes into the self-service wizard or the concierge.
 */
const ListingStart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const concierge = useCatalogPrice(LISTING_CONCIERGE.slug);

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'listing_gateway_viewed' });
  }, []);

  const startSelf = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_self_selected' });
    const manual = `${LISTING_ROUTES.quickStart}?path=self`;
    navigate(user ? manual : authReturnTo(manual));
  };

  const startConcierge = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_concierge_selected' });
    navigate(LISTING_ROUTES.conciergeIntro);
  };

  return (
    <div className="sale-light min-h-screen">
      <SEO
        title="Create a VendiBook listing — build it yourself or let us do it"
        description="Publish with the essentials and add more later, or have the VendiBook Listing Concierge build a buyer-ready listing for your approval."
        canonical={LISTING_ROUTES.gateway}
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            List on Vendibook
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Create a listing that helps the right people take the next step.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Publish the essentials first — photos, price, and the basics. You can add more
            specifications and details anytime after your listing is live.
          </p>
        </div>

        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs text-foreground sm:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="leading-tight">{text}</span>
              {text === 'Private info stays private' && (
                <FieldHelp label="private information" side="top" align="end" className="ml-auto">
                  Your exact address, contact details and documents stay private. Buyers see an
                  approximate map area until a booking or purchase is confirmed.
                </FieldHelp>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-8 sm:mt-10">
          <ListingPathChoice onChooseManual={startSelf} />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <PathCard
            icon={<ConciergeBell className="h-5 w-5" aria-hidden="true" />}
            title={LISTING_CONCIERGE.name}
            price={concierge.loading ? '—' : `${concierge.label} per listing`}
            badge="Done for you"
            blurb="Optional. Send us your equipment information and photos and we’ll build a buyer-ready listing for your approval."
            benefits={CONCIERGE_BENEFITS}
            cta="Use Listing Concierge"
            onClick={startConcierge}
          >
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {LISTING_CONCIERGE.noGuaranteeCopy}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <Link to={LISTING_CONCIERGE.termsPath} className="underline underline-offset-2">
                Concierge Service Terms
              </Link>
            </p>
          </PathCard>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Not sure yet? Start free — you can request the concierge service later from your
          dashboard.
        </p>
      </main>
    </div>
  );
};

export default ListingStart;
