import { Link } from 'react-router-dom';
import { linkifyFreight } from '@/components/shared/FreightLink';
import {
  FileText,
  MessagesSquare,
  Wallet,
  Truck,
  LayoutDashboard,
  BadgeCheck,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PayPalWordmark,
  PlaidLogo,
  EquinoxFundingLogo,
} from '@/components/brand/ProviderLogos';

/**
 * Single source of seller-facing payment, fee, verification, financing and
 * payout copy. Rendered once per seller page so the same explanation is never
 * repeated in multiple blocks.
 *
 * Accuracy rules encoded here:
 *  - Publishing is free and never gated on verification, payout setup,
 *    PayPal setup, financing, membership, or any paid add-on.
 *  - PayPal is the active online checkout provider.
 *  - Vendibook records seller proceeds minus the 12.9% seller platform fee and
 *    issues payouts through its reviewed payout workflow. Never describe payouts
 *    as instant, automated, split-settled, or held by a third party.
 *  - Pay-in-person sales carry no Vendibook seller platform fee.
 *  - Plaid identity verification is an optional $19.99 one-time upgrade.
 *  - Equinox Funding is an optional per-listing add-on; Vendibook is not a lender.
 */

export interface SellerPaymentsExplainerProps {
  /** Noun used in the copy, e.g. "food truck". Defaults to a generic label. */
  asset?: string;
  /** Where the primary CTA points. Canonical listing entry is /list/start. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Render without the outer section chrome when already inside a container. */
  nested?: boolean;
}

const STEPS = (asset: string) => [
  {
    icon: FileText,
    title: 'Create and publish for free',
    body: `Build your ${asset} listing with photos, video, specs, and your asking price. Publishing is free — no identity verification, payout setup, PayPal setup, financing, membership, or paid add-on is required.`,
  },
  {
    icon: MessagesSquare,
    title: 'Receive inquiries and offers',
    body: 'Buyers message you and can submit offers on your listing. Accept, counter, or decline inside Vendibook.',
  },
  {
    icon: Wallet,
    title: 'Choose how you get paid',
    body: 'Enable PayPal Checkout for online payment, accept payment in person, or offer both. You control which methods your listing shows.',
  },
  {
    icon: Landmark,
    title: 'Optionally add Equinox Funding',
    body: 'On an eligible for-sale truck, trailer, or cart you can turn on the Equinox Funding add-on so buyers can apply for financing and download the purchase sheet.',
  },
  {
    icon: Truck,
    title: 'Coordinate pickup or delivery',
    body: 'Arrange local pickup with the buyer, or use Vendibook Freight for coordinated delivery across the 48 contiguous states.',
  },
  {
    icon: LayoutDashboard,
    title: 'Track the transaction and payout',
    body: 'Follow the order, confirmations, documents, and payout status from your dashboard at every stage.',
  },
];

const SellerPaymentsExplainer = ({
  asset = 'listing',
  ctaHref = '/list/start',
  ctaLabel = 'Create your free listing',
  nested = false,
}: SellerPaymentsExplainerProps) => {
  const steps = STEPS(asset);

  return (
    <section
      aria-labelledby="seller-payments-heading"
      className={
        nested
          ? 'rounded-3xl border-2 border-border bg-card/30 backdrop-blur-sm p-6 md:p-10'
          : 'py-14 md:py-20 border-y-2 border-border bg-card/30'
      }
    >
      <div className={nested ? '' : 'container max-w-6xl mx-auto px-4'}>
        <div className="max-w-2xl mx-auto text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Selling on Vendibook
          </p>
          <h2
            id="seller-payments-heading"
            className="text-2xl md:text-3xl font-bold text-foreground mb-3"
          >
            How selling and getting paid works
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Six steps, one explanation. Free to publish, and you decide how payment happens.
          </p>
        </div>

        {/* Flow */}
        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="rounded-2xl border-2 border-border bg-background/70 backdrop-blur-sm p-5 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full border-2 border-border bg-card grid place-items-center font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{linkifyFreight(s.body)}</p>
              </li>
            );
          })}
        </ol>

        {/* Fees, payout, and provider facts */}
        <div className="grid gap-4 md:grid-cols-3 mt-6">
          <div className="rounded-2xl border-2 border-border bg-background/70 backdrop-blur-sm p-5 space-y-3">
            <div className="h-6 flex items-center">
              <PayPalWordmark className="h-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Fees and payouts
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For a completed Vendibook-processed sale, Vendibook records your proceeds minus the
              12.9% seller platform fee. The payout is issued through Vendibook&rsquo;s current
              reviewed payout workflow to the PayPal, Venmo, Cash App, or ACH destination you saved
              in your dashboard.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay-in-person sales are arranged directly between you and the buyer and carry no
              Vendibook seller platform fee.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Eligible purchases may include PayPal Purchase Protection; PayPal determines
              eligibility and outcomes.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-border bg-background/70 backdrop-blur-sm p-5 space-y-3">
            <div className="h-6 flex items-center">
              <PlaidLogo surface="dark" className="h-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Optional identity verification
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Identity verification is an optional one-time $19.99 seller upgrade, powered by Plaid
              and paid through PayPal. It is never required to publish a listing or to get paid.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The badge confirms identity only. It does not confirm ownership, title, condition,
              value, or the accuracy of a listing.
            </p>
            <Link
              to="/identity-verification"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline"
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Identity verification details
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-border bg-background/70 backdrop-blur-sm p-5 space-y-3">
            <div className="h-6 flex items-center">
              <EquinoxFundingLogo className="h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Optional buyer financing
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Equinox Funding is an optional per-listing add-on for eligible for-sale trucks,
              trailers, and carts. When enabled, buyers can apply and download the financing
              purchase sheet. A 12.9% platform fee applies to an Equinox-financed Vendibook sale.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vendibook is not a lender. Approval and terms are determined by Equinox and/or its
              funding providers.
            </p>
            <Link
              to="/financing"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline"
            >
              <Landmark className="h-3.5 w-3.5" /> Financing details
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" variant="dark-shine" asChild>
            <Link to={ctaHref}>{ctaLabel}</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Free to publish. Nothing to set up before you list.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SellerPaymentsExplainer;
