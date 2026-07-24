import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Banknote,
  Truck,
  FileText,
  Rocket,
  Store,
  Handshake,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrustModule, PAYMENT_TRUST_POINTS } from '@/components/journey';

interface Category {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
  to: string;
  cta: string;
}

const CATEGORIES: Category[] = [
  {
    icon: TrendingUp,
    title: 'Sell faster',
    copy: 'Featured placement, Seller Pro, and White Glove listing support.',
    to: '/dashboard?panel=upgrades',
    cta: 'Upgrade a listing',
  },
  {
    icon: ShieldCheck,
    title: 'Buy with confidence',
    copy: 'Buyer Readiness Pass and Listing Purchase Reviews.',
    to: '/buyer/services',
    cta: 'Browse buyer tools',
  },
  {
    icon: Banknote,
    title: 'Fund your purchase',
    copy: 'Connect with financing partners that specialize in mobile food businesses.',
    to: '/partners?category=financing',
    cta: 'See financing partners',
  },
  {
    icon: Truck,
    title: 'Inspect and transport',
    copy: 'Third-party inspectors, wrap installers, and vehicle transport.',
    to: '/partners?category=inspection',
    cta: 'Request an inspection',
  },
  {
    icon: FileText,
    title: 'Find permits',
    copy: 'Permit Path checklist, plus concierge help for your city.',
    to: '/tools/permitpath',
    cta: 'Open Permit Path',
  },
  {
    icon: Rocket,
    title: 'Launch your business',
    copy: 'Startup guides, POS, insurance, and commissary partners.',
    to: '/tools/startup-guide',
    cta: 'Start your launch plan',
  },
  {
    icon: Store,
    title: 'Grow as a professional host',
    copy: 'Host Pro plans for kitchens, commissaries, and multi-listing operators.',
    to: '/host/plans',
    cta: 'Compare Host Pro plans',
  },
  {
    icon: Handshake,
    title: 'Protect your sale',
    copy: 'Identity verification, secure payment, and documented handoff.',
    to: '/how-it-works#protected-sale',
    cta: 'Learn about Protected Sale',
  },
];

const ServicesHub = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Services
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Everything you need to start and grow your food business
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find it. Fund it. Verify it. Purchase it. Permit it. Start earning. Listing on
            Vendibook is always free — these are optional tools that help you move faster and with
            more confidence.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, title, copy, to, cta }) => (
            <div
              key={title}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-6 transition hover:border-border hover:bg-card/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
              <div className="mt-6">
                <Button asChild variant="ghost" className="h-auto px-0 text-primary hover:text-primary/80">
                  <Link to={to}>
                    {cta}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <TrustModule variant="compact" points={PAYMENT_TRUST_POINTS} />
        </div>
      </section>
    </div>
  );
};

export default ServicesHub;
