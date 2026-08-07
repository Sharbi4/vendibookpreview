import { Link } from 'react-router-dom';
import { Lock, ShieldCheck, ExternalLink, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { PayPalWordmark, PayPalMonogram, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import paypalAppImage from '@/assets/brand/paypal-app-2025.webp.asset.json';

const POINTS = [
  {
    icon: Lock,
    title: 'Processed by PayPal',
    body: 'Payments completed through Vendibook checkout are processed by PayPal. Vendibook does not store full card details.',
  },
  {
    icon: ShieldCheck,
    title: 'Purchase Protection eligibility',
    body: 'Eligible purchases may include PayPal Purchase Protection. Eligibility, terms, and limitations are determined by PayPal.',
  },
  {
    icon: Lock,
    title: 'Familiar checkout',
    body: 'Buyers complete payment in PayPal’s hosted checkout, then return to Vendibook to track the order.',
  },

];

const Payments = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Online Payments with PayPal | Vendibook"
        description="Vendibook checkout payments are processed by PayPal. Learn how online payments work, what Purchase Protection eligibility means, and what Vendibook does not cover."
        canonical="/payments"
      />
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-[150px]"
            style={{
              background:
                'radial-gradient(ellipse, rgba(255,81,36,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="container relative z-10">
            <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-2">
              <div>
                <span className="mb-5 inline-flex items-center rounded-full border-2 border-foreground/[0.10] bg-foreground/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                  Online Payments
                </span>
                <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Secure online checkout with PayPal.
                </h1>
                <p className="mb-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Payments completed through Vendibook checkout are processed by PayPal. Eligible
                  purchases may include PayPal Purchase Protection; terms and limitations apply.
                </p>
                <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Processed by
                    </span>
                    <PayPalMonogram className="h-6" />
                    <PayPalWordmark className="h-5" />
                  </div>
                  <span aria-hidden className="hidden h-6 w-px bg-foreground/15 sm:block" />
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Financing by
                    </span>
                    <EquinoxFundingLogo className="h-7" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" variant="dark-shine" asChild>
                    <Link to="/search">
                      <Search className="mr-2 h-4 w-4" />
                      Browse listings
                    </Link>
                  </Button>
                  <Button size="lg" variant="glass-cta" asChild>
                    <Link to="/financing">
                      Financing options
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl border-2 border-border/50">
                <img
                  src={paypalAppImage.url}
                  alt="Someone reviewing a payment in the PayPal app on their phone"
                  loading="lazy"
                  className="h-full max-h-[440px] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="container">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
              {POINTS.map((p, i) => (
                <div
                  key={p.title}
                  className="rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.035] p-6 backdrop-blur-xl"
                >
                  <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
                    {i === 2 ? (
                      <PayPalMonogram className="h-4" />
                    ) : (
                      <p.icon className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
                    )}
                  </span>
                  <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                    {p.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-6 max-w-5xl rounded-2xl border-2 border-foreground/[0.10] bg-foreground/[0.03] p-6 backdrop-blur-xl sm:p-8">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
                What this does and does not cover
              </h2>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Applies only to payments completed through Vendibook checkout. Pay-in-person and
                  other off-platform payments are not processed by Vendibook.
                </li>
                <li>
                  Vendibook does not hold, escrow, or guarantee funds, and does not decide Purchase
                  Protection outcomes.
                </li>
                <li>
                  Purchase Protection eligibility, claim windows, and limitations are determined by
                  PayPal under PayPal’s terms.
                </li>
              </ul>
              <a
                href="https://www.paypal.com/us/digital-wallet/security-and-protection"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80 underline underline-offset-4 transition-colors hover:text-primary"
              >
                PayPal security &amp; Purchase Protection terms
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

            {/* Trust & partner infrastructure */}
            <div className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border-2 border-foreground/[0.10] bg-[linear-gradient(140deg,#0a0a0c_0%,#08080a_50%,#101014_100%)] p-6 backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-5">
                  {/* Partner lockup */}
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-2.5">
                      <PayPalMonogram className="h-7" />
                      <PayPalWordmark className="h-5" />
                    </div>
                    <span
                      aria-hidden="true"
                      className="hidden h-7 w-px bg-foreground/15 sm:block"
                    />
                    <div className="flex items-center gap-2">
                      <EquinoxFundingLogo className="h-8" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Funding partner
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Two trusted providers, one seamless checkout
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">PayPal</span> processes every
                      Vendibook checkout. For eligible business equipment purchases,{' '}
                      <span className="font-medium text-foreground">Equinox Funding LLC</span>{' '}
                      offers business loans and equipment financing from $2.5K to $25M with online
                      applications. Approval, rates, and terms are determined by Equinox Funding
                      LLC.
                    </p>
                  </div>

                  <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>PayPal Purchase Protection eligibility on eligible purchases</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>Equinox Funding LLC — NMLS licensed lending partner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                      <span>Vendibook does not store full card or bank details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                      <span>Financing applications are handled directly by Equinox</span>
                    </li>
                  </ul>

                  <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                    Equinox Funding LLC is a licensed lender. Loan approval, rates, and terms are
                    subject to credit review and underwriting. PayPal is a separate payment
                    processor and Vendibook is not a bank or lender.
                  </p>
                </div>

                <Button size="lg" variant="glass-cta" asChild className="shrink-0">
                  <Link to="/financing">
                    Explore financing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Payments;
