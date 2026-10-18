# Contact-form email of Oct 18, 17:56 UTC: findings and proposed fix

## Findings (evidence)
- **Sender workflow:** the public contact form calls the `send-contact-email` function. It sends two emails, both using the `support-reply` layout:
  1. A confirmation to the visitor.
  2. A staff notice to support@vendibook.com, with the subject `New contact form: <visitor's subject>`.
- **Delivery log (Oct 18):**
  - 17:56:15: sent to **webwizardjosh@proton.me** (the visitor's confirmation).
  - 17:56:17: **suppressed** to support@vendibook.com, because that mailbox has an earlier bounce.
  - 17:56:18: sent to **atlasmom421@gmail.com**.
- **Why it went to atlasmom421@gmail.com:** the shared email sender adds a hidden owner copy to every staff email. So even though support@ was blocked, the owner copy still went out.
- **Why the body is generic:** the function passes `name` and `message`, but the layout only reads `firstName` and `bodyParagraphs`. It shows "Hi there," and the closing text, and drops the visitor's name, email, phone and message. The confirmation the visitor got is just as empty.
- **Submitter:** the only recorded identifier is the email **webwizardjosh@proton.me**. Their name, phone and message are **not stored anywhere**: the function saves nothing to the database (no support_tickets row), and the delivery log keeps no message content. The exact page isn't recorded either. The contact form is the only place in the code that uses this subject.

## Assessment (inference, not proven)
- The subject "For Shawnna: your pre-seed deck" and the proton.me address named "webwizard" look like a cold sales pitch (deck or web services) sent through the contact form. It does not look like an investor reaching out. Nothing shows it came from Vendibook's own outreach or an automated reply: no outreach records or sends exist around that time.
- You can recover the original text only by asking the sender, or by checking whether the support@ mailbox has another copy (it doesn't: that send was blocked).

## Proposed fix (for Codex to implement; Lovable only deploys)
1. In `send-contact-email`, pass `firstName` and `bodyParagraphs`, with sender name, email, phone and message, into the staff notice. Pass `firstName` into the visitor confirmation too.
2. Save each submission (name, email, subject, message, page) to the existing support ticket store, so it can be traced later.
3. Fix or clear the bounced support@vendibook.com mailbox so staff notices reach it again.
4. After Codex pushes, Lovable redeploys only `send-contact-email`.
