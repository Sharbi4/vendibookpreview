/**
 * /legal — Vendibook Legal Center
 *
 * Plain-language hub grouping every currently-published legal document by
 * audience. Documents not yet published are omitted (never shown as
 * "coming soon" links to broken URLs).
 *
 * Ownership: Phase 1 of the 2026-07 legal modernization. Cards are grouped
 * by audience so a visitor can find the doc that applies to them without
 * scanning a long list. Adding a new legal page = add one entry here.
 */
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Shield, ShoppingBag, Truck, CreditCard, MessageSquare, Sparkles, FileText } from 'lucide-react';

type LegalLink = {
  href: string;
  title: string;
  summary: string;
};

type LegalGroup = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: LegalLink[];
};

// Only documents that resolve to a live page today. New v2 documents are
// added here as they publish so the hub is never a promise-list.
const GROUPS: LegalGroup[] = [
  {
    id: 'everyone',
    title: 'For everyone',
    description: 'The core rules that apply to every visitor and account.',
    icon: Scale,
    links: [
      { href: '/terms', title: 'Terms of Service', summary: 'The agreement between you and Vendibook.' },
      { href: '/privacy', title: 'Privacy Policy', summary: 'What data we collect, why, and your choices.' },
      { href: '/california-privacy', title: 'California Privacy Notice', summary: 'Rights under CCPA/CPRA and related state laws.' },
      { href: '/legal/marketplace-rules', title: 'Marketplace Rules', summary: 'What you can and can\u2019t list, post, or do on Vendibook.' },
    ],
  },
  {
    id: 'sellers',
    title: 'For sellers & hosts',
    description: 'Listing, host, and payout terms.',
    icon: ShoppingBag,
    links: [
      { href: '/legal/seller-terms', title: 'Seller & Host Terms', summary: 'Listing accuracy, payouts, cancellations, and conduct.' },
      { href: '/legal/featured-listing-terms', title: 'Featured Listing Terms', summary: 'Placement, duration, and refund rules for boosts.' },
    ],
  },
  {
    id: 'buyers',
    title: 'For buyers & renters',
    description: 'Terms that apply when you purchase or rent.',
    icon: Truck,
    links: [
      { href: '/legal/renter-terms', title: 'Buyer & Renter Terms', summary: 'Inspection, pickup, damage, and marketplace transaction risks.' },
      { href: '/legal/pay-in-person-terms', title: 'Pay-in-Person Acknowledgment', summary: 'What Vendibook does \u2014 and doesn\u2019t \u2014 protect when you pay in cash.' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & billing',
    description: 'How money moves on Vendibook.',
    icon: CreditCard,
    links: [
      { href: '/legal/subscription-terms', title: 'Subscription & Paid Add-On Terms', summary: 'Recurring billing, renewal, cancellation, and refunds.' },
      { href: '/legal/refund-cancellation-policy', title: 'Refund & Cancellation Policy', summary: 'When platform fees and payments are refundable.' },
    ],
  },
  {
    id: 'communications',
    title: 'Communications',
    description: 'SMS, email, and call-recording notices.',
    icon: MessageSquare,
    links: [
      { href: '/legal/sms', title: 'SMS Terms', summary: 'Consent, keywords, frequency, and how to stop messages.' },
      { href: '/sms-opt-in', title: 'Text-message preferences', summary: 'Add or remove your number from Vendibook SMS.' },
    ],
  },
  {
    id: 'trust',
    title: 'Trust & safety',
    description: 'Independent trust and security information.',
    icon: Shield,
    links: [
      { href: '/insurance', title: 'Insurance information', summary: 'What Vendibook does and does not underwrite.' },
    ],
  },
];

export default function LegalCenter() {
  return (
    <>
      <SEO
        title="Legal Center | Vendibook"
        description="Vendibook\u2019s terms, privacy, marketplace, payment, and communications policies in one place."
        canonical="https://vendibook.com/legal"
      />
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">Legal Center</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Every Vendibook policy, in one place</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Plain-language pointers to the documents that govern how you use Vendibook. Each policy links to
            its full, versioned text. Historic versions are preserved for anyone who accepted them.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.id} className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <CardTitle>{group.title}</CardTitle>
                  </div>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          to={link.href}
                          className="group block rounded-md border border-transparent p-2 -m-2 hover:border-border/60 hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                            <span className="group-hover:text-primary">{link.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{link.summary}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mt-12 rounded-xl border border-border/60 bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold">Questions about a policy?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact Vendibook Support at{' '}
                <a href="mailto:support@vendibook.com" className="text-primary underline">
                  support@vendibook.com
                </a>{' '}
                or visit the <Link to="/help" className="text-primary underline">Help Center</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
