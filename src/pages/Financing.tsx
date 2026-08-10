import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck, Truck, Caravan, ShoppingCart } from 'lucide-react';
import SEO, { generateFAQSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import {
  trackFinancingApplyClick,
  trackFinancingPageViewed,
  type FinancingSource,
} from '@/lib/analytics';

const LIME = '#34d399';
const APPLY_URL = 'https://equinox-funding.com/efapplication/';

const OPTIONS = [
  {
    icon: Truck,
    title: 'Food trucks',
    body: 'Finance a turnkey or fully built food truck listed on Vendibook, including the kitchen build already installed.',
  },
  {
    icon: Caravan,
    title: 'Food trailers',
    body: 'Concession and kitchen trailers listed for sale on Vendibook, from compact units to full production trailers.',
  },
  {
    icon: ShoppingCart,
    title: 'Food carts',
    body: 'Carts and small mobile units listed for sale on Vendibook — a lower-cost way to start serving.',
  },
];

const PROCESS = [
  {
    title: 'Apply online',
    body: 'Basic business, owner, and equipment information.',
  },
  {
    title: 'Review & match',
    body: 'Equinox reviews the application and available financing structures; a financing specialist may contact the applicant for additional information.',
  },
  {
    title: 'Review & sign',
    body: 'Qualified applicants review available terms and sign electronically. Many decisions are returned within 24–48 hours.',
  },
  {
    title: 'Seller funded',
    body: 'After approval and required documentation, the lender or financing provider pays the equipment seller directly; the buyer then makes payments under the signed agreement.',
  },
];

const QUALIFY = [
  {
    title: 'Startups & new businesses',
    body: 'First-time operators may qualify based on credit, experience, equity/down payment, equipment, and overall profile.',
  },
  {
    title: 'Growing businesses',
    body: 'Options may be available for businesses operating 6 months to 2 years, including low- or zero-down programs for qualified applicants.',
  },
  {
    title: 'Established businesses',
    body: 'Options may include zero-down, multi-unit, and fleet financing for qualified businesses.',
  },
];

const SNAPSHOT = [
  'Financing from $2,500 – $25M',
  'Lease-to-own options',
  '640 startup and 575 established-business general FICO benchmarks',
  'Low- or zero-down programs may be available',
];

const FAQ = [
  {
    q: 'Can a fully custom food trailer build be financed?',
    a: 'Fully custom builds and conversions may be financed.',
  },
  {
    q: 'How fast are decisions?',
    a: 'Many decisions are returned within 24–48 hours.',
  },
  {
    q: 'How much does credit matter?',
    a: 'Credit is one of several underwriting factors.',
  },
  {
    q: 'Can a first-time operator qualify?',
    a: 'First-time operators may qualify depending on the full profile and build.',
  },
  {
    q: 'What happens after I submit?',
    a: 'After submission, an Equinox financing specialist may contact the applicant for additional information.',
  },
];

const panel =
  'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition-colors hover:border-emerald-300/25';

const ApplyCta = ({
  className = '',
  wide = false,
  source,
}: {
  className?: string;
  wide?: boolean;
  source: FinancingSource;
}) => (
  <a
    href={APPLY_URL}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => trackFinancingApplyClick(source)}
    className={`group/cta relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-6 py-3.5 text-sm font-semibold text-emerald-950 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.9)] ring-1 ring-inset ring-white/25 transition-shadow duration-300 hover:shadow-[0_14px_36px_-10px_rgba(16,185,129,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${wide ? 'w-full sm:w-auto' : ''} ${className}`}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover/cta:left-[110%] group-hover/cta:opacity-100"
    />
    <span className="relative inline-flex items-center gap-2">
      Apply now for financing
      <ExternalLink className="h-4 w-4" aria-hidden />
    </span>
  </a>
);

const Financing = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackFinancingPageViewed();
  }, []);

  const title = 'Financing for Food Trucks, Trailers & Carts | Vendibook';
  const description =
    'Financing with Equinox Funding for food trucks, food trailers, and food carts listed on Vendibook. Apply online — subject to prequalification and underwriting.';
  const canonical = '/financing';

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        type="website"
      />
      <JsonLd
        schema={[
          generateFAQSchema(
            FAQ.map((item) => ({ question: item.q, answer: item.a })),
          ),
        ]}
      />

      <Header />

      <main className="relative min-h-screen overflow-hidden bg-[hsl(160_30%_4%)] text-white">
      {/* emerald aurora wash — matches the homepage financing banner */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 0% 0%, rgba(16,185,129,0.30) 0%, rgba(6,78,59,0.20) 38%, rgba(0,0,0,0) 70%), radial-gradient(90% 70% at 100% 8%, rgba(52,211,153,0.16) 0%, rgba(0,0,0,0) 65%), radial-gradient(120% 60% at 50% 110%, rgba(0,0,0,0.9) 0%, transparent 70%)',
        }}
      />

      {/* top horizon sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
      />

      <div className="relative mx-auto max-w-5xl px-5 pt-6 sm:px-8 sm:pt-8">

        {/* Hero — thin horizontal banner */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md sm:p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(120% 160% at 0% 0%, rgba(16,185,129,0.28) 0%, rgba(6,78,59,0.18) 38%, rgba(0,0,0,0) 70%), radial-gradient(90% 140% at 100% 100%, rgba(52,211,153,0.14) 0%, rgba(0,0,0,0) 65%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-sm">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Financing
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 backdrop-blur-sm">
                  <span className="text-[11px] font-medium tracking-tight text-white/70">Vendibook</span>
                  <span className="text-white/25">×</span>
                  <EquinoxFundingLogo className="h-4 w-auto" />
                </span>
              </div>
              <h1 className="mt-2 text-balance text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">
                Vendibook &amp; Equinox Funding make it easy to get started.
              </h1>
              <p className="mt-1 max-w-xl text-sm text-white/60">
                Financing options for food trucks, food trailers, and food carts listed on
                Vendibook — check your options without slowing down your purchase.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <ApplyCta source="financing_page_hero" />
              <p className="text-xs text-white/50">You’ll continue to Equinox Funding securely.</p>
            </div>
          </div>
        </section>

        {/* Options */}
        <section className="mt-16" aria-labelledby="options-heading">
          <h2 id="options-heading" className="text-2xl font-semibold tracking-tight">
            What you can finance
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Financing applies to food trucks, food trailers, and food carts listed for sale on
            Vendibook. Terms vary by applicant and are subject to underwriting.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {OPTIONS.map(({ icon: Icon, title: t, body }) => (
              <div key={t} className={panel}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-start gap-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
              <FinancingAvailableBadge asLink={false} />
              <p className="text-sm text-white/60">
                Look for this badge on a listing — it means the seller has enabled financing for
                that truck, trailer, or cart.
              </p>
            </div>
            <ApplyCta wide source="financing_page_mid" />
          </div>
        </section>

        {/* Process */}
        <section className="mt-16" aria-labelledby="process-heading">
          <h2 id="process-heading" className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {PROCESS.map((step, i) => (
              <li key={step.title} className={panel}>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold"
                  style={{ borderColor: `${LIME}66`, color: LIME }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Qualification */}
        <section className="mt-16" aria-labelledby="qualify-heading">
          <h2 id="qualify-heading" className="text-2xl font-semibold tracking-tight">
            Who may qualify
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {QUALIFY.map((q) => (
              <div key={q.title} className={panel}>
                <h3 className="text-base font-semibold">{q.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{q.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Snapshot */}
        <section className="mt-16" aria-labelledby="snapshot-heading">
          <h2 id="snapshot-heading" className="text-2xl font-semibold tracking-tight">
            Program snapshot
          </h2>
          <div className={`mt-6 ${panel}`}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SNAPSHOT.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: LIME }}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/45">
              Partner-provided information. Each point is subject to program availability and
              underwriting. These are not guarantees or universal minimums, and not all applicants
              qualify.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
            Custom food trailers — FAQ
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className={panel}>
                <dt className="text-sm font-semibold">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/65">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* CTA repeat */}
        <section className="mt-16 rounded-3xl border-2 border-white/[0.12] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
          <h2 className="text-xl font-semibold tracking-tight">Ready to apply?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
            You’ll continue to Equinox Funding to submit your application securely.
          </p>
          <div className="mt-6 flex justify-center">
            <ApplyCta source="financing_page_footer" />
          </div>
        </section>

        {/* Compliance */}
        <section className="mt-16 space-y-4 rounded-3xl border-2 border-white/[0.10] bg-white/[0.02] p-6 sm:p-8" aria-label="Disclosures">
          <p className="text-xs leading-relaxed text-white/50">
            Vendibook is not a lender, does not make credit decisions, and does not guarantee
            approval, rates, terms, or funding. Financing is for business purposes and is subject to
            application, prequalification and/or underwriting. When you apply, you leave Vendibook
            and submit information directly to Equinox Funding. Equinox Funding’s terms and privacy
            policy apply. Credit review may include personal and business credit inquiries as
            authorized in the application. Any potential Section 179 benefit depends on eligibility;
            consult a qualified tax professional.
          </p>
          <p className="text-xs leading-relaxed text-white/50">
            Equinox Funding provides business capital, including business loans and Revenue Based
            Financing, directly and through a network of unaffiliated third-party funding providers.
            All offers will depend on your business meeting at the time of submission our
            prequalification and/or underwriting criteria, which includes, but is not limited to,
            business &amp; personal credit history, time in business, cash flow, revenue
            consistency, industry-specific underwriting rules. Business loans are offered by Equinox
            Funding LLC.
          </p>
          <p className="text-xs text-white/50">
            <a
              href="https://equinox-funding.com/terms-of-service/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-white"
            >
              Equinox Funding terms
            </a>
            <span className="px-2 text-white/25">·</span>
            <a
              href="https://equinox-funding.com/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-white"
            >
              privacy policy
            </a>
          </p>
        </section>
      </div>
    </main>
  </>
  );
};

export default Financing;
