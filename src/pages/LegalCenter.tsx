/**
 * /legal — Vendibook Legal Center
 *
 * Rendered entirely from the LEGAL_DOCUMENTS registry so a document's title,
 * summary, version, and effective date can never drift from what is written to
 * a consent record. Additional published policies that pre-date the registry
 * are listed underneath as further policies.
 */
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, Shield, CreditCard, Video, FileText, LifeBuoy } from 'lucide-react';
import {
  LEGAL_DOCUMENTS,
  LEGAL_GROUP_LABELS,
  type LegalDocumentGroup,
} from '@/lib/legal/versions';

const GROUP_ORDER: LegalDocumentGroup[] = ['platform', 'transactions', 'video-device'];

const GROUP_ICON: Record<LegalDocumentGroup, React.ComponentType<{ className?: string }>> = {
  platform: Scale,
  transactions: CreditCard,
  'video-device': Video,
};

// Published policies that live outside the versioned registry today.
const FURTHER_POLICIES = [
  { href: '/california-privacy', title: 'California Privacy Notice', summary: 'Rights under CCPA/CPRA and related state laws.' },
  { href: '/legal/marketplace-rules', title: 'Marketplace Rules', summary: 'What you can and can’t list, post, or do on Vendibook.' },
  { href: '/legal/seller-terms', title: 'Seller & Host Terms', summary: 'Listing accuracy, payouts, cancellations, and conduct.' },
  { href: '/legal/renter-terms', title: 'Buyer & Renter Terms', summary: 'Inspection, pickup, damage, and marketplace transaction risks.' },
  { href: '/legal/pay-in-person-terms', title: 'Pay-in-Person Acknowledgment', summary: 'What Vendibook does — and doesn’t — cover when you pay in cash.' },
  { href: '/legal/subscription-terms', title: 'Subscription & Paid Add-On Terms', summary: 'Recurring billing, renewal, cancellation, and refunds.' },
  { href: '/legal/refund-cancellation-policy', title: 'Refund & Cancellation Policy', summary: 'When platform fees and payments are refundable.' },
  { href: '/legal/featured-listing-terms', title: 'Featured Listing Terms', summary: 'Placement, duration, and refund rules for boosts.' },
  { href: '/legal/sms', title: 'SMS Terms', summary: 'Consent, keywords, frequency, and how to stop messages.' },
  { href: '/insurance', title: 'Insurance information', summary: 'What Vendibook does and does not underwrite.' },
];

export default function LegalCenter() {
  return (
    <>
      <SEO
        title="Legal Center | Vendibook"
        description="Vendibook’s terms, privacy, payments, handoff, financing, recording, and location policies in one place — each versioned and dated."
        canonical="https://vendibook.com/legal"
      />
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Legal Center</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Every Vendibook policy, in one place</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Each document below is versioned and dated. The version shown here is the version recorded
            when you accept it, so you can always see exactly what you agreed to and when.
          </p>
        </header>

        <div className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const Icon = GROUP_ICON[group];
            const docs = LEGAL_DOCUMENTS.filter((d) => d.group === group);
            return (
              <Card key={group} className="border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                    <CardTitle>{LEGAL_GROUP_LABELS[group].title}</CardTitle>
                  </div>
                  <CardDescription>{LEGAL_GROUP_LABELS[group].description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {docs.map((doc) => (
                      <li key={doc.slug}>
                        <Link
                          to={doc.route}
                          className="group block rounded-md border border-transparent p-2 -m-2 hover:border-border/60 hover:bg-muted/40"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                            <span className="group-hover:underline">{doc.title}</span>
                            <span className="rounded border border-border/60 px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                              v{doc.version} · {doc.effectiveDate}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{doc.summary}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" aria-hidden />
                <CardTitle>Further policies</CardTitle>
              </div>
              <CardDescription>Additional published Vendibook policies and notices.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {FURTHER_POLICIES.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="group block rounded-md border border-transparent p-2 -m-2 hover:border-border/60 hover:bg-muted/40"
                    >
                      <span className="text-sm font-medium group-hover:underline">{link.title}</span>
                      <p className="mt-1 text-xs text-muted-foreground">{link.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <section className="mt-12 rounded-xl border border-border/60 bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold">Questions about a policy?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact Vendibook Support at{' '}
                <a href="mailto:support@vendibook.com" className="underline">support@vendibook.com</a>{' '}
                or (725) 755-9598, Monday–Friday, 9am–5pm Arizona time. You can also visit the{' '}
                <Link to="/help" className="underline">Help Center</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
