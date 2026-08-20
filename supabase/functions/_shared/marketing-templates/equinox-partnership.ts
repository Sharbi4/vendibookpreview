// Vendibook x Equinox Funding partnership announcement — responsive, table-based,
// dark-luxury marketing email. One template, two audience variants.

export const EQUINOX_CAMPAIGN_ID = "2026-08-equinox-partnership";

export const HERO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/campaigns/vendibook-equinox-partnership.jpg";
export const LOGO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo-dark.png?v=2026-08";

const BASE = "https://vendibook.com";
const utm = (path: string, content: string) =>
  `${BASE}${path}${path.includes("?") ? "&" : "?"}utm_source=email&utm_medium=campaign&utm_campaign=${EQUINOX_CAMPAIGN_ID}&utm_content=${content}`;

export type EquinoxVariant = "buyer" | "seller";

export const SUBJECTS: Record<EquinoxVariant, string> = {
  buyer: "Financing options are coming to Vendibook",
  seller: "Your listings can now show financing options",
};

export const PREVIEWS: Record<EquinoxVariant, string> = {
  buyer:
    "Vendibook has partnered with Equinox Funding so buyers can apply for equipment financing on food trucks, trailers, and carts.",
  seller:
    "Vendibook has partnered with Equinox Funding. Turn on financing options for your for-sale listings in a couple of clicks.",
};

const BODY: Record<EquinoxVariant, { heading: string; paras: string[]; bullets: string[]; primary: { label: string; href: string }; secondary: { label: string; href: string } }> = {
  buyer: {
    heading: "A new partnership: Vendibook + Equinox Funding",
    paras: [
      "Buying a food truck, trailer, or cart usually means paying for everything up front. We wanted a better option, so we partnered with Equinox Funding — an equipment financing specialist that works with mobile food businesses every day.",
      "Financing is optional, and it is offered by Equinox Funding, not by Vendibook. Vendibook is not a lender. Approval, rates, and terms are decided by Equinox Funding and its funding providers.",
    ],
    bullets: [
      "Apply directly with Equinox Funding from eligible for-sale listings",
      "Download a pro forma purchase summary to send to your lender",
      "Keep paying the way you prefer — PayPal checkout or pay in person",
    ],
    primary: { label: "Apply for financing", href: utm("/financing", "buyer_apply") },
    secondary: { label: "Browse equipment for sale", href: utm("/search?mode=sale", "buyer_browse") },
  },
  seller: {
    heading: "A new partnership: Vendibook + Equinox Funding",
    paras: [
      "We partnered with Equinox Funding so buyers can apply for equipment financing on eligible for-sale listings. More payment paths generally means fewer stalled conversations.",
      "Financing is optional and off by default. You can enable it per listing, and turning it on or off never unpublishes or changes your listing.",
    ],
    bullets: [
      "Buyers see a financing option and can apply with Equinox Funding",
      "Your VIN / serial number stays private on the listing — it only appears on the financing purchase summary",
      "Vendibook's 12.9% sale platform fee still applies to financed sales completed through Vendibook",
    ],
    primary: { label: "Turn on financing for a listing", href: utm("/financing/enable", "seller_enable") },
    secondary: { label: "Learn how financing works", href: utm("/financing", "seller_learn") },
  },
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildEquinoxHtml(variant: EquinoxVariant, unsubUrl: string): string {
  const b = BODY[variant];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(SUBJECTS[variant])}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f5f5f4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(PREVIEWS[variant])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0b;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0f0f12;border-radius:18px;overflow:hidden;border:1px solid #232329;">
      <tr><td align="center" style="padding:28px 28px 8px 28px;">
        <img src="${LOGO_IMG}" alt="Vendibook" height="112" style="height:112px;width:auto;display:inline-block;border:0;">
      </td></tr>
      <tr><td style="padding:8px 20px 0 20px;">
        <img src="${HERO_IMG}" alt="Vendibook and Equinox Funding partnership" width="560" style="width:100%;height:auto;border-radius:14px;display:block;border:1px solid #232329;">
      </td></tr>
      <tr><td style="padding:26px 28px 0 28px;">
        <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#7ed957;font-weight:700;">A new partnership</p>
        <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${esc(b.heading)}</h1>
      </td></tr>
      <tr><td style="padding:0 28px;font-size:15px;line-height:1.7;color:#c7c7cc;">
        ${b.paras.map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`).join("")}
      </td></tr>
      <tr><td style="padding:6px 28px 0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141419;border:1px solid #26262d;border-radius:14px;">
          <tr><td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#dcdce0;">
            ${b.bullets.map((x) => `<div style="margin:0 0 8px 0;">&#8226;&nbsp; ${esc(x)}</div>`).join("")}
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:24px 28px 8px 28px;">
        <a href="${b.primary.href}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:999px;">${esc(b.primary.label)}</a>
      </td></tr>
      <tr><td align="center" style="padding:0 28px 26px 28px;">
        <a href="${b.secondary.href}" style="display:inline-block;background:transparent;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 26px;border-radius:999px;border:1px solid #3a3a44;">${esc(b.secondary.label)}</a>
      </td></tr>
      <tr><td style="padding:0 28px 24px 28px;font-size:11px;line-height:1.7;color:#8a8a92;">
        Financing is provided by Equinox Funding and its funding providers, not by Vendibook. Vendibook is not a lender and does not make credit decisions. Approval, rates, and terms are subject to lender review. Vendibook may receive compensation from Equinox Funding for referrals.
      </td></tr>
      <tr><td style="background:#0b0b0d;padding:22px 28px;border-top:1px solid #232329;font-size:12px;line-height:1.7;color:#8a8a92;text-align:center;">
        <p style="margin:0 0 6px 0;color:#ffffff;font-weight:700;letter-spacing:0.05em;">VENDIBOOK</p>
        <p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.</p>
        <p style="margin:0 0 6px 0;"><a href="${BASE}" style="color:#a1a1aa;text-decoration:underline;">vendibook.com</a> &middot; <a href="${unsubUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:0;color:#6b6b73;">Vendibook &middot; 1 S Church St, Tucson, AZ</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function buildEquinoxText(variant: EquinoxVariant, unsubUrl: string): string {
  const b = BODY[variant];
  return `${SUBJECTS[variant]}

${b.heading}

${b.paras.join("\n\n")}

${b.bullets.map((x) => `- ${x}`).join("\n")}

${b.primary.label}: ${b.primary.href}
${b.secondary.label}: ${b.secondary.href}

Financing is provided by Equinox Funding and its funding providers, not by Vendibook. Vendibook is not a lender and does not make credit decisions. Approval, rates, and terms are subject to lender review.

Unsubscribe: ${unsubUrl}
Vendibook - 1 S Church St, Tucson, AZ
`;
}
