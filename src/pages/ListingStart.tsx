import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ConciergeBell,
  Clock,
  Lock,
  PencilLine,
  Rocket,
  Layers,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FieldHelp from '@/components/common/FieldHelp';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { LISTING_ROUTES, authReturnTo } from '@/lib/listings/routes';
import {
  CONCIERGE_BENEFITS,
  LISTING_CONCIERGE,
  SELF_SERVE_BENEFITS,
} from '@/config/listingConcierge';

const REASSURANCE = [
  { icon: Rocket, text: 'Publish with the essentials' },
  { icon: Clock, text: 'Save and return anytime' },
  { icon: Layers, text: 'Add more details after publishing' },
  { icon: Lock, text: 'Keep sensitive information private' },
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
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-xl sm:p-8 ${
      emphasis ? 'border-primary/40 bg-card/80 shadow-xl' : 'border-border bg-card/60'
    }`}
  >
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </span>
      {badge && (
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
      )}
    </div>

    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
    <p className="mt-1 text-lg font-bold text-foreground">{price}</p>
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
      size="lg"
      variant={emphasis ? 'default' : 'outline'}
      onClick={onClick}
      className="mt-7 h-12 w-full rounded-xl text-base"
    >
      {cta}
      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
    </Button>

    {children}
  </motion.div>
);

/**
 * Opening choice page for the canonical listing flow. Creates no draft and
 * charges nothing — it only routes into the self-service wizard or the
 * concierge introduction.
 */
const ListingStart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'listing_gateway_viewed' });
  }, []);

  const startSelf = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_self_selected' });
    navigate(user ? LISTING_ROUTES.quickStart : authReturnTo(LISTING_ROUTES.quickStart));
  };

  const startConcierge = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_concierge_selected' });
    navigate(LISTING_ROUTES.conciergeIntro);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Create a VendiBook listing — build it yourself or let us do it"
        description="Publish with the essentials and add more later, or have the VendiBook Listing Concierge build a buyer-ready listing for your approval."
        canonical={LISTING_ROUTES.gateway}
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:pt-28">
        <Button
          variant="ghost"
          onClick={() => navigate(LISTING_ROUTES.hub)}
          className="mb-6 pl-0 transition-all hover:pl-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Create a listing that helps serious buyers take the next step
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Help buyers find what they’re looking for by providing clear photos, accurate equipment
            details, pricing, condition information, and what is included. You can publish with the
            essential information first and add more specifications anytime.
          </p>
        </div>

        <ul className="mx-auto mb-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-14">
          {REASSURANCE.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-foreground"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{text}</span>
              {text === 'Keep sensitive information private' && (
                <FieldHelp label="private information" side="top" align="end" className="ml-auto">
                  Your exact address, contact details and documents stay private. Buyers see an
                  approximate map area until a booking or purchase is confirmed.
                </FieldHelp>
              )}
            </li>
          ))}
        </ul>

        <div className="grid gap-6 md:grid-cols-2">
          <PathCard
            icon={<PencilLine className="h-5 w-5" aria-hidden="true" />}
            title="Create it myself"
            price="Free"
            blurb="Our guided listing builder walks you through the details buyers care about most."
            benefits={SELF_SERVE_BENEFITS}
            cta="Create my free listing"
            onClick={startSelf}
            emphasis
          >
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No card required. Publishing is always free.
            </p>
          </PathCard>

          <PathCard
            icon={<ConciergeBell className="h-5 w-5" aria-hidden="true" />}
            title={LISTING_CONCIERGE.name}
            price={LISTING_CONCIERGE.priceLabel}
            badge="Done for you"
            blurb="Send us your equipment information and photos. We’ll transform everything into a polished, buyer-ready listing for your approval."
            benefits={CONCIERGE_BENEFITS}
            cta="Have VendiBook create my listing"
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

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not sure yet? Start free — you can request the concierge service later from your
          dashboard.
        </p>
      </main>
    </div>
  );
};

export default ListingStart;
