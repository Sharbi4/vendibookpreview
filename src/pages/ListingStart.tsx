import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, PencilLine, ConciergeBell, ShieldCheck, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { productCheckoutPath } from '@/lib/payments/hostedCheckout';

const CONCIERGE_SLUG = 'listing_concierge';

interface ConciergeProduct {
  name: string;
  description: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  features: unknown;
  metadata: Record<string, unknown> | null;
}

const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

const PathCard: React.FC<{
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  price: string;
  blurb: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
  featured?: boolean;
  footnote?: string;
}> = ({ icon, eyebrow, title, price, blurb, bullets, cta, onClick, featured, footnote }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 backdrop-blur-xl ${
      featured
        ? 'border-primary/40 bg-card/80 shadow-xl'
        : 'border-border/60 bg-card/60'
    }`}
  >
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">{icon}</span>
      <Badge variant="secondary" className="text-xs">{eyebrow}</Badge>
    </div>
    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h2>
    <p className="mt-1 text-2xl font-bold text-foreground">{price}</p>
    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{blurb}</p>
    <ul className="mt-5 space-y-2.5 flex-1">
      {bullets.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm text-foreground/90">
          <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
    <Button
      size="lg"
      variant={featured ? 'default' : 'outline'}
      onClick={onClick}
      className="mt-7 w-full rounded-xl h-12 text-base"
    >
      {cta}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
    {footnote && <p className="mt-3 text-xs text-muted-foreground text-center">{footnote}</p>}
  </motion.div>
);

const ListingStart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<ConciergeProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'listing_gateway_viewed' });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('monetization_products')
        .select('name, description, price_cents, promo_price_cents, features, metadata')
        .eq('slug', CONCIERGE_SLUG)
        .eq('is_active', true)
        .maybeSingle();
      if (!active) return;
      setProduct((data as ConciergeProduct | null) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const conciergeCents = product
    ? product.promo_price_cents ?? product.price_cents
    : null;

  const conciergeFeatures: string[] = Array.isArray(product?.features)
    ? (product!.features as unknown[]).filter((f): f is string => typeof f === 'string')
    : [];

  const turnaround = Number(product?.metadata?.['turnaround_hours'] ?? 0);

  const startSelf = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_self_selected' });
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent('/list?start=true'));
      return;
    }
    navigate('/list?start=true');
  };

  const startConcierge = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_concierge_selected' });
    const target = productCheckoutPath(CONCIERGE_SLUG, null, {
      success: `${window.location.origin}/dashboard?concierge=started`,
      cancel: `${window.location.origin}/list/start`,
    });
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(target));
      return;
    }
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-20 sm:pt-28">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            How do you want your listing built?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Both paths end the same way: a live listing you own and can edit any time. Choose whether you
            build it yourself in a few minutes, or hand it to our team.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> No listing fees</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> Save and come back anytime</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4" /> Publishes instantly</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <PathCard
            icon={<PencilLine className="h-5 w-5" />}
            eyebrow="Most popular"
            title="Create it myself"
            price="Free"
            blurb="A short guided flow. Answer what you have, add photos, set a price, and publish. You can add deeper detail later without starting over."
            bullets={[
              'Six quick steps, about 5 minutes',
              'Saves automatically as a draft',
              'Publishes the moment you are ready',
              'Add equipment detail after you publish',
            ]}
            cta="Start my listing"
            onClick={startSelf}
            featured
            footnote="No card required."
          />

          <PathCard
            icon={<ConciergeBell className="h-5 w-5" />}
            eyebrow="Done for you"
            title={product?.name ?? 'Concierge Listing Service'}
            price={loading ? '—' : conciergeCents != null ? formatPrice(conciergeCents) : 'Unavailable'}
            blurb={
              product?.description ??
              'Our team writes and builds your full listing for you. You review and approve everything before it goes live.'
            }
            bullets={
              conciergeFeatures.length
                ? conciergeFeatures
                : [
                    'We write your title, description and highlights',
                    'We organize your photos',
                    'We structure your equipment details',
                    'You approve before anything publishes',
                  ]
            }
            cta="Get the concierge listing"
            onClick={startConcierge}
            footnote={
              turnaround > 0
                ? `Typically ready within ${Math.round(turnaround / 24)} business day${turnaround > 24 ? 's' : ''}. Nothing publishes until you approve it.`
                : 'Nothing publishes until you approve it.'
            }
          />
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not sure yet? Start free — you can add the concierge service later from your dashboard.
        </p>
      </main>
    </div>
  );
};

export default ListingStart;
