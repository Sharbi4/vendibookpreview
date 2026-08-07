import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import SEO, { generateFAQSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import equinoxLogo from '@/assets/brand/equinox-funding-logo.png.asset.json';

const LIME = '#8CC63F';
const APPLY_URL = 'https://equinox-funding.com/efapplication/';

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
  'rounded-2xl border-2 border-white/[0.14] bg-white/[0.045] backdrop-blur-md p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/20';

const ApplyCta = ({ className = '', wide = false }: { className?: string; wide?: boolean }) => (
  <a
    href={APPLY_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${wide ? 'w-full sm:w-auto' : ''} ${className}`}
    style={{ background: LIME, boxShadow: `0 10px 38px ${LIME}40` }}
  >
    Apply for Equipment Financing
    <ExternalLink className="h-4 w-4" aria-hidden />
  </a>
);

const Financing = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const title = 'Equipment Financing for Food Trucks & Trailers | Vendibook';
  const description =
    'Explore equipment financing with Equinox Funding for food trucks, trailers, and commercial kitchen equipment. Apply online — subject to prequalification and underwriting.';
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

      <main className="relative min-h-screen overflow-hidden bg-[#050506] text-white">
      {/* polished onyx shine — layered black glass luminescence */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(85% 55% at 50% -8%, rgba(140,198,63,0.12) 0%, transparent 60%), radial-gradient(70% 45% at 100% 15%, rgba(255,255,255,0.07) 0%, transparent 60%), radial-gradient(70% 45% at 0% 15%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(120% 60% at 50% 110%, rgba(0,0,0,0.9) 0%, transparent 70%)',
        }}
      />

      {/* top horizon sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
      />

      <div className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        {/* Hero */}
        <section className="rounded-3xl border-2 border-white/[0.12] bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:p-10">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: LIME }}
          >
            Vendibook × Equinox Funding
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Get the equipment you need — fast
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
            Whether you’re launching your first business or expanding an established operation,
            explore equipment financing with flexible structures designed around your business and
            equipment.
          </p>

          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <ApplyCta />
            <Link
              to="/browse"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09] hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Browse Equipment
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">
            You’ll continue to Equinox Funding to submit your application securely.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border-2 border-white/[0.12] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:flex-row sm:items-center">
            <img
              src={equinoxLogo.url}
              alt="Equinox Funding"
              className="h-9 w-auto"
              loading="lazy"
            />
            <span className="text-xs text-white/45">Financing partner</span>
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
            <ApplyCta />
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
