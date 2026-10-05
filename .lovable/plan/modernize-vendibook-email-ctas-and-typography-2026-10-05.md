# Modernize Vendibook email CTAs and typography

## Outcome
All shared Vendibook emails—Resend marketing, transactional, and Lovable account emails—use the same premium orange CTA treatment and a cleaner modern font stack.

## Changes
- Update the master email design tokens with a modern, email-safe sans-serif stack and a warm orange CTA shadow/glow.
- Apply the same CTA treatment to the shared React email components, legacy transactional styles, marketing HTML helpers, and The Vendibook Report’s primary buttons.
- Remove remaining serif headline styling from active shared marketing templates so typography is consistent.
- Keep email content, links, unsubscribe behavior, authentication, and sending logic unchanged.
- Record the shared styling decision in project guidance and update project design memory.

## Verification
- Run the email/template tests available in the repository.
- Check the generated email HTML for the new font stack, orange CTA, and supported shadow fallback.
- Confirm the app preview build remains healthy; do not send any email.

## Technical details
Email clients cannot reproduce animated website glow effects reliably, so the email-safe equivalent will use the existing orange fill, a stronger warm border, and layered static `box-shadow`. Unsupported clients will gracefully show the solid orange button.
