// Seller product update: buyer financing (Equinox Funding) is now available on
// every published for-sale Vendibook listing. Light "sale-light" email design —
// ivory canvas, charcoal type, one orange CTA. Table-based and Outlook-safe.

export const FINANCING_ANNOUNCEMENT_CAMPAIGN_ID =
  "published-sale-financing-equinox-2026-08";

export const VENDIBOOK_LOGO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png";
export const EQUINOX_LOGO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/partners%2Fequinox-funding-light.png";

const BASE = "https://vendibook.com";
const utm = (path: string, content: string) =>
  `${BASE}${path}${path.includes("?") ? "&" : "?"}utm_source=email&utm_medium=campaign&utm_campaign=${FINANCING_ANNOUNCEMENT_CAMPAIGN_ID}&utm_content=${content}`;

export const FINANCING_SUBJECT =
  "Your for-sale listings now show buyer financing";
export const FINANCING_PREVIEW =
  "Qualified buyers can now apply for equipment financing through Equinox Funding on your published for-sale listings. Nothing for you to set up.";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HEADING = "Buyers can now finance your listing";

const PARAS = [
  "Your published for-sale listings on Vendibook now show qualified buyers an option to apply for equipment financing through Equinox Funding, our financing partner. It is live on every published for-sale listing — there is nothing to turn on and nothing to manage.",
  "Financing is optional for the buyer. It is offered by Equinox Funding, not by Vendibook. Vendibook is not a lender and does not make credit decisions.",
];

const BULLETS: Array<{ title: string; body: string }> = [
  {
    title: "You do nothing",
    body:
      "Buyers apply directly with Equinox Funding from your listing. You are never asked to run credit, collect documents, or approve anyone.",
  },
  {
    title: "Your price does not change",
    body:
      "Financing does not discount your asking price and does not add a fee to you. Vendibook's standard sale commission is unchanged.",
  },
  {
    title: "You are paid the full sale price",
    body:
      "When a financed purchase closes, you are paid the agreed sale price in full. You never wait on the buyer's monthly payments — those are between the buyer and Equinox Funding.",
  },
  {
    title: "Your VIN / serial stays private",
    body:
      "It is never shown on the public listing. It only appears on the pro forma purchase summary a buyer sends to the lender.",
  },
];

const PAYOUT_NOTE =
  "Payout timing: financed sales completed through Vendibook checkout follow the standard sale payout schedule — funds are released 25 days after the sale is confirmed, which covers the card dispute window. Pay-in-person sales are settled directly between you and the buyer.";

const DISCLOSURE =
  "Financing is provided by Equinox Funding and its funding providers, not by Vendibook. Vendibook is not a lender and does not make credit decisions. Approval, amounts, rates, and terms are subject to lender review and are not guaranteed. Vendibook may receive compensation from Equinox Funding for referrals.";

const PRIMARY = { label: "See how financing works", href: utm("/financing", "seller_learn") };
const SECONDARY = { label: "View your listings", href: utm("/dashboard", "seller_dashboard") };

export function buildFinancingAnnouncementHtml(unsubUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(FINANCING_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1e;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(FINANCING_PREVIEW)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f4f1;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e8e4df;">
      <tr><td align="center" style="padding:26px 28px 4px 28px;">
        <img src="${VENDIBOOK_LOGO_IMG}" alt="Vendibook" height="96" style="height:96px;width:auto;display:inline-block;border:0;">
      </td></tr>
      <tr><td style="padding:14px 28px 0 28px;">
        <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;font-weight:700;">Product update for sellers</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.22;font-weight:700;color:#141416;letter-spacing:-0.02em;">${esc(HEADING)}</h1>
      </td></tr>
      <tr><td align="center" style="padding:2px 28px 8px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f6;border:1px solid #ece7e1;border-radius:16px;">
          <tr><td align="center" style="padding:16px 22px;">
            <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8177;font-weight:700;">Financing partner</p>
            <img src="${EQUINOX_LOGO_IMG}" alt="Equinox Funding" width="240" style="width:240px;max-width:100%;height:auto;display:block;border:0;">
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:14px 28px 0 28px;font-size:15px;line-height:1.72;color:#43434a;">
        ${PARAS.map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`).join("")}
      </td></tr>
      <tr><td style="padding:8px 28px 0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f6;border:1px solid #ece7e1;border-radius:16px;">
          <tr><td style="padding:6px 18px 8px 18px;">
            ${BULLETS.map(
              (b) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 0;border-bottom:1px solid #efeae4;">
              <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#1c1c1e;">${esc(b.title)}</p>
              <p style="margin:0;font-size:14px;line-height:1.65;color:#5b5b63;">${esc(b.body)}</p>
            </td></tr></table>`,
            ).join("")}
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 28px 0 28px;">
        <p style="margin:0;font-size:13px;line-height:1.7;color:#5b5b63;background:#fff7ed;border:1px solid #fde3c7;border-radius:14px;padding:14px 16px;">${esc(PAYOUT_NOTE)}</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 28px 8px 28px;">
        <a href="${PRIMARY.href}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:999px;">${esc(PRIMARY.label)}</a>
      </td></tr>
      <tr><td align="center" style="padding:0 28px 24px 28px;">
        <a href="${SECONDARY.href}" style="display:inline-block;background:#ffffff;color:#1c1c1e;text-decoration:none;font-weight:600;font-size:14px;padding:11px 26px;border-radius:999px;border:1px solid #ddd8d2;">${esc(SECONDARY.label)}</a>
      </td></tr>
      <tr><td style="padding:0 28px 22px 28px;font-size:11px;line-height:1.7;color:#8a8a92;">
        ${esc(DISCLOSURE)}
      </td></tr>
      <tr><td style="background:#faf8f6;padding:22px 28px;border-top:1px solid #ece7e1;font-size:12px;line-height:1.7;color:#8a8a92;text-align:center;">
        <p style="margin:0 0 6px 0;color:#1c1c1e;font-weight:700;letter-spacing:0.05em;">VENDIBOOK</p>
        <p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.</p>
        <p style="margin:0 0 6px 0;"><a href="${BASE}" style="color:#6b6b73;text-decoration:underline;">vendibook.com</a> &middot; <a href="${unsubUrl}" style="color:#6b6b73;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:0;color:#9a9aa2;">Vendibook &middot; 1 S Church St, Tucson, AZ</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function buildFinancingAnnouncementText(unsubUrl: string): string {
  return [
    "VENDIBOOK — PRODUCT UPDATE FOR SELLERS",
    "",
    HEADING,
    "",
    ...PARAS,
    "",
    ...BULLETS.map((b) => `- ${b.title}: ${b.body}`),
    "",
    PAYOUT_NOTE,
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
