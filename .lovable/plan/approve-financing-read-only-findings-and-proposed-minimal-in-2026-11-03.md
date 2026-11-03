# APPROVE financing — read-only findings and proposed minimal integration

Nothing was edited, sent, deployed or submitted. The APPROVE loader was NOT loaded or run.

## Findings (with evidence)

**Existing Equinox financing — keep as is**
- Gated by a public feature flag: `src/hooks/useListingFinancing.ts` (`useEquinoxFinancingEnabled`, `EQUINOX_FLAG_KEY`).
- Apply link comes from the server: `supabase/functions/financing-apply-link/index.ts` returns `EQUINOX_APPLY_URL` (a fixed redirect, no partner API). Also `financing-purchase-sheet`, `src/components/checkout/FinancingLine.tsx`, `CheckoutFinancingBanner.tsx`, and the follow-up template `_shared/transactional-email-templates/financing-followup.tsx`.

**Sign-in storage**
- `src/integrations/supabase/client.ts`: `persistSession: true` with `brokeredPreviewStorage()` (browser storage on the main site). Any script running on the vendibook.com origin could read the session. That's why APPROVE must not run on the main origin.

**Security headers (CSP)**
- No CSP found in `index.html` or `public/` (`public/_redirects` only, no `_headers`). There's no CSP to block or allow the loader today. This isn't a safeguard, and the iframe's `sandbox` is the only isolation.

**Public static files**
- `public/` is served as is (examples: `llms.txt`, `partners/`). A standalone `public/financing/approve.html` would be served at the same origin.

**Rental payments**
- `supabase/functions/square-rental-payment/index.ts`: one Square charge for the exact server quote (`amount_money: quote.grossCents`), with a quote-changed check. I found no recurring, 30-day autopay or card-on-file billing. A rental is a single one-time payment.
- Delivery fee: no `delivery_fee` reference in the Square rental functions. I didn't confirm whether delivery is part of the quote, so treat this as **unverified**.

**Email route (the user requires Resend only)**
- `_shared/invokeTransactionalEmail.ts` → `transactional-email-templates/send-email.ts` uses `sendLovableEmail` (Lovable managed email), **not Resend**.
- The only direct Resend sender is `_shared/tawkForward.ts` (`api.resend.com/emails`, `updates.vendibook.com`). It defaults to forwarding to shawnnaharbin@vendibook.com, which is internal only.
- `shawnnaharbin@` and `atlasmom421@gmail.com` appear only as internal staff/owner recipients (`adminRecipients.ts`, `send-email.ts` STAFF/OWNER sets). I found no customer-facing sender using them.
- Conclusion: no shared Resend template sender exists today. Any APPROVE email needs a new small Resend helper (from `updates.vendibook.com`, reply-to support@vendibook.com) or a separate decision to move the managed route.

## Sandboxed iframe — assessment (not tested)
- `sandbox="allow-scripts allow-forms allow-popups"` without `allow-same-origin` gives the frame an opaque origin. The loader can't read vendibook.com storage, cookies or the parent page, and without `allow-top-navigation` it can't redirect the main site. This is standard browser behavior, but I haven't tested it against APPROVE.
- Risks to **test before deciding**: the loader may rely on `localStorage`/cookies (these throw or are blocked in opaque origins), on API CORS that rejects `Origin: null`, or on `document.referrer`/domain allow-listing tied to vendibook.com. Any of these could break it. Popups would also need `allow-popups-to-escape-sandbox` if APPROVE opens its application in a new tab.

## Proposed minimal plan (after approval)
1. Add a test page only: `public/financing/approve-frame.html` containing just `<approve-plugin>` and the given loader. No app bundle, no Supabase and no customer data.
2. Add an opt-in route `/financing/approve` that shows a consent card and then the sandboxed iframe. Don't mount it on auth, checkout, payment, admin or messaging pages. Gate it behind a new feature flag that's off by default.
3. Test in a headless browser on preview, then record the results: whether it renders, console and storage errors, the loader's network requests and their CORS response to `Origin: null`, and popup behavior. If it fails, the options are a separate subdomain (true cross-origin isolation, with `allow-same-origin` safe there) or APPROVE's hosted link. I won't guess which.
4. Leave Equinox flows unchanged.
5. Email: only if requested, add a Resend-only helper. Nothing gets sent without explicit approval.

## Open questions
- Should APPROVE apply to equipment sales only? Rentals have no recurring billing to finance.
- Is a separate subdomain acceptable if the opaque-origin test fails?
