// ─────────────────────────────────────────────────────────────
// VENDIBOOK MASTER EMAIL DESIGN SYSTEM — canonical tokens
//
// One source of truth for every Vendibook email (auth, transactional,
// and the marketing footer variant). Warm ivory canvas, white editorial
// content surface, charcoal type, Vendibook orange accent.
//
// Constraints baked in on purpose:
//   • no webfonts — system stack only
//   • no Tailwind, no CSS classes — inline styles only
//   • 600px max content width
//   • no gradients, no animation, no dark-mode hacks
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
 * NOTE: no ZIP code is configured; see the Phase 2 report.
 */
export const MAILING_ADDRESS = 'Vendibook · 1 S Church St, Tucson, AZ'

// ---- Canonical logo --------------------------------------------------
// Hosted on the email-assets storage bucket (CDN-cached, ~170KB).
// The 2.1MB `public/images/vendibook-logo.png` app asset must never be
// referenced from an email.
const EMAIL_ASSETS =
  'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets'

/** Light backgrounds (default for every email surface). */
export const LOGO_LIGHT_URL = `${EMAIL_ASSETS}/vendibook-hero-logo.png?v=2026-08`
/** Dark backgrounds — reserved; the master system is light-only. */
export const LOGO_DARK_URL = `${EMAIL_ASSETS}/vendibook-hero-logo-dark.png?v=2026-08`

/** Rendered logo box. Source art is 3:2; keep the ratio to avoid squish. */
export const LOGO_WIDTH = 200
export const LOGO_HEIGHT = 133
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
export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, Helvetica, sans-serif"

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
export const radius = { card: '12px', button: '12px', pill: '999px' } as const
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
    color: color.primaryText,
    padding: '14px 26px',
    borderRadius: radius.button,
    fontWeight: 700,
    fontSize: size.bodySm,
    lineHeight: 1.2,
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: FONT_STACK,
  } as const,
  buttonSecondary: {
    backgroundColor: color.surface,
    color: color.text,
    padding: '13px 24px',
    borderRadius: radius.button,
    border: `1px solid ${color.borderStrong}`,
    fontWeight: 600,
    fontSize: size.bodySm,
    lineHeight: 1.2,
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
