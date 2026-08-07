import { Link } from 'react-router-dom';
import { ShieldCheck, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { PlaidLogo } from '@/components/brand/ProviderLogos';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Public information page for optional seller identity verification with Plaid.
 * Reads the existing `verified_seller_enabled` flag (fails closed): while it is
 * false, the page shows "Coming soon" and no start-verification CTA.
 */
const IdentityVerificationInfo = () => {
  const enabled = usePublicFeatureFlag('verified_seller_enabled');
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Identity Verification for Sellers | Vendibook"
        description="Optional seller identity verification with Plaid. Learn what the Identity Verified badge means on Vendibook — and what it does not verify."
        canonical="/identity-verification"
      />
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[720px] -translate-x-1/2 rounded-full blur-[150px]"
            style={{
              background: 'radial-gradient(ellipse, rgba(255,81,36,0.05) 0%, transparent 70%)',
            }}
          />
          <div className="container relative z-10">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-5 inline-flex items-center rounded-full border-2 border-foreground/[0.10] bg-foreground/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                Identity Verification
              </span>
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Optional identity verification.
              </h1>
              <p className="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                An Identity Verified badge means Plaid helped confirm that seller’s identity. It does
                not verify ownership, title, condition, value, or listing accuracy.
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Verification by
                </span>
                <PlaidLogo surface="dark" className="h-4" />
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="container">
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              <div className="rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.035] p-6 backdrop-blur-xl sm:p-7">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
                  <ShieldCheck className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
                </span>
                <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                  What the badge means
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Plaid helped confirm the seller’s identity. Verification is optional, so not every
                  seller is identity verified.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.035] p-6 backdrop-blur-xl sm:p-7">
                <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
                  <Info className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
                </span>
                <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                  What it does not mean
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  It does not verify equipment ownership, title, condition, value, or the accuracy of
                  a listing. Always inspect and do your own due diligence.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-4xl rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.03] p-6 text-center backdrop-blur-xl sm:p-8">
              {enabled ? (
                <>
                  <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                    Verify your seller identity
                  </h2>
                  <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Sellers can complete optional identity verification from their account.
                  </p>
                  <Button variant="dark-shine" size="lg" asChild>
                    <Link to={user ? '/verify-identity' : '/auth?redirect=/verify-identity'}>
                      {user ? 'Start verification' : 'Sign in to continue'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <span className="mb-3 inline-flex items-center rounded-full border-2 border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Coming soon
                  </span>
                  <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                    Seller identity verification is coming soon
                  </h2>
                  <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                    This optional feature is not yet available. There is nothing to purchase or start
                    today.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default IdentityVerificationInfo;
