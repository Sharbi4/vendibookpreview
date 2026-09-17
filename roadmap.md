# Roadmap

## PayPal Complete Payments — Connected Path certification

- [x] Step 1 — Foundation: BN code on all REST calls + JS SDK, PayPal request
      diagnostics (debug id, latency, environment, reference), multiparty
      feature flag defaulting OFF, SDK still loaded from PayPal's CDN, token
      caching preserved.
- [ ] Step 2 — Seller onboarding: Partner Referral create, seller status lookup,
      `seller_paypal_accounts` + history table, Payments & Payouts connect /
      ready / action-required / disconnected UI with PayPal's exact copy.
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
