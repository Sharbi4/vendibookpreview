// Correction notice for the seller financing announcement.
//
// The original product update stated an incorrect payout schedule ("25 days").
// This email apologizes and states the correct policy: payouts are typically
// released within 24 hours of delivery confirmation, and always within
// 24–48 hours, sent via PayPal, ACH, or Venmo depending on the payout account
// on file.
//
// Premium editorial design: charcoal header band with the white Vendibook
// wordmark, ivory canvas, one orange CTA. Table-based and Outlook-safe.

export const FINANCING_CORRECTION_CAMPAIGN_ID =
  "published-sale-financing-equinox-2026-08-payout-correction";

/** Original campaign — defines exactly who must receive this correction. */
export const ORIGINAL_FINANCING_CAMPAIGN_ID =
  "published-sale-financing-equinox-2026-08";

/** White wordmark — for the charcoal header band only. */
export const VENDIBOOK_LOGO_DARK_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo-dark.png?v=2026-08";
export const EQUINOX_LOGO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/partners%2Fequinox-funding-light.png";

const BASE = "https://vendibook.com";
const utm = (path: string, content: string) =>
  `${BASE}${path}${path.includes("?") ? "&" : "?"}utm_source=email&utm_medium=campaign&utm_campaign=${FINANCING_CORRECTION_CAMPAIGN_ID}&utm_content=${content}`;

export const CORRECTION_SUBJECT =
  "Correction: your payout timing on Vendibook";
export const CORRECTION_PREVIEW =
  "Our financing update listed the wrong payout schedule. Payouts are typically released within 24 hours of delivery confirmation — here is the correct information.";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const EYEBROW = "Correction · Seller payouts";
const HEADING = "We got the payout timing wrong. Here is the correct policy.";

const OPENING = [
  "Earlier this month we emailed you about buyer financing being available on your published for-sale listings. That email included an incorrect statement about when you get paid — it said payouts release 25 days after a sale is confirmed. That is not our payout policy, and we are sorry for the confusion it caused.",
];

const CORRECT_TITLE = "The correct payout policy";
const CORRECT_POINTS: Array<{ title: string; body: string }> = [
  {
    title: "Typically within 24 hours",
    body:
      "Payouts are typically released within 24 hours of delivery confirmation.",
  },
  {
    title: "Always our 24–48 hour target",
    body:
      "We always strive to release seller payouts within 24 to 48 hours of delivery confirmation.",
  },
  {
    title: "Paid to your payout account",
    body:
      "Payouts are sent via PayPal, ACH bank transfer, or Venmo, depending on the payout account you have on file.",
  },
];

const CLOSING = [
  "Everything else in that email stands: buyer financing through Equinox Funding is live on every published for-sale listing, there is nothing for you to set up, your asking price does not change, and you are paid the full agreed sale price.",
  "Thank you for your patience — and for selling on Vendibook.",
];

const DISCLOSURE =
  "Payout timing begins at delivery confirmation and can be affected by your payout account details, bank processing times, or a dispute on the order. Pay-in-person sales are settled directly between you and the buyer. Financing is provided by Equinox Funding and its funding providers, not by Vendibook. Vendibook is not a lender and does not make credit decisions.";

const PRIMARY = { label: "Review your payout settings", href: utm("/dashboard", "correction_payouts") };
const SECONDARY = { label: "See how financing works", href: utm("/financing", "correction_financing") };

export function buildFinancingCorrectionHtml(unsubUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(CORRECTION_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1e;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(CORRECTION_PREVIEW)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f4f1;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e8e4df;">

      <!-- charcoal header band with the white wordmark -->
      <tr><td align="center" style="background:#0f0f11;padding:34px 28px 30px 28px;">
        <img src="${VENDIBOOK_LOGO_DARK_IMG}" alt="Vendibook" height="132" style="height:132px;width:auto;display:inline-block;border:0;">
      </td></tr>
      <tr><td style="height:3px;line-height:3px;font-size:0;background:#ff5124;">&nbsp;</td></tr>

      <tr><td style="padding:34px 36px 0 36px;">
        <p style="margin:0 0 14px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#b45309;font-weight:700;">${esc(EYEBROW)}</p>
        <h1 style="margin:0 0 18px 0;font-size:29px;line-height:1.2;font-weight:700;color:#141416;letter-spacing:-0.02em;">${esc(HEADING)}</h1>
        <table role="presentation" width="56" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:2px;line-height:2px;font-size:0;background:#e6e0d9;">&nbsp;</td></tr></table>
      </td></tr>

      <tr><td style="padding:22px 36px 0 36px;font-size:15px;line-height:1.75;color:#43434a;">
        ${OPENING.map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`).join("")}
      </td></tr>

      <tr><td style="padding:10px 36px 0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffdf9;border:1px solid #ece7e1;border-radius:18px;">
          <tr><td style="padding:20px 22px 6px 22px;">
            <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8177;font-weight:700;">${esc(CORRECT_TITLE)}</p>
          </td></tr>
          <tr><td style="padding:0 22px 10px 22px;">
            ${CORRECT_POINTS.map(
              (b, i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 0;${i < CORRECT_POINTS.length - 1 ? "border-bottom:1px solid #efeae4;" : ""}">
              <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#1c1c1e;">${esc(b.title)}</p>
              <p style="margin:0;font-size:14px;line-height:1.65;color:#5b5b63;">${esc(b.body)}</p>
            </td></tr></table>`,
            ).join("")}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 36px 0 36px;font-size:15px;line-height:1.75;color:#43434a;">
        ${CLOSING.map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`).join("")}
      </td></tr>

      <tr><td align="center" style="padding:14px 36px 8px 36px;">
        <a href="${PRIMARY.href}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 32px;border-radius:999px;">${esc(PRIMARY.label)}</a>
      </td></tr>
      <tr><td align="center" style="padding:0 36px 22px 36px;">
        <a href="${SECONDARY.href}" style="display:inline-block;background:#ffffff;color:#1c1c1e;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:999px;border:1px solid #ddd8d2;">${esc(SECONDARY.label)}</a>
      </td></tr>

      <tr><td align="center" style="padding:0 36px 24px 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f6;border:1px solid #ece7e1;border-radius:16px;">
          <tr><td align="center" style="padding:14px 22px;">
            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8177;font-weight:700;">Financing partner</p>
            <img src="${EQUINOX_LOGO_IMG}" alt="Equinox Funding" width="200" style="width:200px;max-width:100%;height:auto;display:block;border:0;">
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:0 36px 24px 36px;font-size:11px;line-height:1.7;color:#8a8a92;">
        ${esc(DISCLOSURE)}
      </td></tr>

      <tr><td style="background:#faf8f6;padding:24px 28px;border-top:1px solid #ece7e1;font-size:12px;line-height:1.7;color:#8a8a92;text-align:center;">
        <p style="margin:0 0 6px 0;color:#1c1c1e;font-weight:700;letter-spacing:0.06em;">VENDIBOOK</p>
        <p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.</p>
        <p style="margin:0 0 6px 0;"><a href="${BASE}" style="color:#6b6b73;text-decoration:underline;">vendibook.com</a> &middot; <a href="mailto:support@vendibook.com" style="color:#6b6b73;text-decoration:underline;">support@vendibook.com</a> &middot; <a href="${unsubUrl}" style="color:#6b6b73;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:0;color:#9a9aa2;">Vendibook &middot; 1 S Church St, Tucson, AZ</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function buildFinancingCorrectionText(unsubUrl: string): string {
  return [
    "VENDIBOOK — CORRECTION: SELLER PAYOUTS",
    "",
    HEADING,
    "",
    ...OPENING,
    "",
    CORRECT_TITLE.toUpperCase(),
    ...CORRECT_POINTS.map((b) => `- ${b.title}: ${b.body}`),
    "",
    ...CLOSING,
    "",
    `${PRIMARY.label}: ${PRIMARY.href}`,
    `${SECONDARY.label}: ${SECONDARY.href}`,
    "",
    DISCLOSURE,
    "",
    `Unsubscribe: ${unsubUrl}`,
    "Vendibook · 1 S Church St, Tucson, AZ",
  ].join("\n");
}
