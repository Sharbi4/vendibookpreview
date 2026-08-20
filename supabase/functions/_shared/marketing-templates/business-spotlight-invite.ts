// Vendibook Business Spotlight invitation — premium light/editorial marketing
// email. Table-based, mobile-first, ivory canvas with a white content surface.
//
// Personalization is optional: pass `firstName` and/or `businessName` and the
// copy adapts, otherwise it falls back to neutral community wording.

export const SPOTLIGHT_CAMPAIGN_ID = "2026-08-business-spotlight-invite";

export const LOGO_IMG =
  "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png?v=2026-08";

const BASE = "https://vendibook.com";
export const SPOTLIGHT_FORM_PATH = "/community/spotlight";

const utm = (path: string, content: string) =>
  `${BASE}${path}${path.includes("?") ? "&" : "?"}utm_source=email&utm_medium=campaign&utm_campaign=${SPOTLIGHT_CAMPAIGN_ID}&utm_content=${content}`;

export const SPOTLIGHT_SUBJECT_A = "Vendibook wants to feature your business";
export const SPOTLIGHT_SUBJECT_B = "Show us what you’re building";
export const SPOTLIGHT_PREVIEW =
  "Share your food truck, trailer, kitchen, or mobile-food business for a chance to be featured by Vendibook.";

export type SpotlightSubjectVariant = "a" | "b";

export const SPOTLIGHT_SUBJECTS: Record<SpotlightSubjectVariant, string> = {
  a: SPOTLIGHT_SUBJECT_A,
  b: SPOTLIGHT_SUBJECT_B,
};

export interface SpotlightPersonalization {
  firstName?: string | null;
  businessName?: string | null;
}

const CTA_HREF = utm(SPOTLIGHT_FORM_PATH, "share_my_business");
const BROWSE_HREF = utm("/search", "browse_vendibook");

const BULLETS = [
  "Tell us your story",
  "Upload your best business photos",
  "Share your website and social pages",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const greetingFor = (p?: SpotlightPersonalization) => {
  const name = (p?.firstName ?? "").trim();
  return name ? `Hi ${name},` : "Hi there,";
};

const openingFor = (p?: SpotlightPersonalization) => {
  const biz = (p?.businessName ?? "").trim();
  return biz
    ? `Vendibook is built around the people doing the work — and ${biz} is exactly the kind of business our community wants to hear about.`
    : "Vendibook is built around the people doing the work — food-truck owners, trailer operators, caterers, commissaries, mobile beverage businesses, and the businesses that keep the mobile-food community moving.";
};

const PARAS_TAIL = [
  "We’re opening submissions for Vendibook Business Spotlights. Tell us what you’re building, share a few photos, and give us the links where people can find you.",
  "Selected businesses may be featured in a Vendibook blog story, on Facebook and other Vendibook social channels, or in emails to our community.",
];

const CLOSING =
  "There’s no fee to submit, and a submission does not guarantee publication. We’re simply looking for businesses and stories worth sharing with the community.";

export function buildSpotlightInviteHtml(
  unsubUrl: string,
  personalization?: SpotlightPersonalization,
  preferencesUrl?: string,
): string {
  const paras = [openingFor(personalization), ...PARAS_TAIL];
  const prefs = preferencesUrl ?? unsubUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(SPOTLIGHT_SUBJECT_A)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1d1a17;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(SPOTLIGHT_PREVIEW)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f3ef;padding:36px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e7e1d9;">
      <tr><td align="center" style="padding:0;background:#0d0c0b;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:38px 28px 34px 28px;background:#0d0c0b;">
            <img src="${LOGO_IMG}" alt="Vendibook" height="172" style="height:172px;width:auto;max-width:88%;display:block;margin:0 auto;border:0;">
          </td></tr>
          <tr><td style="height:4px;line-height:4px;font-size:0;background:#ff5124;">&nbsp;</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:34px 40px 0 40px;">
        <p style="margin:0 0 14px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#c2410c;font-weight:700;">Vendibook Business Spotlight</p>
        <h1 style="margin:0 0 8px 0;font-size:32px;line-height:1.2;font-weight:700;color:#1d1a17;letter-spacing:-0.02em;">We want to feature your business.</h1>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;"><tr><td style="width:56px;height:3px;line-height:3px;font-size:0;background:#ff5124;border-radius:999px;">&nbsp;</td></tr></table>
      </td></tr>
      <tr><td style="padding:0 40px;font-size:16px;line-height:1.8;color:#4b4640;">
        <p style="margin:0 0 16px 0;">${esc(greetingFor(personalization))}</p>
        ${paras.map((p) => `<p style="margin:0 0 16px 0;">${esc(p)}</p>`).join("")}
      </td></tr>
      <tr><td style="padding:10px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f5;border:1px solid #ece6de;border-radius:18px;">
          <tr><td style="padding:22px 24px;font-size:15px;line-height:1.85;color:#332f2a;">
            <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a827a;font-weight:700;">What being featured includes</p>
            ${BULLETS.map((x) => `<div style="margin:0 0 8px 0;"><span style="color:#ff5124;font-weight:700;">&#8226;</span>&nbsp; ${esc(x)}</div>`).join("")}
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:32px 40px 12px 40px;">
        <a href="${CTA_HREF}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.02em;padding:18px 40px;border-radius:999px;">Share my business</a>
      </td></tr>
      <tr><td align="center" style="padding:0 40px 28px 40px;font-size:14px;line-height:1.6;">
        <a href="${BROWSE_HREF}" style="color:#6b635a;text-decoration:underline;">Not ready to submit? Browse Vendibook</a>
      </td></tr>
      <tr><td style="padding:20px 40px 30px 40px;font-size:12.5px;line-height:1.8;color:#7a736a;border-top:1px solid #efeae3;">
        ${esc(CLOSING)}
      </td></tr>
      <tr><td style="background:#faf8f5;padding:26px 30px;border-top:1px solid #efeae3;font-size:12px;line-height:1.7;color:#7a736a;text-align:center;">
        <p style="margin:0 0 6px 0;color:#1d1a17;font-weight:700;letter-spacing:0.16em;">VENDIBOOK</p>
        <p style="margin:0 0 12px 0;">The marketplace for the mobile food economy.</p>
        <p style="margin:0 0 6px 0;"><a href="${BASE}" style="color:#6b635a;text-decoration:underline;">vendibook.com</a> &middot; <a href="${prefs}" style="color:#6b635a;text-decoration:underline;">Email preferences</a> &middot; <a href="${unsubUrl}" style="color:#6b635a;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:0;color:#9a938a;">Vendibook &middot; 1 S Church St, Tucson, AZ</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function buildSpotlightInviteText(
  unsubUrl: string,
  personalization?: SpotlightPersonalization,
): string {
  return `${SPOTLIGHT_SUBJECT_A}

${greetingFor(personalization)}

${openingFor(personalization)}

${PARAS_TAIL.join("\n\n")}

${BULLETS.map((x) => `- ${x}`).join("\n")}

Share my business: ${CTA_HREF}
Not ready to submit? Browse Vendibook: ${BROWSE_HREF}

${CLOSING}

Unsubscribe: ${unsubUrl}
Vendibook - 1 S Church St, Tucson, AZ
`;
}
