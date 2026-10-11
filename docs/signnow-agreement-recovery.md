# SignNow agreement preparation recovery

## Confirmed fixes
- The SignNow endpoints imported supabase-js 2.45.0 but used auth.getClaims, which is not available in that client. They now verify the bearer token with auth.getUser before enforcing existing participant/admin checks.
- Gateway JWT verification is disabled only for these self-authenticating endpoints, allowing current signing-key tokens to reach server verification. No participant check is removed.
- A failed existing-document query now stops preparation instead of being treated as an absent document. Existing agreements remain reused.
- The dashboard surfaces preparation/read failures rather than silently displaying an empty document list.

## Validation
12 focused regression tests passed: endpoint authorization, service-role finalizer access, reuse, fail-closed database lookup, and document UI states. The connected schema contains the required document columns and purchase_sale_agreement constraint. The reported 5/21 failures were not present in public.error_events; their exact provider/database log messages remain unverified. No retained paid sale without an agreement was found during this inspection.

## Deployment and recovery
Deploy signnow-ensure-document, signnow-ensure-bill-of-sale, signnow-ensure-rental-agreement, signnow-create-embedded-session, signnow-download-signed, signnow-create-amendment, and signnow-bootstrap with the committed config. Deploy signnow-agreement-sweep, paypal-capture-order and paypal-webhook with the updated shared document helper. Sync the frontend.

After deployment, a participant can reopen the transaction Documents section to retry preparation. Verify one successful sandbox purchase produces one live purchase_sale_agreement, that reopening reuses it, and that both parties can access their own signature session. Verify SignNow credentials/template availability and email delivery in deployed logs. Never rerun a capture to regenerate a document. This patch does not change PayPal sandbox configuration, capture/payment state, or payouts.

Sequential retries reuse existing documents and database read failures cannot create duplicates. This patch does not establish exactly-once external SignNow creation across simultaneous workers; the existing create-before-insert race remains a separate limitation.
