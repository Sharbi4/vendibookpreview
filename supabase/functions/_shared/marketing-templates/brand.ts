// ─────────────────────────────────────────────────────────────
// VENDIBOOK MARKETING EMAIL BRAND (Phase 3)
//
// String-HTML adapter over the master email design system
// (`_shared/email-brand/tokens.ts`). Marketing may be slightly
// richer/editorial than transactional, but every value below is
// derived from the master tokens — do NOT introduce a competing
// palette, font stack, or width here.
// ─────────────────────────────────────────────────────────────
import {
  color,
  FONT_STACK,
  MAX_WIDTH,
  radius,
  LOGO_LIGHT_URL,
  LOGO_DARK_URL,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
} from "../email-brand/tokens.ts";

export {
  color,
  FONT_STACK,
  MAX_WIDTH,
  radius,
  LOGO_LIGHT_URL,
  LOGO_DARK_URL,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
};

/** Marketing palette — aliases onto the master tokens. */
export const MK = {
  canvas: color.canvas,          // warm ivory outer canvas
  surface: color.surface,        // white content surface
  surfaceMuted: color.surfaceMuted,
  text: color.text,              // charcoal
  textSecondary: color.textSecondary,
  textMuted: color.textMuted,
  border: color.border,          // soft gray hairline
  orange: color.primary,         // CTA fill
  orangeOnWhite: color.primaryDark, // orange text/links on white
  onOrange: color.primaryText,
} as const;

export const FONT = FONT_STACK;

// ---- CAN-SPAM mailing address (ONE source of truth) ------------------
/**
 * REQUIRED CONFIG: `MARKETING_MAILING_ADDRESS`
 * Full postal address incl. ZIP, e.g.
 *   "Vendibook · 1 S Church St, Suite 000, Tucson, AZ 85701"
 * Set it in Project Settings → Secrets. Until it is set we fall back to
 * the known street address (no ZIP configured — do not invent one).
 */
export const MAILING_ADDRESS_FALLBACK = "Vendibook · 1 S Church St, Tucson, AZ";
export function mailingAddress(): string {
  const configured = (globalThis as any).Deno?.env?.get?.("MARKETING_MAILING_ADDRESS");
  return (configured && String(configured).trim()) || MAILING_ADDRESS_FALLBACK;
}
/** True when a complete, ZIP-bearing address has been configured. */
export const mailingAddressConfigured = (): boolean =>
  /\d{5}/.test(mailingAddress());

// ---- Sender convention ------------------------------------------------
// One verified domain (updates.vendibook.com), two marketing personas.
export const MARKETING_FROM = "Vendibook <hello@updates.vendibook.com>";       // campaigns, digests, newsletters
export const REPORT_FROM = "Vendibook <report@updates.vendibook.com>";         // The Vendibook Report only
export const MARKETING_REPLY_TO = "support@vendibook.com";

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

/** Orange pill CTA, white text. */
export function mkButton(label: string, href: string, opts: { ghost?: boolean } = {}): string {
  const bg = opts.ghost ? MK.surface : MK.orange;
  const fg = opts.ghost ? MK.text : MK.onOrange;
  const border = opts.ghost ? `1px solid ${MK.border}` : `1px solid ${MK.orange}`;
  return `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:${fg};border:${border};border-radius:${radius.button};padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;">${esc(label)}</a>`;
}

/**
 * Canonical marketing footer — Vendibook identity, support/contact,
 * working unsubscribe, and the centralized mailing address.
 */
export function marketingFooter(opts: {
  unsubscribeUrl: string;
  baseUrl?: string;
  note?: string;
  logoUrl?: string;
}): string {
  const base = opts.baseUrl || SITE_URL;
  const logo = opts.logoUrl || LOGO_LIGHT_URL;
  const small = `font-family:${FONT};font-size:12px;line-height:1.6;color:${MK.textMuted};`;
  const link = `color:${MK.textMuted};text-decoration:underline;`;
  return `
<tr><td style="background:${MK.surface};border-top:1px solid ${MK.border};padding:32px 28px;text-align:center;">
  <img src="${esc(logo)}" alt="Vendibook" width="140" style="display:inline-block;width:140px;max-width:140px;height:auto;border:0;margin:0 0 14px;" />
  ${opts.note ? `<p style="${small}margin:0 0 12px;">${esc(opts.note)}</p>` : ""}
  <p style="${small}margin:0 0 12px;">
    Questions? <a href="mailto:${SUPPORT_EMAIL}" style="${link}">${SUPPORT_EMAIL}</a> · ${esc(SUPPORT_HOURS)}
  </p>
  <p style="${small}margin:0 0 12px;">
    <a href="${esc(opts.unsubscribeUrl)}" style="${link}">Unsubscribe</a> ·
    <a href="${esc(base)}/help" style="${link}">Help Center</a> ·
    <a href="${esc(base)}/privacy" style="${link}">Privacy</a>
  </p>
  <p style="${small}margin:0 0 6px;">${esc(mailingAddress())}</p>
  <p style="${small}margin:0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
</td></tr>`;
}

/** Full document shell: ivory canvas, white 600px card, mobile-safe. */
export function marketingShell(opts: {
  title: string;
  preheader?: string;
  bodyRows: string; // one or more <tr>…</tr>
  unsubscribeUrl: string;
  baseUrl?: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${MK.canvas};font-family:${FONT};color:${MK.text};-webkit-text-size-adjust:100%;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MK.canvas};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="${MAX_WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${MAX_WIDTH}px;background:${MK.surface};border:1px solid ${MK.border};border-radius:${radius.card};overflow:hidden;">
  <tr><td align="center" style="padding:28px 28px 8px;background:${MK.surface};">
    <a href="${esc(opts.baseUrl || SITE_URL)}"><img src="${LOGO_LIGHT_URL}" alt="Vendibook" width="180" style="display:inline-block;width:180px;max-width:180px;height:auto;border:0;" /></a>
  </td></tr>
  ${opts.bodyRows}
  ${marketingFooter({ unsubscribeUrl: opts.unsubscribeUrl, baseUrl: opts.baseUrl, note: opts.footerNote })}
</table>
</td></tr></table>
</body></html>`;
}

/**
 * Truthful marketplace value props for marketing copy.
 * Never reintroduce: 24/7 support, background-checked hosts, universal
 * verification, escrow, Stripe, Affirm/Klarna/Afterpay, Concierge $149.
 */
export const TRUE_VALUE_PROPS = [
  { label: "Secure Checkout", description: "Card and PayPal payments processed by PayPal." },
  { label: "Buyer Financing", description: "Equipment financing available through Equinox Funding on for-sale listings." },
  { label: "Verified Seller Badge", description: "Sellers can verify their identity with Plaid." },
  { label: "Instant Booking", description: "Reserve an eligible kitchen or space in minutes." },
  { label: "Seller Dashboard", description: "Track views, inquiries, and offers in one place." },
  { label: "Support That Answers", description: `Real people, ${SUPPORT_HOURS}.` },
];
