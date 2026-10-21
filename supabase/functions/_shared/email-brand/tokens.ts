// ─────────────────────────────────────────────────────────────
// VENDIBOOK MASTER EMAIL DESIGN SYSTEM — canonical tokens
//
// One source of truth for every Vendibook email (auth, transactional,
// and the marketing footer variant). Warm ivory canvas, white editorial
// content surface, charcoal type, Vendibook orange accent.
//
// Constraints baked in on purpose:
//   • Poppins (Google Fonts) with a sans-serif fallback stack — never a
//     serif/Times face; Outlook desktop is forced to Arial (see ./bulletproof.ts)
//   • no Tailwind — inline styles plus one shared <head> block
//   • 600px max content width
//   • one primary CTA look everywhere: the site's orange glow pill
//     (bulletproof table + Outlook VML in ./bulletproof.ts)
//   • no animation, no dark-mode hacks
// ─────────────────────────────────────────────────────────────

// ---- Brand constants -------------------------------------------------
export const BRAND_NAME = 'Vendibook'
export const SITE_URL = 'https://vendibook.com'
export const SUPPORT_EMAIL = 'support@vendibook.com'
export const SUPPORT_PHONE = '(725) 755-9598'
export const SUPPORT_HOURS = 'Mon–Fri, 9am–5pm AZ'
export const HELP_URL = `${SITE_URL}/help`
export const TERMS_URL = `${SITE_URL}/legal/terms`
export const PRIVACY_URL = `${SITE_URL}/legal/privacy`

/**
 * Physical mailing address — MARKETING FOOTERS ONLY (CAN-SPAM).
 * Source of truth mirrors `_shared/marketing-templates/constants.ts`.
 * Owner-provided street address; ZIP verified against City of Tucson records.
 */
export const MAILING_ADDRESS = 'Vendibook · 1 S Church Ave, Tucson, AZ 85701'

// ---- Canonical logo --------------------------------------------------
// Hosted on the email-assets storage bucket (CDN-cached, ~170KB).
// The 2.1MB `public/images/vendibook-logo.png` app asset must never be
// referenced from an email.
const EMAIL_ASSETS =
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets'

/** Light backgrounds (default for every email surface). Owner-supplied logo
 * 2026-10-05: flame-pin + "vendibook" wordmark, 1000×297 on white
 * (source: public/brand/vendibook-logo-email-white.png). */
export const LOGO_LIGHT_URL = `${EMAIL_ASSETS}/vendibook-logo-email-2026-10.png?v=2026-10`
/**
 * Dark backgrounds — verified 2026-08-20 to resolve (HTTP 200, 1000×293).
 * The master system is light-only; kept only for the marketing dark header.
 */
export const LOGO_DARK_URL = `${EMAIL_ASSETS}/vendibook-hero-logo-dark.png?v=2026-08`

/**
 * Rendered logo box. Source art verified 2026-08-20 as 1000×293 (≈3.41:1
 * wordmark). Width/height attributes must keep that ratio or Outlook squishes
 * the mark: 200 × 59 (200 / 3.413 = 58.6 → 59).
 */
export const LOGO_WIDTH = 200
export const LOGO_HEIGHT = 59
export const LOGO_ALT = 'Vendibook'


export const currentYear = () => new Date().getUTCFullYear()

// ---- Color -----------------------------------------------------------
export const color = {
  canvas: '#faf7f2', // warm ivory page background
  surface: '#ffffff', // white content surface
  surfaceMuted: '#f7f4ef', // callouts / detail panels
  text: '#1c1917', // charcoal
  textSecondary: '#57534e',
  textMuted: '#78716c', // accessible gray (4.6:1 on white)
  border: '#e7e2dc', // soft gray-warm hairline
  borderStrong: '#d6cfc6',
  primary: '#FF5124', // Vendibook orange
  primaryText: '#ffffff', // on-orange copy
  primaryDark: '#d93f16', // link-on-white orange (contrast safe)
  success: '#166534',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#92400e',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  error: '#9f1239',
  errorBg: '#fff1f2',
  errorBorder: '#fecdd3',
} as const

// ---- Type ------------------------------------------------------------
/** Owner request 2026-10-13: modern Poppins (Google Fonts) everywhere. Clients
 * that block web fonts (Gmail, Outlook) get Helvetica/Arial — never a serif. */
export const FONT_STACK =
  "Poppins, 'Helvetica Neue', Helvetica, Arial, sans-serif"
/** Google Fonts stylesheet loaded by every email <head>. */
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'

/**
 * Primary CTA = the site's orange glow button (`.bg-cta-primary` +
 * `.shadow-cta-primary` in src/index.css, used by `<Button variant="cta">`):
 *   background: linear-gradient(135deg, #FF4B1F 0%, #FF5A1F 45%, #FF7A22 100%)
 *   box-shadow: 0 18px 40px rgba(255, 75, 31, .32)
 * Email keeps the solid brand orange as the fill (Gmail/Outlook drop
 * gradients), layers the site gradient on top for clients that render it,
 * and adds a soft orange halo so the "glow" also reads at email scale.
 * Clients without box-shadow support keep the solid fill.
 */
export const CTA_BG = '#FF5124'
export const CTA_GRADIENT = 'linear-gradient(135deg, #FF4B1F 0%, #FF5A1F 45%, #FF7A22 100%)'
export const CTA_SHADOW =
  '0 0 24px rgba(255, 81, 36, 0.45), 0 18px 40px rgba(255, 75, 31, 0.32)'

export const size = {
  h1: '28px',
  h2: '20px',
  h3: '17px',
  body: '16px',
  bodySm: '15px',
  small: '13px',
  legal: '12px',
  eyebrow: '11px',
} as const

// ---- Layout ----------------------------------------------------------
export const MAX_WIDTH = 600
export const radius = { card: '12px', button: '999px', pill: '999px' } as const
export const space = {
  xs: '6px',
  sm: '10px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '40px',
} as const

// ---- Composed style objects -----------------------------------------
export const t = {
  body: {
    backgroundColor: color.canvas,
    fontFamily: FONT_STACK,
    margin: 0,
    padding: '24px 0',
    WebkitTextSizeAdjust: '100%',
  } as const,
  container: {
    width: '100%',
    maxWidth: `${MAX_WIDTH}px`,
    margin: '0 auto',
    padding: '0 16px',
  } as const,
  surface: {
    backgroundColor: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.card,
    padding: '32px 28px',
  } as const,
  eyebrow: {
    fontSize: size.eyebrow,
    lineHeight: 1.4,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: color.primaryDark,
    fontWeight: 700,
    margin: '0 0 10px',
  } as const,
  h1: {
    fontSize: size.h1,
    lineHeight: 1.22,
    fontWeight: 700,
    color: color.text,
    margin: '0 0 12px',
    letterSpacing: '-0.015em',
  } as const,
  h2: {
    fontSize: size.h2,
    lineHeight: 1.3,
    fontWeight: 700,
    color: color.text,
    margin: '0 0 10px',
  } as const,
  sectionLabel: {
    fontSize: size.eyebrow,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: color.textMuted,
    fontWeight: 700,
    margin: '0 0 10px',
  } as const,
  lede: {
    fontSize: size.body,
    lineHeight: 1.6,
    color: color.textSecondary,
    margin: '0 0 20px',
  } as const,
  text: {
    fontSize: size.bodySm,
    lineHeight: 1.65,
    color: color.text,
    fontFamily: FONT_STACK,
    margin: '0 0 16px',
  } as const,
  listItem: {
    fontSize: size.bodySm,
    lineHeight: 1.6,
    color: color.textSecondary,
    margin: '0 0 8px',
  } as const,
  small: {
    fontSize: size.small,
    lineHeight: 1.6,
    color: color.textMuted,
    margin: '0 0 10px',
  } as const,
  legal: {
    fontSize: size.legal,
    lineHeight: 1.6,
    color: color.textMuted,
    margin: '0 0 6px',
  } as const,
  link: { color: color.primaryDark, textDecoration: 'underline' } as const,
  linkMuted: { color: color.textSecondary, textDecoration: 'underline' } as const,
  button: {
    backgroundColor: color.primary,
    backgroundImage: CTA_GRADIENT,
    color: color.primaryText,
    border: `1px solid ${color.primary}`,
    boxShadow: CTA_SHADOW,
    padding: '14px 28px',
    borderRadius: radius.button,
    fontWeight: 600,
    fontSize: size.body,
    lineHeight: '20px',
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: FONT_STACK,
  } as const,
  buttonSecondary: {
    backgroundColor: color.surface,
    color: color.text,
    padding: '13px 27px',
    borderRadius: radius.button,
    border: `1px solid ${color.borderStrong}`,
    fontWeight: 600,
    fontSize: size.body,
    lineHeight: '20px',
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: FONT_STACK,
  } as const,
  hr: { borderColor: color.border, borderStyle: 'solid', borderWidth: '1px 0 0', margin: '24px 0' } as const,
  panel: {
    backgroundColor: color.surfaceMuted,
    border: `1px solid ${color.border}`,
    borderRadius: radius.card,
    padding: '18px 20px',
    margin: '0 0 20px',
  } as const,
} as const
