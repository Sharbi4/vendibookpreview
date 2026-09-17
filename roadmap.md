# Roadmap

## PayPal Complete Payments — Connected Path certification

- [x] Step 1 — Foundation: BN code on all REST calls + JS SDK, PayPal request
      diagnostics (debug id, latency, environment, reference), multiparty
      feature flag defaulting OFF, SDK still loaded from PayPal's CDN, token
      caching preserved.
- [x] Step 2 — Seller onboarding: Partner Referral create, seller status lookup,
      `seller_paypal_accounts` + history table (disconnects archive, never
      delete), Payments & Payouts connect / ready / action-required /
      disconnected UI with PayPal's exact copy. Sandbox-first: runs in
      PAYPAL_ONBOARDING_ENV, token cache split per environment. Gated OFF
      behind PAYPAL_SELLER_ONBOARDING_ENABLED until you flip it on (needs the
      live PAYPAL_PARTNER_MERCHANT_ID before live rollout).
- [ ] Step 2.5 — Activate sandbox onboarding (set
      PAYPAL_SELLER_ONBOARDING_ENABLED=true, PAYPAL_ONBOARDING_ENV=sandbox) and
      run a seller end-to-end against PayPal sandbox.
- [ ] Step 3 — Multiparty routing behind the flag: payee + platform_fees on
      sale and rental orders, per-kind line items, shipping matrix and address
      validation.
- [ ] Step 4 — Refunds with partner-fee reversal, merchant webhooks, thank-you
      payment source.
- [ ] Step 5 — Sandbox QA matrix + certification evidence package.
- [ ] Step 6 — Live cohort rollout; retire manual payouts per onboarded seller.

## Other open items

- [ ] SEO Tier 2 wave (city FAQ differentiation, PricePilot links on buy pages) —
      awaiting go-ahead.
- [ ] Add the marketing tag to the new-listings digest sends so opens/clicks are
      tracked — awaiting decision.
