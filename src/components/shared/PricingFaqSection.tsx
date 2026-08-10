import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { getPricingFaq, type PricingAudience } from '@/data/pricingFaq';

interface PricingFaqSectionProps {
  audience: PricingAudience;
  title?: string;
  subtitle?: string;
  /** Emit FAQPage structured data (use on one page per URL only). */
  includeSchema?: boolean;
  className?: string;
}

const DEFAULT_SUBTITLE: Record<PricingAudience, string> = {
  seller: 'Free to list. You only pay when the sale actually closes.',
  host: 'Free to list. One flat commission when a booking is paid.',
  buyer: '$0 buyer fees, payment protection on every checkout.',
  renter: 'Every fee shown before you confirm — no surprises at checkout.',
  all: 'Straight answers on fees, payments, and financing.',
};

/**
 * Collapsible pricing + fees FAQ, scoped to the audience of the page it
 * sits on. Answers come from the single source of truth in
 * `src/data/pricingFaq.ts` so every surface quotes identical numbers.
 */
const PricingFaqSection = ({
  audience,
  title = 'What does it cost?',
  subtitle,
  includeSchema = false,
  className = '',
}: PricingFaqSectionProps) => {
  const entries = getPricingFaq(audience);
  if (entries.length === 0) return null;

  return (
    <section className={`py-16 md:py-20 ${className}`} aria-labelledby="pricing-faq-heading">
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: entries.map((e) => ({
                '@type': 'Question',
                name: e.question,
                acceptedAnswer: { '@type': 'Answer', text: e.answer },
              })),
            }),
          }}
        />
      )}
      <div className="container max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <BadgePercent className="h-3.5 w-3.5 text-primary" />
            Pricing &amp; fees
          </span>
          <h2
            id="pricing-faq-heading"
            className="mt-4 text-2xl md:text-3xl font-bold text-foreground"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            {subtitle ?? DEFAULT_SUBTITLE[audience]}
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {entries.map((entry) => (
            <AccordionItem key={entry.id} value={entry.id} className="border-border">
              <AccordionTrigger className="text-left text-foreground hover:no-underline">
                {entry.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                <p>{entry.answer}</p>
                {entry.cta && (
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0 text-primary"
                    asChild
                  >
                    <Link to={entry.cta.href}>
                      {entry.cta.label}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/pricing">See all pricing</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/faq">Full FAQ</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingFaqSection;
