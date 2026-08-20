// Shared Vendibook email design tokens — premium dark editorial.
// Body background MUST stay white for client compatibility.
export const SITE_NAME = 'Vendibook'
export const SITE_URL = 'https://vendibook.com'
export const SUPPORT_PHONE = '(725) 755-9598'
// Brand logo (matches the homepage hero wordmark). Hosted on the email-assets bucket
// so it loads in every mail client without referencing the app bundle.
export const LOGO_URL = 'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-hero-logo.png?v=2026-08'

export const s = {
  main: { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '0 20px' } as const,
  brandBar: { padding: '0 0 20px' } as const,
  brandMark: { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 } as const,
  card: { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' } as const,
  h1: { fontSize: '28px', lineHeight: 1.15, fontWeight: 600, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em' } as const,
  h2: { fontSize: '18px', lineHeight: 1.3, fontWeight: 600, color: '#ffffff', margin: '0 0 12px' } as const,
  lede: { fontSize: '16px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 28px' } as const,
  text: { fontSize: '15px', lineHeight: 1.65, color: '#d4d4d4', margin: '0 0 20px' } as const,
  small: { fontSize: '13px', lineHeight: 1.5, color: '#a3a3a3', margin: '0 0 12px' } as const,
  accentRow: { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '10px', padding: '14px 18px', margin: '0 0 16px' } as const,
  accentLabel: { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', margin: '0 0 4px', fontWeight: 600 } as const,
  accentValue: { fontSize: '16px', color: '#FF5124', fontWeight: 600, margin: 0 } as const,
  accentValuePlain: { fontSize: '16px', color: '#ffffff', fontWeight: 600, margin: 0 } as const,
  ctaWrap: { margin: '12px 0 8px' } as const,
  button: { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' } as const,
  buttonGhost: { backgroundColor: 'transparent', color: '#fafafa', padding: '13px 26px', borderRadius: '10px', fontWeight: 500, fontSize: '14px', textDecoration: 'none', display: 'inline-block', border: '1px solid #2a2a2a' } as const,
  hr: { borderColor: '#1f1f1f', margin: '28px 0 20px' } as const,
  smallHeader: { fontSize: '11px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 14px' } as const,
  listItem: { fontSize: '14px', color: '#d4d4d4', margin: '0 0 8px', lineHeight: 1.55 } as const,
  footnote: { fontSize: '12px', color: '#737373', textAlign: 'center' as const, margin: '24px 0 0' } as const,
  good: { color: '#10b981', fontWeight: 600 } as const,
  warn: { color: '#f59e0b', fontWeight: 600 } as const,
  bad: { color: '#ef4444', fontWeight: 600 } as const,
  kicker: { fontSize: '10px', letterSpacing: '0.28em', color: '#FF5124', fontWeight: 700, margin: '0 0 14px' } as const,
  detailGrid: { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '12px', padding: '20px 22px', margin: '0 0 28px' } as const,
  detailLabel: { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 4px' } as const,
  detailValue: { fontSize: '15px', color: '#fafafa', fontWeight: 500, margin: 0 } as const,
  detailValueOrange: { fontSize: '20px', color: '#FF5124', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' } as const,
  detailSub: { fontSize: '13px', color: '#737373', margin: '4px 0 0' } as const,
  detailMono: { fontSize: '13px', color: '#d4d4d4', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' } as const,
  hrThin: { borderColor: '#232323', margin: '14px 0' } as const,
}
