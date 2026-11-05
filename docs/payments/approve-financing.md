# APPROVE financing — November 5, 2026

Owner decision: APPROVE is the sole equipment financing option, replacing Equinox and PayPal Pay Later promotions. Ordinary PayPal purchase processing and Square rental checkout are separate and retained.

Canonical application: https://financing.approvepayments.com/vendibook. The homepage uses the owner's supplied banner at `/images/partners/approve-financing-banner.png`, with a readable mobile layout. Checkout financing, public financing pages and follow-up links use this destination. The handoff uses the current configured destination after listing eligibility verification, ignoring a stale provider URL in cached server responses.

The APPROVE feature flag is enabled; the retired Equinox flag is disabled. Legacy constant, hook and campaign identifiers remain where needed for compatibility or audit history. They do not select the former provider. Retired one-off marketing campaign handlers remain retired.

PayPal's SDK explicitly disables `paylater,credit`, filters those sources out of cached enable-funding configuration, and no longer mounts a Pay Later button or promotional message. Historical payment-source displays can still describe an earlier transaction truthfully.

Backend deployment/readback confirmed: financing-apply-link, financing-purchase-sheet, send-financing-followup, send-new-listings-digest, paypal-config, seo-prerender. Live application lookup returned the dedicated APPROVE URL and live PayPal config omitted Pay Later. All five ElevenLabs agents received current financing guidance with integration settings preserved; outbound used its isolated canonical sync script. No outbound customer communications were sent during verification.

Application imports and syntax compiled successfully with esbuild. Thirty-two focused tests passed, including portal routing, listing eligibility, calculator calculations, homepage banner destination and stale PayPal-config suppression. The standard local Vite build was blocked by missing SWC/Twilio dependencies. Published site assets independently confirmed the supplied banner, approved portal destination and Pay Later SDK suppression.
