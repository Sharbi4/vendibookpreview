import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Layers,
  Lock,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import {
  LISTING_ROUTES,
  authReturnTo,
  quickStartWith,
} from '@/lib/listings/routes';
import heroPhoto from '@/assets/how-selling-hero.jpg';
import salePhoto from '@/assets/how-buying-hero.jpg';
import rentPhoto from '@/assets/how-renting-hero.jpg';
import './listing-start.css';

type ListingMode = 'sale' | 'rent';
type PathChoice = ListingMode | 'undecided';

const BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: Rocket, text: 'Free to publish' },
  { icon: Clock, text: 'Save and return anytime' },
  { icon: Layers, text: 'Add details later' },
  { icon: Lock, text: 'Private info stays private' },
];

const CHOICES: {
  mode: ListingMode;
  photo: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
  points: string[];
  cta: string;
}[] = [
  {
    mode: 'sale',
    photo: salePhoto,
    icon: Tag,
    title: 'Sell it',
    blurb: 'Set your asking price and hear from buyers shopping for mobile food equipment.',
    points: [
      'Buyers can message you or make an offer',
      'Payments go through Vendibook checkout',
      'Edit your price or details anytime',
    ],
    cta: 'Start a sale listing',
  },
  {
    mode: 'rent',
    photo: rentPhoto,
    icon: CalendarDays,
    title: 'Rent it out',
    blurb: 'Earn from your truck, trailer or kitchen on the days you are not using it.',
    points: [
      'Set your own rates and availability',
      'Renters request dates and message you',
      'Renters pay by card through Vendibook checkout',
    ],
    cta: 'Start a rental listing',
  },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Camera,
    title: 'Add photos and the basics',
    body: 'Pick a category, add your location and a few photos. It only takes a few minutes.',
  },
  {
    icon: Tag,
    title: 'Set your price',
    body: 'An asking price for a sale, or rental rates and the dates you are available.',
  },
  {
    icon: MessageSquare,
    title: 'Publish and get messages',
    body: 'Your listing goes live and interested buyers or renters reach you in Vendibook messages.',
  },
];

/** Query params that already tell us where the host is going: skip the choice page. */
function directTarget(search: string): string | null {
  const params = new URLSearchParams(search);
  const draft = params.get('listing') || params.get('draft');
  if (draft) return LISTING_ROUTES.resume(encodeURIComponent(draft));
  const edit = params.get('edit');
  if (edit) return LISTING_ROUTES.edit(encodeURIComponent(edit));
  const mode = (params.get('mode') || '').toLowerCase();
  if (mode === 'sale' || mode === 'rent' || params.has('category') || params.has('qs')) {
    return `${LISTING_ROUTES.quickStart}${search}`;
  }
  return null;
}

/**
 * `/list` — the front door for new listings. Creates no draft and charges
 * nothing; it only routes into the QuickStart wizard with the mode chosen.
 * Links that already carry a mode, category or draft skip straight past it.
 */
export default function ListingStart() {
  const { search } = useLocation();
  const target = directTarget(search);
  if (target) return <Navigate to={target} replace />;
  return <ListingGateway />;
}

function ListingGateway() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'listing_gateway_viewed' });
    window.scrollTo({ top: 0 });
  }, []);

  const go = (mode: PathChoice, surface: 'hero' | 'card' | 'undecided') => {
    trackEvent({
      category: 'Supply',
      action: 'listing_path_selected',
      label: mode,
      metadata: { mode, surface },
    });
    const target = mode === 'undecided' ? LISTING_ROUTES.quickStart : quickStartWith({ mode });
    navigate(user ? target : authReturnTo(target));
  };

  return (
    <div className="sale-light min-h-screen">
      <SEO
        title="List your food truck, trailer or kitchen | Vendibook"
        description="Sell or rent out your food truck, trailer or commercial kitchen on Vendibook. Free to publish, save and return anytime, and reach buyers and renters."
        canonical={LISTING_ROUTES.gateway}
      />
      <Header />

      <main className="pb-28">
        {/* Photo hero with the two big choices */}
        <section className="lst-hero relative isolate overflow-hidden">
          <img
            src={heroPhoto}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center]"
          />
          <div className="lst-hero-shade absolute inset-0 -z-10" aria-hidden="true" />

          <div className="mx-auto grid w-full max-w-6xl gap-9 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-16 lg:py-24">
            <div className="max-w-xl">
              <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                List on Vendibook
              </span>
              <h1 className="lst-heading mt-5 text-[2.25rem] font-bold leading-[1.05] text-white [text-wrap:balance] sm:text-5xl lg:text-[3.5rem]">
                List your food truck, trailer or kitchen
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 [text-wrap:pretty] sm:text-lg">
                It&rsquo;s free to publish, and your listing reaches buyers and renters looking for
                mobile food equipment.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:max-w-sm lg:max-w-none">
              <Button
                variant="cta"
                size="cta"
                className="lst-hero-btn w-full justify-between text-[17px]"
                onClick={() => go('sale', 'hero')}
              >
                Sell it
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                variant="cta-outline"
                size="cta"
                className="lst-hero-btn lst-hero-btn-light w-full justify-between rounded-2xl text-[17px] font-bold"
                onClick={() => go('rent', 'hero')}
              >
                Rent it out
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
              <p className="mt-1 text-sm text-white/70">
                Not sure yet?{' '}
                <button
                  type="button"
                  onClick={() => go('undecided', 'undecided')}
                  className="font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
                >
                  Start now and decide later
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* Benefit strip */}
        <section className="border-b border-border bg-white" aria-label="Listing benefits">
          <ul className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 sm:grid-cols-4 sm:px-6 sm:py-6">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2.5 text-[13px] font-semibold text-foreground sm:justify-center sm:text-sm"
              >
                <span className="lst-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="leading-tight">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          {/* Two ways to list */}
          <section className="mt-14 sm:mt-20" aria-labelledby="lst-choice-heading">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Two ways to list
              </p>
              <h2
                id="lst-choice-heading"
                className="lst-heading mt-2 text-2xl font-bold text-foreground sm:text-3xl"
              >
                Sell it, or earn from it
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6">
              {CHOICES.map(({ mode, photo, icon: Icon, title, blurb, points, cta }) => (
                <article
                  key={mode}
                  className="lst-card lst-choice flex flex-col overflow-hidden rounded-3xl"
                >
                  <div className="relative aspect-[16/8] overflow-hidden bg-muted">
                    <img
                      src={photo}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="lst-card-photo h-full w-full object-cover"
                    />
                    <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-md">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <h3 className="lst-heading text-2xl font-bold text-foreground">{title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{blurb}</p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/90">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="cta-outline"
                      className="mt-7 h-12 w-full border-foreground/20 text-base hover:border-foreground/40"
                      onClick={() => go(mode, 'card')}
                    >
                      {cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="mt-16 sm:mt-24" aria-labelledby="lst-how-heading">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                How it works
              </p>
              <h2
                id="lst-how-heading"
                className="lst-heading mt-2 text-2xl font-bold text-foreground sm:text-3xl"
              >
                Three steps to a live listing
              </h2>
            </div>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="lst-card rounded-3xl p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="lst-step-num flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                      {i + 1}
                    </span>
                    <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="lst-heading mt-5 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Trust */}
          <section className="lst-trust mt-14 flex flex-col gap-4 rounded-3xl p-6 sm:mt-20 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
            <span className="lst-trust-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="lst-heading text-lg font-semibold text-white">
                Safer selling and renting
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                Buyers and renters contact you through Vendibook messages, and payments go through
                Vendibook checkout. Your exact address and contact details are never shown on your
                listing.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
