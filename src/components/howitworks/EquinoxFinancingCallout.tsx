import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Landmark, FileText, BadgeCheck } from 'lucide-react';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';

/**
 * Equinox Funding financing callout used on the how-it-works pages.
 * Copy mirrors /financing. Vendibook is never described as a lender.
 */
const EquinoxFinancingCallout = ({
  audience = 'seller',
}: {
  audience?: 'seller' | 'buyer';
}) => {
  const isSeller = audience === 'seller';

  return (
    <section className="py-12 md:py-16" aria-labelledby="equinox-financing-heading">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-border bg-card/60 backdrop-blur-xl p-6 md:p-10"
        >
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <EquinoxFundingLogo className="h-7" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Equipment financing partner
                </span>
              </div>
              <h2
                id="equinox-financing-heading"
                className="text-2xl md:text-3xl font-bold text-foreground mb-3"
              >
                {isSeller
                  ? 'Add Equinox Funding to your listing'
                  : 'Finance your purchase with Equinox Funding'}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                {isSeller ? (
                  <>
                    On eligible for-sale trucks, trailers, and carts you can switch on the optional
                    Equinox Funding add-on. Buyers see a financing option on your listing, can apply
                    directly, and can download a pro forma purchase sheet — which widens your buyer
                    pool beyond cash-in-hand shoppers. A 12.9% platform fee applies to an
                    Equinox-financed Vendibook sale.{' '}
                    <Link to="/financing" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                      Learn about financing
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    On eligible for-sale listings you can apply with Equinox Funding and download a
                    pro forma purchase sheet to move faster on the truck or trailer you want.
                    Financing is offered by Equinox, not Vendibook, and is subject to credit
                    approval.{' '}
                    <Link to="/financing" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                      Learn about financing
                    </Link>
                    .
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Vendibook is not a lender. Approval, rates, and terms are determined by Equinox
                Funding LLC and/or its funding providers.
              </p>
              <Link
                to="/financing"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
              >
                Explore financing options <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ul className="space-y-3">
              {[
                {
                  icon: BadgeCheck,
                  title: 'Optional per listing',
                  body: 'Turn it on or off any time — publishing never requires financing.',
                },
                {
                  icon: FileText,
                  title: 'Pro forma purchase sheet',
                  body: 'Auto-generated with the listing details lenders ask for.',
                },
                {
                  icon: Landmark,
                  title: 'Applications handled by Equinox',
                  body: 'Credit review and terms happen with Equinox, not Vendibook.',
                },
              ].map((f) => (
                <li
                  key={f.title}
                  className="flex gap-3 rounded-2xl border border-border bg-background/60 p-4"
                >
                  <f.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{f.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EquinoxFinancingCallout;
