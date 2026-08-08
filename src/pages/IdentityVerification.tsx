import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { GetVerifiedButton } from '@/components/verification/GetVerifiedButton';
import IdentityVerifiedBadge, { IDENTITY_VERIFIED_DISCLOSURE } from '@/components/verification/IdentityVerifiedBadge';
import { PayPalMonogram, PlaidLogo } from '@/components/brand/ProviderLogos';
import { goBackToOrigin } from '@/lib/originNav';
import { IdentityAddOnNote } from '@/components/verification/IdentityAddOnNote';

const PANEL =
  'rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.035] backdrop-blur-xl';

/**
 * Verified Seller upsell.
 *
 * The single destination for every "identity verification" entry point
 * (dashboard menu, mobile menu, account rows). Identity is checked by Plaid and
 * the one-time fee is authorized as a PayPal hold that is captured only after a
 * successful check. Verification is always optional — never a gate on
 * publishing, buying, renting, or selling.
 */
const IdentityVerification = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const v = useSellerVerification();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?redirect=/verify-identity');
  }, [authLoading, user, navigate]);

  const loading = authLoading || (!v.state && v.phase === 'loading');
  const offerEnabled = v.offer.enabled !== false;
  const verified = v.state?.badge_active === true;

  const steps = [
    {
      icon: ShieldCheck,
      title: 'Review and accept the terms',
      body: 'A short, plain-language disclosure of what the badge does and does not mean.',
    },
    {
      icon: PayPalMonogram,
      title: `PayPal places a ${v.offer.display_price} hold`,
      body: 'An authorization only. Nothing is charged unless your identity check succeeds.',
      brand: true,
    },
    {
      icon: Lock,
      title: 'Plaid runs the identity check',
      body: 'Plaid confirms your identity in a secure window. Vendibook never stores your ID documents.',
    },
    {
      icon: BadgeCheck,
      title: 'Your badge goes live',
      body: 'The hold is captured, a receipt is emailed, and the badge appears on your profile and every active listing.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Become a Verified Seller | Vendibook"
        description="Optional one-time identity verification by Plaid, paid securely through PayPal. Add an Identity Verified badge to your Vendibook profile and listings."
        canonical="/verify-identity"
      />
      <Header />

      <main className="flex-1">
        {/* ------------------------------------------------------- hero */}
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[720px] -translate-x-1/2 rounded-full blur-[150px]"
            style={{
              background: 'radial-gradient(ellipse, rgba(16,185,129,0.10) 0%, transparent 70%)',
            }}
          />
          <div className="container relative z-10">
            <div className="mx-auto max-w-3xl text-center">
                <IdentityVerifiedBadge
                  verified={true}
                  size="lg"
                  withDetails
                  className="mx-auto mb-5"
                />
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Show buyers it&rsquo;s really you.
              </h1>
              <p className="mb-7 text-base leading-relaxed text-muted-foreground sm:text-lg">
                A one-time identity check by Plaid adds a green Identity Verified badge to your
                profile and every active listing.
              </p>
              <div className="mb-7">
                <IdentityAddOnNote align="center" />
              </div>

              <div className="flex flex-col items-center gap-4">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                ) : offerEnabled ? (
                  <GetVerifiedButton size="md" showPrice badgeWhenVerified />
                ) : (
                  <span className="inline-flex items-center rounded-full border-2 border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Coming soon
                  </span>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    Identity by
                    <PlaidLogo surface="dark" className="h-4" />
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    Payment by
                    <PayPalMonogram className="h-4 w-4" />
                    PayPal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ how it works */}
        <section className="pb-14 sm:pb-20">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                How verification works
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className={`${PANEL} p-6 sm:p-7`}>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
                          {step.brand ? (
                            <Icon className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
                          )}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Step {index + 1}
                        </span>
                      </div>
                      <h2 className="mb-1.5 text-base font-semibold tracking-tight text-foreground">
                        {step.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  );
                })}
              </div>

              {/* ------------------------------------------- what you get */}
              <div className={`${PANEL} mt-4 p-6 sm:p-8`}>
                <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
                  What the badge does for you
                </h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    'Green Identity Verified badge on your public profile',
                    'Badge on every active listing, card, and map preview',
                    'Higher buyer confidence on high-value equipment',
                    'One-time fee — not a subscription, cancel nothing',
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-foreground/[0.08] pt-4 text-xs leading-relaxed text-muted-foreground">
                  {IDENTITY_VERIFIED_DISCLOSURE}
                </p>
              </div>

              {/* -------------------------------------------- footer CTA */}
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                {verified ? (
                  <Button asChild variant="outline" className="min-h-11">
                    <Link to="/dashboard?view=host">
                      Review your listings
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  !loading &&
                  offerEnabled && <GetVerifiedButton size="md" showPrice badgeWhenVerified />
                )}
                <button
                  type="button"
                  onClick={() => goBackToOrigin(navigate)}
                  className="py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Not now
                </button>
                <Link
                  to="/identity-verification"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Learn more about identity verification
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default IdentityVerification;
