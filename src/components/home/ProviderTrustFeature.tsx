import { motion } from 'framer-motion';
import { Lock, ShieldCheck, ExternalLink } from 'lucide-react';
import { PayPalWordmark, PlaidLogo } from '@/components/brand/ProviderLogos';
import paypalAppImage from '@/assets/brand/paypal-app-2025.webp.asset.json';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';

/**
 * Premium two-column provider feature for the homepage trust section.
 * PayPal is always visible. The Plaid card fails closed and only renders when
 * the server-backed `verified_seller_enabled` flag is true. Nothing here calls
 * an authenticated verification action — it is explanatory only.
 */
export function ProviderTrustFeature() {
  const verifiedSellerEnabled = usePublicFeatureFlag('verified_seller_enabled');

  return (
    <motion.div
      className="mb-10 grid grid-cols-1 gap-5 sm:mb-14 lg:grid-cols-2 lg:gap-8"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6 }}
    >
      {/* Visual side */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-border/50">
        <img
          src={paypalAppImage.url}
          alt="Someone reviewing a payment in the PayPal app on their phone"
          loading="lazy"
          className="h-full max-h-[420px] w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
      </div>

      {/* Copy side */}
      <div className="flex flex-col gap-4">
        <div className="glass-premium rounded-3xl p-6 sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
              <Lock className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
            </span>
            <PayPalWordmark className="h-5" />
          </div>
          <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Secure online checkout with PayPal
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            PayPal encrypts key financial details and monitors transactions. Eligible purchases may
            include PayPal Purchase Protection; terms and limitations apply.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
            Applies only to payments completed through Vendibook checkout. Pay-in-person and other
            off-platform payments are not processed by Vendibook.
          </p>
          <a
            href="https://www.paypal.com/us/digital-wallet/security-and-protection"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/80 underline underline-offset-4 transition-colors hover:text-primary"
          >
            PayPal security
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        {verifiedSellerEnabled && (
          <div className="glass-premium rounded-3xl p-6 sm:p-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-foreground/[0.10] bg-foreground/[0.06]">
                <ShieldCheck className="h-4 w-4 text-foreground/70" strokeWidth={1.75} />
              </span>
              <PlaidLogo surface="dark" className="h-4" />
            </div>
            <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Seller identity verification with Plaid*
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              An Identity Verified badge means Plaid helped confirm that person's identity. It does
              not verify equipment ownership, title, condition, value, or listing accuracy.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
              Not every seller is identity verified.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProviderTrustFeature;
