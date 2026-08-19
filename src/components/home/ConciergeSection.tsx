import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PayPalWordmark, PlaidLogo } from '@/components/brand/ProviderLogos';
import equinoxLogo from '@/assets/brand/equinox-funding-logo.png.asset.json';
import { IdentityAddOnNote } from '@/components/verification/IdentityAddOnNote';

/**
 * Single consolidated trust section for the homepage.
 * PayPal, Plaid and Equinox are each explained exactly once here — provider
 * detail lives on their dedicated pages.
 */

const PROVIDERS = [
  {
    id: 'paypal',
    to: '/payments',
    title: 'Secure online checkout.',
    body: 'Payments completed through Vendibook checkout are processed by PayPal. Eligible purchases may include PayPal Purchase Protection; terms and limitations apply.',
    logo: <PayPalWordmark className="h-5" />,
    name: 'PayPal',
  },
  {
    id: 'plaid',
    to: '/identity-verification',
    title: 'Identity verification.*',
    body: 'An Identity Verified badge means Plaid helped confirm that seller’s identity. It does not verify ownership, title, condition, value, or listing accuracy.',
    logo: <PlaidLogo surface="dark" className="h-4" />,
    name: 'Plaid',
  },
  {
    id: 'equinox',
    to: '/financing',
    title: 'Equipment financing.',
    body: 'Explore financing for eligible food trucks, trailers, and related equipment. Separate application, underwriting, and provider terms apply. Vendibook is not a lender.',
    logo: (
      <img
        src={equinoxLogo.url}
        alt="Equinox Funding"
        loading="lazy"
        className="h-6 w-auto object-contain"
      />
    ),
    name: 'Equinox Funding',
  },
];

const FAQS = [
  {
    q: 'How are online payments handled?',
    a: 'Vendibook checkout payments are processed through PayPal. Vendibook does not store full card details. Purchase Protection eligibility is determined by PayPal.',
  },
  {
    q: 'What does Identity Verified mean?',
    a: 'Plaid helped confirm the seller’s identity. It does not verify the listing or equipment.',
  },
  {
    q: 'How does equipment financing work?',
    a: 'Buyers apply separately through Equinox Funding. Decisions, terms, and funding depend on underwriting and may involve third-party providers.',
  },
];

const ConciergeSection = () => {
  return (
    <section id="trusted-infrastructure" className="relative overflow-hidden py-16 scroll-mt-24 sm:py-24">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,81,36,0.05) 0%, rgba(255,186,8,0.02) 45%, transparent 72%)',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <span className="mb-5 inline-flex items-center rounded-full border border-foreground/[0.10] bg-foreground/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
              Trusted Infrastructure
            </span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Confidence at every step.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Secure online checkout, seller identity verification*, and equipment
              financing—supported by providers built for serious transactions.
            </p>
            <IdentityAddOnNote align="center" showLogo className="mt-4" />
          </div>

          {/* Provider cards */}
          <div className="mb-10 grid grid-cols-1 gap-4 sm:mb-14 md:grid-cols-3 md:gap-5">
            {PROVIDERS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: 0.05 + i * 0.07 }}
              >
                <Link
                  to={p.to}
                  aria-label={`${p.name} — ${p.title}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-foreground/[0.10] bg-foreground/[0.035] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-7"
                >
                  {/* sheen sweep */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.05] to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
                  />
                  <span className="relative mb-6 flex h-9 items-center">{p.logo}</span>
                  <h3 className="relative mb-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {p.title}
                  </h3>
                  <p className="relative text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  <span className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-colors group-hover:text-primary">
                    Learn more
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto max-w-3xl rounded-2xl border border-foreground/[0.10] bg-foreground/[0.03] p-5 backdrop-blur-xl sm:p-8">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i}`} className="border-foreground/10">
                  <AccordionTrigger className="text-left text-sm text-foreground hover:no-underline sm:text-base">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ConciergeSection;
