// Shared Vendibook email design tokens.
//
// These now mirror the MASTER email design system in
// `_shared/email-brand/tokens.ts`: warm ivory canvas, white content card,
// charcoal type, Vendibook orange CTA with white text, soft gray hairlines,
// email-safe system font stack, ~600px max width.
//
// Key names are preserved so the ~50 templates that import `s` keep working.
import { color, FONT_STACK, LOGO_LIGHT_URL, SITE_URL as BRAND_SITE_URL } from '../email-brand/tokens.ts'

export const SITE_NAME = 'Vendibook'
export const SITE_URL = BRAND_SITE_URL
export const SUPPORT_PHONE = '(725) 755-9598'
/** Canonical email logo (email-assets bucket, ~170KB, 1000×293). */
export const LOGO_URL = LOGO_LIGHT_URL
export const LOGO_WIDTH = 200
export const LOGO_HEIGHT = 59

export const s = {
  main: { backgroundColor: color.canvas, fontFamily: FONT_STACK, margin: 0, padding: '24px 0' } as const,
  container: { width: '100%', maxWidth: '600px', margin: '0 auto', padding: '0 16px' } as const,
  brandBar: { padding: '0 0 18px' } as const,
  brandMark: { fontSize: '12px', letterSpacing: '0.28em', color: color.text, fontWeight: 700, margin: 0 } as const,
  card: { backgroundColor: color.surface, color: color.text, borderRadius: '12px', padding: '32px 28px', border: `1px solid ${color.border}` } as const,
  h1: { fontSize: '28px', lineHeight: 1.22, fontWeight: 700, color: color.text, margin: '0 0 12px', letterSpacing: '-0.015em' } as const,
  h2: { fontSize: '20px', lineHeight: 1.3, fontWeight: 700, color: color.text, margin: '0 0 10px' } as const,
  lede: { fontSize: '16px', lineHeight: 1.6, color: color.textSecondary, margin: '0 0 20px' } as const,
  text: { fontSize: '15px', lineHeight: 1.65, color: color.text, margin: '0 0 16px' } as const,
  small: { fontSize: '13px', lineHeight: 1.6, color: color.textMuted, margin: '0 0 10px' } as const,
  accentRow: { backgroundColor: color.surfaceMuted, border: `1px solid ${color.border}`, borderRadius: '12px', padding: '16px 18px', margin: '0 0 16px' } as const,
  accentLabel: { fontSize: '11px', letterSpacing: '0.16em', color: color.textMuted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' as const } as const,
  accentValue: { fontSize: '16px', color: color.primaryDark, fontWeight: 700, margin: 0 } as const,
  accentValuePlain: { fontSize: '16px', color: color.text, fontWeight: 600, margin: 0 } as const,
  ctaWrap: { margin: '12px 0 8px' } as const,
  button: { backgroundColor: color.primary, color: color.primaryText, padding: '14px 26px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', lineHeight: 1.2, textDecoration: 'none', display: 'inline-block', fontFamily: FONT_STACK } as const,
  buttonGhost: { backgroundColor: color.surface, color: color.text, padding: '13px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', lineHeight: 1.2, textDecoration: 'none', display: 'inline-block', border: `1px solid ${color.borderStrong}`, fontFamily: FONT_STACK } as const,
  hr: { borderColor: color.border, borderStyle: 'solid', borderWidth: '1px 0 0', margin: '24px 0' } as const,
  smallHeader: { fontSize: '11px', letterSpacing: '0.16em', color: color.textMuted, fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase' as const } as const,
  listItem: { fontSize: '15px', color: color.textSecondary, margin: '0 0 8px', lineHeight: 1.6 } as const,
  footnote: { fontSize: '12px', color: color.textMuted, textAlign: 'center' as const, margin: '20px 0 0', lineHeight: 1.6 } as const,
  good: { color: color.success, fontWeight: 700 } as const,
  warn: { color: color.warning, fontWeight: 700 } as const,
  bad: { color: color.error, fontWeight: 700 } as const,
  kicker: { fontSize: '11px', letterSpacing: '0.16em', color: color.primaryDark, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase' as const } as const,
  detailGrid: { backgroundColor: color.surfaceMuted, border: `1px solid ${color.border}`, borderRadius: '12px', padding: '18px 20px', margin: '0 0 20px' } as const,
  detailLabel: { fontSize: '11px', letterSpacing: '0.14em', color: color.textMuted, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' as const } as const,
  detailValue: { fontSize: '15px', color: color.text, fontWeight: 600, margin: 0 } as const,
  detailValueOrange: { fontSize: '20px', color: color.primaryDark, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' } as const,
  detailSub: { fontSize: '13px', color: color.textMuted, margin: '4px 0 0' } as const,
  detailMono: { fontSize: '13px', color: color.textSecondary, margin: 0, fontFamily: 'Menlo, Consolas, monospace', letterSpacing: '0.04em' } as const,
  hrThin: { borderColor: color.border, borderStyle: 'solid', borderWidth: '1px 0 0', margin: '14px 0' } as const,
  link: { color: color.primaryDark, textDecoration: 'underline' } as const,
}
